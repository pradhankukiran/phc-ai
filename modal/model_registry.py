import base64
import gc
import io
import os
import tempfile
from collections import OrderedDict
from dataclasses import dataclass
from time import perf_counter
from typing import Any

import numpy as np
from PIL import Image

from schemas import InferOutput, InferRequest


SUPPORTED_TASKS = {
    "google/medgemma-1.5-4b-it": {"chat"},
    "google/medasr": {"asr"},
    "google/medsiglip-448": {"image_embed", "classify"},
    "google/cxr-foundation": {"image_embed"},
    "google/derm-foundation": {"image_embed"},
    "google/path-foundation": {"image_embed"},
}

KERAS_MODELS = {
    "google/derm-foundation",
    "google/path-foundation",
}


@dataclass
class LoadedModel:
    model_id: str
    loaded_at: float
    runtime: dict[str, Any]


class ModelCache:
    def __init__(self, max_loaded: int = 1) -> None:
        self.max_loaded = max_loaded
        self.loaded: OrderedDict[str, LoadedModel] = OrderedDict()

    def validate(self, request: InferRequest) -> None:
        tasks = SUPPORTED_TASKS[request.model]
        if request.task not in tasks:
            supported = ", ".join(sorted(tasks))
            raise ValueError(f"Model {request.model} supports task(s): {supported}.")

        if request.task == "asr" and not request.inputs.audio_base64:
            raise ValueError("audio_base64 is required for task=asr.")

        if request.task in {"image_embed", "classify"}:
            if request.model != "google/medsiglip-448" and not request.inputs.image_base64:
                raise ValueError("image_base64 is required for this image model.")
            if request.model == "google/medsiglip-448" and not (
                request.inputs.image_base64 or request.inputs.text or request.inputs.labels
            ):
                raise ValueError("image_base64, text, or labels required for MedSigLIP.")

    def ensure_loaded(self, model_id: str) -> tuple[LoadedModel, bool]:
        if model_id in self.loaded:
            loaded = self.loaded.pop(model_id)
            self.loaded[model_id] = loaded
            return loaded, False

        while len(self.loaded) >= self.max_loaded:
            self.loaded.popitem(last=False)
            gc.collect()
            try:
                import torch

                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass

        runtime = self._load_runtime(model_id)
        loaded = LoadedModel(model_id=model_id, loaded_at=perf_counter(), runtime=runtime)
        self.loaded[model_id] = loaded
        return loaded, True

    def infer(self, request: InferRequest) -> tuple[InferOutput, bool]:
        self.validate(request)
        loaded, cold = self.ensure_loaded(request.model)

        if request.model == "google/medgemma-1.5-4b-it":
            return run_medgemma(loaded.runtime, request), cold
        if request.model == "google/medasr":
            return run_medasr(loaded.runtime, request), cold
        if request.model == "google/medsiglip-448":
            return run_medsiglip(loaded.runtime, request), cold
        if request.model == "google/cxr-foundation":
            return run_cxr(loaded.runtime, request), cold
        if request.model == "google/derm-foundation":
            return run_derm(loaded.runtime, request), cold
        if request.model == "google/path-foundation":
            return run_path(loaded.runtime, request), cold

        raise ValueError(f"Unsupported model: {request.model}")

    def _load_runtime(self, model_id: str) -> dict[str, Any]:
        if model_id == "google/medgemma-1.5-4b-it":
            import torch
            from transformers import AutoModelForImageTextToText, AutoProcessor

            model = AutoModelForImageTextToText.from_pretrained(
                model_id,
                torch_dtype=torch.bfloat16,
                device_map="auto",
            )
            processor = AutoProcessor.from_pretrained(model_id)
            return {"model": model, "processor": processor}

        if model_id == "google/medasr":
            import torch
            from transformers import pipeline

            device = 0 if torch.cuda.is_available() else -1
            pipe = pipeline("automatic-speech-recognition", model=model_id, device=device)
            return {"pipe": pipe}

        if model_id == "google/medsiglip-448":
            import torch
            from transformers import AutoModel, AutoProcessor

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model = AutoModel.from_pretrained(model_id).to(device)
            processor = AutoProcessor.from_pretrained(model_id)
            model.eval()
            return {"model": model, "processor": processor, "device": device}

        if model_id == "google/cxr-foundation":
            from clientside.clients import make_hugging_face_client

            return {"client": make_hugging_face_client("cxr_model")}

        if model_id in KERAS_MODELS:
            from huggingface_hub import from_pretrained_keras

            model = from_pretrained_keras(model_id)
            return {"model": model, "infer": model.signatures["serving_default"]}

        raise ValueError(f"Unsupported model: {model_id}")


def run_medgemma(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    import torch

    processor = runtime["processor"]
    model = runtime["model"]
    messages = build_medgemma_messages(request)
    raw_inputs = processor.apply_chat_template(
        messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    )
    inputs = {
        key: tensor.to(model.device, dtype=torch.bfloat16)
        if torch.is_floating_point(tensor)
        else tensor.to(model.device)
        for key, tensor in raw_inputs.items()
    }

    input_len = inputs["input_ids"].shape[-1]
    with torch.inference_mode():
        generation_kwargs: dict[str, Any] = {
            "max_new_tokens": request.options.max_new_tokens,
            "do_sample": request.options.temperature > 0,
        }
        if request.options.temperature > 0:
            generation_kwargs["temperature"] = request.options.temperature
            generation_kwargs["top_p"] = request.options.top_p
        generation = model.generate(**inputs, **generation_kwargs)

    decoded = processor.decode(
        generation[0][input_len:],
        skip_special_tokens=True,
    )
    return InferOutput(text=decoded.strip())


SYSTEM_INSTRUCTION = (
    "Answer directly in patient-friendly language. Do not include hidden "
    "reasoning. Do not diagnose or prescribe."
)


def build_medgemma_messages(request: InferRequest) -> list[dict[str, Any]]:
    report_context = request.inputs.text or ""
    image = decode_image(request.inputs.image_base64) if request.inputs.image_base64 else None

    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": [{"type": "text", "text": SYSTEM_INSTRUCTION}],
        }
    ]

    if request.inputs.messages:
        for index, message in enumerate(request.inputs.messages):
            if message.role == "system":
                messages.append(
                    {
                        "role": "system",
                        "content": [{"type": "text", "text": message.content}],
                    }
                )
                continue
            content: list[dict[str, Any]] = []
            is_last_user = (
                message.role == "user"
                and index == len(request.inputs.messages) - 1
            )
            if is_last_user and image is not None:
                content.append({"type": "image", "image": image})
            if is_last_user and report_context:
                content.append(
                    {
                        "type": "text",
                        "text": f"Reference health document:\n{report_context}",
                    }
                )
            content.append({"type": "text", "text": message.content})
            messages.append({"role": message.role, "content": content})
        return messages

    user_content: list[dict[str, Any]] = []
    if image is not None:
        user_content.append({"type": "image", "image": image})
    prompt_text = request.inputs.prompt or "Explain the provided health document in plain language."
    if report_context:
        prompt_text = f"{prompt_text}\n\nReference health document:\n{report_context}"
    user_content.append({"type": "text", "text": prompt_text})
    messages.append({"role": "user", "content": user_content})
    return messages


def run_medasr(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    audio_bytes, suffix = decode_data_url(request.inputs.audio_base64 or "")
    with tempfile.NamedTemporaryFile(suffix=suffix or ".wav") as audio_file:
        audio_file.write(audio_bytes)
        audio_file.flush()
        result = runtime["pipe"](
            audio_file.name,
            chunk_length_s=20,
            stride_length_s=2,
        )

    transcript = result["text"] if isinstance(result, dict) else str(result)
    return InferOutput(transcript=transcript.strip())


def run_medsiglip(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    import torch

    processor = runtime["processor"]
    model = runtime["model"]
    device = runtime["device"]
    labels = normalize_labels(request)
    image = decode_image(request.inputs.image_base64) if request.inputs.image_base64 else None

    kwargs: dict[str, Any] = {
        "padding": "max_length",
        "return_tensors": "pt",
    }
    if labels:
        kwargs["text"] = labels
    if image is not None:
        kwargs["images"] = [image]

    inputs = processor(**kwargs).to(device)
    with torch.no_grad():
        outputs = model(**inputs)

    embedding = None
    if hasattr(outputs, "image_embeds") and outputs.image_embeds is not None:
        embedding = trim_embedding(outputs.image_embeds[0].detach().cpu().numpy(), request)
    elif hasattr(outputs, "text_embeds") and outputs.text_embeds is not None:
        embedding = trim_embedding(outputs.text_embeds[0].detach().cpu().numpy(), request)

    scores = None
    if labels and hasattr(outputs, "logits_per_image") and outputs.logits_per_image is not None:
        probs = torch.softmax(outputs.logits_per_image[0], dim=0).detach().cpu().numpy()
        scores = {label: float(probs[index]) for index, label in enumerate(labels)}

    return InferOutput(
        text="MedSigLIP embedding generated.",
        embedding=embedding,
        scores=scores,
    )


def run_cxr(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    image = decode_image(request.inputs.image_base64 or "").convert("L")
    embeddings = runtime["client"].get_image_embeddings_from_images([image])
    return InferOutput(
        text="CXR Foundation embedding generated.",
        embedding=trim_embedding(embeddings, request),
    )


def run_derm(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    import tensorflow as tf

    image = decode_image(request.inputs.image_base64 or "")
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="PNG")
    example = tf.train.Example(
        features=tf.train.Features(
            feature={
                "image/encoded": tf.train.Feature(
                    bytes_list=tf.train.BytesList(value=[buffer.getvalue()])
                )
            }
        )
    ).SerializeToString()

    output = runtime["infer"](inputs=tf.constant([example]))
    return InferOutput(
        text="Derm Foundation embedding generated.",
        embedding=trim_embedding(first_tensor(output), request),
    )


def run_path(runtime: dict[str, Any], request: InferRequest) -> InferOutput:
    import tensorflow as tf

    image = decode_image(request.inputs.image_base64 or "").crop((0, 0, 224, 224)).convert("RGB")
    tensor = tf.cast(tf.expand_dims(np.array(image), axis=0), tf.float32) / 255.0
    output = runtime["infer"](tf.constant(tensor))
    return InferOutput(
        text="Path Foundation embedding generated.",
        embedding=trim_embedding(first_tensor(output), request),
    )


def normalize_labels(request: InferRequest) -> list[str]:
    if request.inputs.labels:
        return [label.strip() for label in request.inputs.labels if label.strip()][:64]
    text = request.inputs.text or request.inputs.prompt or ""
    labels = [line.strip(" -") for line in text.splitlines() if line.strip()]
    return labels[:64]


def decode_image(value: str) -> Image.Image:
    raw, _ = decode_data_url(value)
    return Image.open(io.BytesIO(raw)).convert("RGB")


def decode_data_url(value: str) -> tuple[bytes, str]:
    suffix = ""
    payload = value
    if "," in value and value.startswith("data:"):
        header, payload = value.split(",", 1)
        mime = header.split(";")[0].replace("data:", "")
        suffix = {
            "audio/wav": ".wav",
            "audio/x-wav": ".wav",
            "audio/mpeg": ".mp3",
            "audio/mp3": ".mp3",
            "audio/mp4": ".m4a",
            "image/png": ".png",
            "image/jpeg": ".jpg",
        }.get(mime, "")
    return base64.b64decode(payload), suffix


def first_tensor(output: Any) -> Any:
    if isinstance(output, dict):
        return next(iter(output.values()))
    return output


def trim_embedding(value: Any, request: InferRequest) -> list[float]:
    array = np.asarray(value).reshape(-1)
    limit = request.options.embedding_limit
    return [float(item) for item in array[:limit]]


