import os
from time import perf_counter

import modal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from model_registry import ModelCache
from schemas import InferMeta, InferRequest, InferResponse


app = modal.App(os.getenv("MODAL_APP_NAME", "phc-ai-health-companion"))
volume = modal.Volume.from_name(
    os.getenv("MODAL_VOLUME_NAME", "phc-ai-hai-def-cache"),
    create_if_missing=True,
)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libsndfile1", "ffmpeg")
    .pip_install_from_requirements("modal/requirements.txt")
    .env(
        {
            "HF_HOME": "/models/huggingface",
            "TRANSFORMERS_CACHE": "/models/huggingface",
            "MODEL_CACHE_DIR": "/models/huggingface",
            "TF_USE_LEGACY_KERAS": "1",
        }
    )
    .add_local_file("modal/model_registry.py", "/root/model_registry.py")
    .add_local_file("modal/schemas.py", "/root/schemas.py")
)


@app.cls(
    image=image,
    gpu=os.getenv("MODAL_GPU", "L40S"),
    timeout=900,
    scaledown_window=900,
    max_containers=1,
    volumes={"/models": volume},
    secrets=[
        modal.Secret.from_name(
            os.getenv("MODAL_HF_SECRET_NAME", "phc-ai-hai-def-hf"),
            required_keys=["HF_TOKEN"],
        )
    ],
)
class InferenceService:
    @modal.enter()
    def boot(self) -> None:
        self.cache = ModelCache(max_loaded=int(os.getenv("MAX_LOADED_MODELS", "1")))

    @modal.asgi_app()
    def fastapi_app(self) -> FastAPI:
        api = FastAPI(title="PHC-AI Modal Inference")
        origins = [
            origin.strip()
            for origin in os.getenv(
                "ALLOWED_ORIGINS",
                "http://localhost:3000",
            ).split(",")
            if origin.strip()
        ]
        api.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=False,
            allow_methods=["POST", "OPTIONS"],
            allow_headers=["*"],
        )

        @api.post("/infer", response_model=InferResponse)
        async def infer(request: InferRequest) -> InferResponse:
            started = perf_counter()
            try:
                output, cold = self.cache.infer(request)
                latency_ms = int((perf_counter() - started) * 1000)
                return InferResponse(
                    model=request.model,
                    task=request.task,
                    status="ok",
                    cold_start=cold,
                    latency_ms=latency_ms,
                    output=output,
                    meta=InferMeta(
                        cached_models=list(self.cache.loaded.keys()),
                    ),
                )
            except ValueError as error:
                return InferResponse(
                    model=request.model,
                    task=request.task,
                    status="error",
                    code="UNSUPPORTED_TASK",
                    message=str(error),
                )
            except Exception as error:
                return InferResponse(
                    model=request.model,
                    task=request.task,
                    status="error",
                    code="INFERENCE_FAILED",
                    message=str(error),
                )

        return api
