import gc
import os
from collections import OrderedDict
from dataclasses import dataclass
from time import perf_counter

from schemas import InferOutput, InferRequest


SUPPORTED_TASKS = {
    "google/medgemma-1.5-4b-it": {"chat"},
    "google/medasr": {"asr"},
    "google/medsiglip-448": {"image_embed", "classify", "similarity"},
    "google/cxr-foundation": {"image_embed", "similarity"},
    "google/derm-foundation": {"image_embed", "similarity"},
    "google/path-foundation": {"image_embed", "similarity"},
}


@dataclass
class LoadedModel:
    model_id: str
    loaded_at: float
    runtime: object | None


class ModelCache:
    def __init__(self, max_loaded: int = 1) -> None:
        self.max_loaded = max_loaded
        self.loaded: OrderedDict[str, LoadedModel] = OrderedDict()
        self.demo_mode = os.getenv("PHC_AI_DEMO_MODE", "1") == "1"

    def validate(self, request: InferRequest) -> None:
        tasks = SUPPORTED_TASKS[request.model]
        if request.task not in tasks:
            supported = ", ".join(sorted(tasks))
            raise ValueError(
                f"Model {request.model} supports task(s): {supported}."
            )

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

        runtime = None if self.demo_mode else self._load_runtime(model_id)
        loaded = LoadedModel(model_id=model_id, loaded_at=perf_counter(), runtime=runtime)
        self.loaded[model_id] = loaded
        return loaded, True

    def infer(self, request: InferRequest) -> tuple[InferOutput, bool]:
        self.validate(request)
        _, cold = self.ensure_loaded(request.model)

        if self.demo_mode:
            return demo_output(request), cold

        raise NotImplementedError(
            "Set PHC_AI_DEMO_MODE=1 until real model runners are wired."
        )

    def _load_runtime(self, model_id: str) -> object:
        # Real runners belong here. Keep imports lazy so one container can host
        # Torch and TensorFlow models without paying both costs on every request.
        if model_id in {
            "google/medgemma-1.5-4b-it",
            "google/medasr",
            "google/medsiglip-448",
        }:
            from transformers import AutoProcessor, AutoModel

            processor = AutoProcessor.from_pretrained(model_id)
            model = AutoModel.from_pretrained(model_id, device_map="auto")
            return {"processor": processor, "model": model}

        import tensorflow as tf

        return {"tensorflow": tf, "model_id": model_id}


def demo_output(request: InferRequest) -> InferOutput:
    if request.task == "asr":
        return InferOutput(
            transcript=(
                "Synthetic transcript: continue current medication, track "
                "morning readings, complete labs, and schedule follow-up."
            )
        )

    if request.task in {"image_embed", "similarity", "classify"}:
        return InferOutput(
            text="Synthetic image workflow completed. Similarity results are educational only.",
            embedding=[0.12, 0.44, 0.31, 0.08],
            scores={"demo_match": 0.82, "needs_clinician_review": 0.91},
        )

    return InferOutput(
        text=(
            "Synthetic explanation: your uploaded post-visit material suggests "
            "stable follow-up items, medication adherence, symptom monitoring, "
            "and clinician-confirmed next steps."
        )
    )
