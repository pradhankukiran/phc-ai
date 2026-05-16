"use client";

import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { infer, type InferResponse } from "@/lib/modalInfer";
import type { Workflow } from "@/lib/workflows";

type Inputs = {
  prompt: string;
  text: string;
  file: File | null;
};

type Status = "idle" | "running";

export function MediaWorkflow({ workflow }: { workflow: Workflow }) {
  const [inputs, setInputs] = useState<Inputs>({
    prompt: workflow.prompt,
    text: "",
    file: null,
  });
  const [result, setResult] = useState<InferResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
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
    <div className="h-full overflow-y-auto bg-paper">
      <TitleRail workflow={workflow} />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-x-10 gap-y-12 px-6 py-10">
        <section className="col-span-12 lg:col-span-5">
          <SectionHeader number="01" label="Input" />
          <p className="mb-6 font-sans text-sm leading-relaxed text-ink-soft">
            {workflow.help}
          </p>

          <InputBlock
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
        </section>

        <section className="col-span-12 lg:col-span-7 lg:border-l lg:border-ink lg:pl-10">
          <div className="space-y-12">
            <div>
              <SectionHeader number="02" label="Output" />
              <OutputBlock status={status} error={error} result={result} />
            </div>

            <div>
              <SectionHeader number="03" label="Questions for your clinician" />
              <QuestionsList questions={workflow.questions} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TitleRail({ workflow }: { workflow: Workflow }) {
  return (
    <div className="border-y-2 border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-5">
        <span className="font-mono text-2xl tabular-nums text-accent">
          {workflow.order}
        </span>
        <h1 className="flex-1 font-sans text-base font-semibold uppercase tracking-[0.16em] text-ink">
          {workflow.label}
        </h1>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft md:inline">
          {workflow.model}
        </span>
        <span className="border border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
          {workflow.accepts}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ number, label }: { number: string; label: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2 pb-2 font-mono text-xs uppercase tracking-[0.2em]">
        <span className="tabular-nums text-accent">{number}</span>
        <span className="text-ink-soft">/</span>
        <span className="text-ink">{label}</span>
      </div>
      <div className="border-b border-ink" />
    </div>
  );
}

function InputBlock({
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
  status: Status;
  canRun: boolean;
  onRun: () => void;
  needsImage: boolean;
  needsAudio: boolean;
  needsFile: boolean;
  showText: boolean;
}) {
  return (
    <div className="space-y-8">
      {showText && (
        <FieldText
          label={
            workflow.route === "image-match"
              ? "Labels · one per line"
              : "Message"
          }
          value={inputs.prompt}
          rows={workflow.route === "image-match" ? 4 : 5}
          placeholder={
            workflow.route === "image-match"
              ? "normal follow-up\nneeds clinician review\nunclear image quality"
              : undefined
          }
          onChange={(value) =>
            setInputs((current) => ({ ...current, prompt: value }))
          }
        />
      )}

      {workflow.accepts === "text" && (
        <FieldText
          label="Report context"
          value={inputs.text}
          rows={6}
          placeholder="Paste discharge summary, labs, prescription note, or visit instructions…"
          onChange={(value) =>
            setInputs((current) => ({ ...current, text: value }))
          }
        />
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

      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className={cn(
          "w-full bg-ink px-6 py-3 font-sans text-sm font-semibold uppercase tracking-[0.2em] text-paper transition-colors",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
          !canRun && "cursor-not-allowed opacity-50 hover:bg-ink",
        )}
        aria-busy={status === "running"}
      >
        {status === "running" ? (
          <span className="inline-flex items-center gap-2">
            <span>Analyzing</span>
            <span aria-hidden className="animate-pulse text-accent">
              ▍
            </span>
          </span>
        ) : (
          <span>Analyze</span>
        )}
      </button>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </label>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className={cn(
          "block w-full resize-y bg-transparent p-3 pl-0 font-sans text-base leading-relaxed text-ink",
          "border-0 border-b-2 border-ink",
          "placeholder:text-ink-faint",
          "focus:border-accent focus:outline-none focus:ring-0",
        )}
      />
    </div>
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
    <div>
      <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
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
          "block w-full bg-paper-soft p-6 text-center font-mono text-xs uppercase tracking-[0.2em] transition-colors",
          dragging
            ? "border-2 border-accent bg-accent-soft text-ink"
            : "border border-ink text-ink-soft hover:text-ink",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        )}
      >
        {file ? (
          <span className="flex items-center justify-between gap-4">
            <span className="min-w-0 flex-1 truncate text-left font-mono text-sm normal-case tracking-normal text-ink">
              {file.name}
            </span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] tabular-nums text-ink-soft">
              {formatBytes(file.size)}
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove file"
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
              className="border border-ink p-1 text-ink hover:bg-ink hover:text-paper"
            >
              <X className="size-3" />
            </span>
          </span>
        ) : (
          <span className="flex flex-col items-center justify-center gap-3">
            <Upload className="size-5 text-ink" />
            <span>Drop a file or click</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              {kind === "audio" ? "Any audio format" : "PNG · JPG · WebP"}
            </span>
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

  return (
    <figure className="space-y-2">
      {kind === "image" ? (
        <div className="border border-ink bg-paper-soft p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={file.name}
            className="mx-auto block max-h-56 w-auto object-contain"
          />
        </div>
      ) : (
        <div className="border border-ink bg-paper-soft p-3">
          <audio src={url} controls className="w-full" />
        </div>
      )}
      <figcaption className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        <span className="truncate">
          Fig. 01 — {file.name}
        </span>
        <span className="tabular-nums">{formatBytes(file.size)}</span>
      </figcaption>
    </figure>
  );
}

function OutputBlock({
  status,
  error,
  result,
}: {
  status: Status;
  error: string | null;
  result: InferResponse | null;
}) {
  const outputText = result?.output?.text ?? result?.output?.transcript ?? null;
  const embedding = result?.output?.embedding ?? null;
  const scores = result?.output?.scores ?? null;
  const isIdleEmpty = status === "idle" && !result && !error;

  return (
    <div aria-live="polite" aria-atomic="false" className="space-y-6">
      {isIdleEmpty && (
        <div className="border border-dashed border-ink p-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          Awaiting input
        </div>
      )}

      {status === "running" && (
        <div className="border border-ink p-8">
          <div className="flex items-baseline gap-2 font-mono text-xs uppercase tracking-[0.2em] text-ink">
            <span>Running</span>
            <span aria-hidden className="animate-pulse text-accent">
              ▍
            </span>
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            First call on a cold model can take a couple of minutes
          </p>
        </div>
      )}

      {error && (
        <div className="border-2 border-[color:var(--destructive)] p-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--destructive)]">
            Error — {error}
          </p>
        </div>
      )}

      {outputText && (
        <div className="py-2">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            {result?.output?.transcript && !result?.output?.text
              ? "Transcript"
              : "Response"}
          </p>
          <p className="whitespace-pre-wrap font-sans text-base leading-relaxed text-ink">
            {outputText}
          </p>
        </div>
      )}

      {embedding && embedding.length > 0 && (
        <div className="border border-ink p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <span className="text-ink">
              Embedding —{" "}
              <span className="tabular-nums text-accent">
                {embedding.length}
              </span>{" "}
              dims
            </span>
            <span className="text-ink-soft">First 24 shown</span>
          </div>
          <p className="font-mono text-xs leading-relaxed text-ink-soft">
            {embedding
              .slice(0, 24)
              .map((n) => n.toFixed(3))
              .join(", ")}
          </p>
        </div>
      )}

      {scores && Object.keys(scores).length > 0 && (
        <div className="border border-ink">
          <div className="border-b border-ink px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            Scores
          </div>
          <ul className="divide-y divide-ink/30">
            {Object.entries(scores).map(([key, value]) => (
              <li
                key={key}
                className="flex items-baseline justify-between gap-4 px-4 py-2"
              >
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink">
                  {key}
                </span>
                <span className="font-mono text-xs tabular-nums text-ink-soft">
                  {value.toFixed(3)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuestionsList({ questions }: { questions: string[] }) {
  return (
    <ol className="space-y-0">
      {questions.map((question, index) => (
        <li
          key={question}
          className="flex gap-4 border-b border-ink-faint/40 py-3 last:border-b-0"
        >
          <span className="font-mono text-xs tabular-nums text-accent">
            ({String.fromCharCode(97 + index)})
          </span>
          <span className="font-sans text-sm leading-relaxed text-ink">
            {question}
          </span>
        </li>
      ))}
    </ol>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("File read failed."));
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
