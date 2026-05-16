"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  FileText,
  Send,
  ShieldAlert,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { infer, type InferResponse } from "@/lib/modalInfer";
import type { Workflow } from "@/lib/workflows";

type Inputs = {
  prompt: string;
  text: string;
  file: File | null;
};

export function MediaWorkflow({ workflow }: { workflow: Workflow }) {
  const [inputs, setInputs] = useState<Inputs>({
    prompt: workflow.prompt,
    text: "",
    file: null,
  });
  const [result, setResult] = useState<InferResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);

  const needsImage =
    workflow.accepts === "image" || workflow.accepts === "image-text";
  const needsAudio = workflow.accepts === "audio";
  const needsFile = needsImage || needsAudio;
  const showText =
    workflow.accepts === "text" || workflow.accepts === "image-text";

  const canRun =
    status === "idle" &&
    (needsFile ? Boolean(inputs.file) : Boolean(inputs.prompt.trim()));

  async function run() {
    if (!canRun) return;
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const fileBase64 = inputs.file ? await fileToDataUrl(inputs.file) : null;
      const labels =
        workflow.route === "image-match"
          ? inputs.prompt
              .split("\n")
              .map((label) => label.trim())
              .filter(Boolean)
          : undefined;

      const response = await infer({
        model: workflow.model,
        task: workflow.task,
        inputs: {
          prompt: inputs.prompt,
          text: inputs.text,
          labels,
          image_base64: needsImage ? fileBase64 : null,
          audio_base64: needsAudio ? fileBase64 : null,
        },
        options: {
          max_new_tokens: 768,
          temperature: 0.2,
          top_p: 0.9,
          embedding_limit: 256,
          return_embeddings: true,
        },
      });

      if (response.status === "error") {
        setError(response.message ?? response.code ?? "Inference failed.");
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference failed.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-12 md:px-6">
        <div className="md:col-span-5">
          <InputCard
            workflow={workflow}
            inputs={inputs}
            setInputs={setInputs}
            status={status}
            canRun={canRun}
            onRun={run}
            needsImage={needsImage}
            needsAudio={needsAudio}
            needsFile={needsFile}
            showText={showText}
          />
        </div>

        <div className="space-y-6 md:col-span-7">
          <OutputCard
            workflow={workflow}
            result={result}
            status={status}
            error={error}
          />
          <QuestionsCard workflow={workflow} />
        </div>
      </div>
    </div>
  );
}

function InputCard({
  workflow,
  inputs,
  setInputs,
  status,
  canRun,
  onRun,
  needsImage,
  needsAudio,
  needsFile,
  showText,
}: {
  workflow: Workflow;
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  status: "idle" | "running";
  canRun: boolean;
  onRun: () => void;
  needsImage: boolean;
  needsAudio: boolean;
  needsFile: boolean;
  showText: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{workflow.label}</CardTitle>
        <CardDescription>{workflow.help}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showText && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {workflow.route === "image-match"
                ? "Candidate labels (one per line)"
                : "Message"}
            </label>
            <Textarea
              rows={workflow.route === "image-match" ? 4 : 5}
              value={inputs.prompt}
              onChange={(event) =>
                setInputs((current) => ({
                  ...current,
                  prompt: event.currentTarget.value,
                }))
              }
              placeholder={
                workflow.route === "image-match"
                  ? "normal follow-up\nneeds clinician review\nunclear image quality"
                  : undefined
              }
            />
          </div>
        )}

        {workflow.accepts === "text" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Report or visit context
            </label>
            <Textarea
              rows={6}
              value={inputs.text}
              onChange={(event) =>
                setInputs((current) => ({
                  ...current,
                  text: event.currentTarget.value,
                }))
              }
              placeholder="Paste discharge summary, labs, prescription note, or visit instructions…"
            />
          </div>
        )}

        {needsFile && (
          <FilePicker
            kind={needsAudio ? "audio" : "image"}
            file={inputs.file}
            onChange={(file) =>
              setInputs((current) => ({ ...current, file }))
            }
          />
        )}

        {needsImage && inputs.file && (
          <FilePreview
            key={fileKey(inputs.file)}
            file={inputs.file}
            kind="image"
          />
        )}

        {needsAudio && inputs.file && (
          <FilePreview
            key={fileKey(inputs.file)}
            file={inputs.file}
            kind="audio"
          />
        )}

        <Button
          className="w-full"
          onClick={onRun}
          disabled={!canRun}
        >
          {status === "running" ? (
            <>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-pulse rounded-full bg-current" />
              </span>
              Analyzing
            </>
          ) : (
            <>
              <Send className="size-4" />
              Analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function FilePicker({
  kind,
  file,
  onChange,
}: {
  kind: "image" | "audio";
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(files: FileList | null) {
    onChange(files?.[0] ?? null);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {kind === "audio" ? "Audio file" : "Image file"}
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-dashed bg-muted/30 px-3 py-3 text-left text-sm transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragging ? "border-primary bg-primary/5" : "border-input",
        )}
      >
        <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
          {file ? (
            <FileText className="size-4" />
          ) : (
            <Upload className="size-4" />
          )}
        </span>
        {file ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground">
              {file.name}
            </span>
            <span className="block text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">
              Click or drop a {kind} file
            </span>
            <span className="block text-xs text-muted-foreground">
              {kind === "audio" ? "Any audio format" : "PNG, JPG, WebP"}
            </span>
          </span>
        )}
        {file && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "audio" ? "audio/*" : "image/*"}
        className="hidden"
        onChange={(e) => pick(e.currentTarget.files)}
      />
    </div>
  );
}

function FilePreview({
  file,
  kind,
}: {
  file: File;
  kind: "image" | "audio";
}) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (kind === "image") {
    return (
      <div className="overflow-hidden rounded-md border bg-muted/30 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={file.name}
          className="mx-auto block max-h-48 w-auto rounded-sm object-contain"
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <audio src={url} controls className="w-full" />
    </div>
  );
}

function OutputCard({
  workflow,
  result,
  status,
  error,
}: {
  workflow: Workflow;
  result: InferResponse | null;
  status: "idle" | "running";
  error: string | null;
}) {
  const Icon = workflow.icon;
  const outputText =
    result?.output?.text ??
    result?.output?.transcript ??
    (result?.output?.embedding
      ? `Embedding preview (${result.output.embedding.length} of model dim): ${result.output.embedding
          .slice(0, 24)
          .map((n) => n.toFixed(3))
          .join(", ")}`
      : "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <div>
              <CardTitle>{workflow.label}</CardTitle>
              <CardDescription className="font-mono text-xs">
                {workflow.model}
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono">
            {workflow.task}
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent
        className="space-y-3 pt-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {status === "running" && (
          <Alert>
            <Stethoscope />
            <AlertTitle>Analyzing your input</AlertTitle>
            <AlertDescription>
              First call on a cold model can take a couple of minutes.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <ShieldAlert />
            <AlertTitle>Inference failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result && status === "idle" && !error && (
          <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
            Add required input, then analyze. Results appear here.
          </div>
        )}

        {outputText && (
          <div className="rounded-md border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ClipboardCheck className="size-3.5" />
              </span>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {outputText}
              </p>
            </div>
          </div>
        )}

        {result?.output?.scores && (
          <div className="rounded-md border bg-card p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scores
            </p>
            <pre className="overflow-x-auto font-mono text-xs text-foreground">
              {JSON.stringify(result.output.scores, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuestionsCard({ workflow }: { workflow: Workflow }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-amber-100 text-amber-700">
            <Stethoscope className="size-4" />
          </span>
          <CardTitle className="text-base">Ask your clinician</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-foreground">
          {workflow.questions.map((question) => (
            <li key={question} className="flex gap-2">
              <span className="mt-1.5 size-1.5 flex-shrink-0 rounded-full bg-primary" />
              <span>{question}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
