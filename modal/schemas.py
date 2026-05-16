from typing import Literal

from pydantic import BaseModel, Field


ModelId = Literal[
    "google/medgemma-1.5-4b-it",
    "google/medasr",
    "google/medsiglip-448",
    "google/cxr-foundation",
    "google/derm-foundation",
    "google/path-foundation",
]

Task = Literal["chat", "asr", "image_embed", "classify", "similarity"]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class InferInputs(BaseModel):
    prompt: str | None = None
    text: str | None = None
    messages: list[ChatMessage] | None = None
    labels: list[str] | None = None
    image_base64: str | None = None
    audio_base64: str | None = None


class InferOptions(BaseModel):
    max_new_tokens: int = Field(default=512, ge=1, le=2048)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    return_embeddings: bool = False
    embedding_limit: int = Field(default=512, ge=1, le=8192)


class InferRequest(BaseModel):
    model: ModelId
    task: Task
    inputs: InferInputs
    options: InferOptions = Field(default_factory=InferOptions)


class InferOutput(BaseModel):
    text: str | None = None
    transcript: str | None = None
    embedding: list[float] | None = None
    scores: dict[str, float] | None = None


class InferMeta(BaseModel):
    device: str = "cuda"
    dtype: str = "bfloat16"
    cached_models: list[str] = Field(default_factory=list)


class InferResponse(BaseModel):
    model: ModelId
    task: Task
    status: Literal["ok", "error"]
    cold_start: bool = False
    latency_ms: int = 0
    output: InferOutput | None = None
    meta: InferMeta | None = None
    code: str | None = None
    message: str | None = None
