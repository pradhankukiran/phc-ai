export type PhcModel =
  | "google/medgemma-1.5-4b-it"
  | "google/medasr"
  | "google/medsiglip-448"
  | "google/cxr-foundation"
  | "google/derm-foundation"
  | "google/path-foundation";

export type PhcTask = "chat" | "asr" | "image_embed" | "classify" | "similarity";

export type InferRequest = {
  model: PhcModel;
  task: PhcTask;
  inputs: {
    prompt?: string | null;
    text?: string | null;
    image_base64?: string | null;
    audio_base64?: string | null;
  };
  options?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    return_embeddings?: boolean;
  };
};

export type InferResponse = {
  model: PhcModel;
  task: PhcTask;
  status: "ok" | "error";
  cold_start?: boolean;
  latency_ms?: number;
  output?: {
    text?: string | null;
    transcript?: string | null;
    embedding?: number[] | null;
    scores?: Record<string, number> | null;
  };
  meta?: {
    device?: string;
    dtype?: string;
    cached_models?: string[];
  };
  code?: string;
  message?: string;
};

export async function infer(request: InferRequest): Promise<InferResponse> {
  const endpoint = process.env.NEXT_PUBLIC_MODAL_INFER_URL;

  if (!endpoint) {
    return {
      model: request.model,
      task: request.task,
      status: "error",
      code: "MISSING_ENDPOINT",
      message: "NEXT_PUBLIC_MODAL_INFER_URL is not configured.",
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as InferResponse;

  if (!response.ok) {
    return {
      ...payload,
      model: payload.model ?? request.model,
      task: payload.task ?? request.task,
      status: "error",
    };
  }

  return payload;
}
