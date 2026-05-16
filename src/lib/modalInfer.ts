export type PhcModel =
  | "google/medgemma-1.5-4b-it"
  | "google/medasr"
  | "google/medsiglip-448"
  | "google/cxr-foundation"
  | "google/derm-foundation"
  | "google/path-foundation";

export type PhcTask = "chat" | "asr" | "image_embed" | "classify";

export type InferRequest = {
  model: PhcModel;
  task: PhcTask;
  inputs: {
    prompt?: string | null;
    text?: string | null;
    messages?: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> | null;
    labels?: string[] | null;
    image_base64?: string | null;
    audio_base64?: string | null;
  };
  options?: {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    return_embeddings?: boolean;
    embedding_limit?: number;
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

function isInferResponse(value: unknown): value is InferResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.model === "string" &&
    typeof candidate.task === "string" &&
    (candidate.status === "ok" || candidate.status === "error")
  );
}

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

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (error) {
    return {
      model: request.model,
      task: request.task,
      status: "error",
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Network request failed.",
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      model: request.model,
      task: request.task,
      status: "error",
      code: "BAD_RESPONSE",
      message: `Server returned non-JSON (${response.status}).`,
    };
  }

  if (!isInferResponse(payload)) {
    return {
      model: request.model,
      task: request.task,
      status: "error",
      code: "BAD_RESPONSE",
      message: `Unexpected response shape (${response.status}).`,
    };
  }

  if (!response.ok && payload.status !== "error") {
    return { ...payload, status: "error" };
  }

  return payload;
}
