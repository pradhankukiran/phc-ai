import logging
import os
from time import perf_counter

import modal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model_registry import ModelCache
from schemas import InferMeta, InferRequest, InferResponse


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("phc-ai")


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
            for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
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
        async def infer(request: InferRequest):
            started = perf_counter()
            try:
                output, cold = self.cache.infer(request)
            except ValueError as error:
                logger.warning("validation rejected request: %s", error)
                return _error_response(request, status_code=400, code="UNSUPPORTED_TASK", message=str(error))
            except Exception:
                logger.exception("inference failed for model=%s task=%s", request.model, request.task)
                return _error_response(
                    request,
                    status_code=500,
                    code="INFERENCE_FAILED",
                    message="Inference failed. See server logs.",
                )

            latency_ms = int((perf_counter() - started) * 1000)
            return InferResponse(
                model=request.model,
                task=request.task,
                status="ok",
                cold_start=cold,
                latency_ms=latency_ms,
                output=output,
                meta=InferMeta(cached_models=list(self.cache.loaded.keys())),
            )

        return api


def _error_response(request: InferRequest, *, status_code: int, code: str, message: str) -> JSONResponse:
    payload = InferResponse(
        model=request.model,
        task=request.task,
        status="error",
        code=code,
        message=message,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())
