"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { Check, Copy, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { Workflow } from "@/lib/workflows";
import { infer } from "@/lib/modalInfer";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export function ChatWorkflow({ workflow }: { workflow: Workflow }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const status = pending ? "submitted" : "ready";
  const hasHistory = messages.length > 0;

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMessage: ChatMessage = {
        id: cryptoId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      setError(null);
      setPending(trimmed);
      setMessages((prev) => [...prev, userMessage]);

      const requestMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await infer({
          model: workflow.model,
          task: workflow.task,
          inputs: {
            prompt: trimmed,
            messages: requestMessages,
          },
          options: {
            max_new_tokens: 768,
            temperature: 0.2,
            top_p: 0.9,
          },
        });

        if (response.status === "error") {
          setError(response.message ?? response.code ?? "Inference failed.");
          setMessages((prev) =>
            prev.length > 0 && prev[prev.length - 1]?.id === userMessage.id
              ? prev.slice(0, -1)
              : prev,
          );
          setDraft(trimmed);
        } else if (response.output?.text) {
          const assistantText = response.output.text;
          setMessages((prev) => [
            ...prev,
            {
              id: cryptoId(),
              role: "assistant",
              content: assistantText,
              createdAt: Date.now(),
            },
          ]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Inference failed.");
        setMessages((prev) =>
          prev.length > 0 && prev[prev.length - 1]?.id === userMessage.id
            ? prev.slice(0, -1)
            : prev,
        );
        setDraft(trimmed);
      } finally {
        setPending(null);
      }
    },
    [messages, pending, workflow.model, workflow.task],
  );

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    setDraft("");
  }, []);

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <TitleRail workflow={workflow} running={!!pending} />

      <div className="relative flex flex-1 min-h-0 flex-col">
        <Conversation
          aria-live="polite"
          aria-atomic="false"
          className="flex-1"
        >
          <ConversationContent className="mx-auto w-full max-w-3xl px-6 py-0 gap-0 md:px-10">
            {!hasHistory && !pending ? (
              <EmptyState
                workflow={workflow}
                onPick={(text) => {
                  setDraft(text);
                }}
              />
            ) : (
              <ol className="flex flex-col">
                {messages.map((m, index) => (
                  <ChatMessageItem
                    key={m.id}
                    message={m}
                    isFirst={index === 0}
                  />
                ))}
                {pending && <PendingAssistant />}
              </ol>
            )}
          </ConversationContent>
          <ConversationScrollButton className="bottom-4 size-9 border-2 border-ink bg-paper text-ink shadow-none hover:bg-ink hover:text-paper" />
        </Conversation>
      </div>

      <div className="flex-shrink-0 border-t-2 border-ink bg-paper">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <div className="mx-auto w-full max-w-3xl px-6 py-4 md:px-10">
          <PromptInput
            className="border-2 border-ink bg-paper"
            onSubmit={(message) => {
              const text = message.text ?? "";
              setDraft("");
              return submit(text);
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="ask about your visit notes, labs, or instructions…"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                disabled={!!pending}
                className="min-h-20 max-h-56 border-0 bg-transparent px-4 py-3 font-sans text-base leading-relaxed text-ink placeholder:font-mono placeholder:text-[12px] placeholder:uppercase placeholder:tracking-[0.16em] placeholder:text-ink-faint focus-visible:ring-0"
              />
              <PromptInputFooter className="border-t border-ink bg-paper-soft/40 px-3 py-2">
                <PromptInputTools>
                  <button
                    type="button"
                    onClick={clear}
                    disabled={!hasHistory && !error && draft.length === 0 && !pending}
                    aria-label="Clear conversation"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors",
                      "text-ink-soft hover:bg-ink hover:text-paper",
                      "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft",
                    )}
                  >
                    <X className="size-3" aria-hidden />
                    <span>Clear</span>
                  </button>
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  disabled={!draft.trim() || !!pending}
                  className={cn(
                    "h-8 w-auto px-3 font-mono text-[11px] uppercase tracking-[0.2em] shadow-none",
                    "bg-ink text-paper hover:bg-accent hover:text-paper",
                    "disabled:cursor-not-allowed disabled:bg-ink/20 disabled:text-ink-faint",
                  )}
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <SendingDots />
                      <span>Sending</span>
                    </span>
                  ) : (
                    <span>[ Send ]</span>
                  )}
                </PromptInputSubmit>
              </PromptInputFooter>
            </PromptInputBody>
          </PromptInput>

          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Enter to send · Shift+Enter for newline · Not for diagnosis
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Title rail ---------- */

function TitleRail({
  workflow,
  running,
}: {
  workflow: Workflow;
  running: boolean;
}) {
  return (
    <div className="flex-shrink-0 border-y-2 border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-5 px-6 py-3 md:px-10">
        <span className="font-mono text-2xl tabular-nums leading-none text-accent">
          {workflow.order}
        </span>
        <span aria-hidden className="h-6 w-px bg-ink/30" />
        <h1 className="font-sans text-base font-semibold uppercase tracking-[0.16em] text-ink">
          {workflow.label}
        </h1>
        <span aria-hidden className="ml-auto hidden h-px flex-1 bg-ink/15 md:block" />
        {running && (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="block size-1.5 animate-pulse bg-accent"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
              Running
            </span>
          </span>
        )}
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft md:inline">
          {workflow.model}
        </span>
      </div>
    </div>
  );
}

/* ---------- Message row ---------- */

function ChatMessageItem({
  message,
  isFirst,
}: {
  message: ChatMessage;
  isFirst: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignored
    }
  }

  return (
    <li
      className={cn(
        "border-b border-ink/15 py-6",
        isFirst && "pt-8",
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          {isUser ? "You" : "PHC"}
        </span>
        <div className="flex items-center gap-3">
          {!isUser && (
            <button
              type="button"
              onClick={copy}
              aria-label={copied ? "Copied" : "Copy message"}
              className={cn(
                "inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors",
                copied ? "text-accent" : "text-ink-faint hover:text-ink",
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3" aria-hidden />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" aria-hidden />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
          <time
            dateTime={new Date(message.createdAt).toISOString()}
            className="font-mono text-[10px] uppercase tracking-[0.2em] tabular-nums text-ink-faint"
          >
            {formatTime(message.createdAt)}
          </time>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 font-sans text-base leading-[1.75] text-ink break-words",
          !isUser && "border-l-2 border-accent pl-4",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}
      </div>
    </li>
  );
}

/* ---------- Pending assistant placeholder ---------- */

function PendingAssistant() {
  return (
    <li className="border-b border-ink/15 py-6" aria-live="polite">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          PHC
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          ——:——
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-l-2 border-accent pl-4">
        <span className="font-mono text-sm uppercase tracking-[0.18em] text-ink-soft">
          Working
        </span>
        <span aria-hidden className="font-mono text-sm text-accent animate-pulse">
          ▍
        </span>
      </div>
    </li>
  );
}

/* ---------- Sending dots (inline, on submit button) ---------- */

function SendingDots() {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      <span className="size-1 animate-pulse bg-current [animation-delay:-0.3s]" />
      <span className="size-1 animate-pulse bg-current [animation-delay:-0.15s]" />
      <span className="size-1 animate-pulse bg-current" />
    </span>
  );
}

/* ---------- Empty state — Swiss poster ---------- */

function EmptyState({
  workflow,
  onPick,
}: {
  workflow: Workflow;
  onPick: (text: string) => void;
}) {
  const firstDigit = workflow.order.charAt(0);
  const secondDigit = workflow.order.charAt(1);

  return (
    <div className="flex min-h-full flex-col justify-between gap-12 py-12 md:py-16">
      <div className="grid grid-cols-12 gap-x-6">
        <div className="col-span-12 md:col-span-5">
          <div className="flex items-start leading-none font-display tracking-tight">
            <span className="text-[10rem] md:text-[14rem] font-light text-ink">
              {firstDigit}
            </span>
            <span className="text-[10rem] md:text-[14rem] font-light text-accent">
              {secondDigit}
            </span>
          </div>
        </div>

        <div className="col-span-12 mt-4 flex flex-col gap-5 md:col-span-7 md:mt-12">
          <div className="border-t-2 border-ink pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
              Workflow · {workflow.order} / 06
            </p>
          </div>
          <h2 className="font-sans text-2xl font-semibold uppercase leading-tight tracking-[0.06em] text-ink md:text-3xl">
            {workflow.label}
          </h2>
          <p className="max-w-md font-sans text-base leading-relaxed text-ink-soft">
            {workflow.help}
          </p>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            {workflow.model}
          </div>
        </div>
      </div>

      <div className="border-t border-ink/30 pt-6">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">
          Try a question
        </p>
        <ul className="flex flex-col">
          {workflow.questions.map((question, index) => (
            <li
              key={question}
              className={cn(
                "border-b border-ink/15",
                index === 0 && "border-t border-ink/15",
              )}
            >
              <button
                type="button"
                onClick={() => onPick(question)}
                className={cn(
                  "group flex w-full items-center gap-4 py-3 text-left transition-colors",
                  "hover:bg-ink hover:text-paper",
                )}
              >
                <span className="w-8 flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] tabular-nums text-accent group-hover:text-paper">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-sans text-base leading-snug text-ink group-hover:text-paper">
                  {question}
                </span>
                <span
                  aria-hidden
                  className="font-mono text-sm text-ink-faint group-hover:text-paper"
                >
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Error banner ---------- */

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-b border-ink bg-paper"
    >
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-6 py-2.5 md:px-10">
        <span
          aria-hidden
          className="block size-1.5 flex-shrink-0 animate-pulse bg-[color:var(--destructive)]"
        />
        <p className="flex-1 font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--destructive)]">
          Error — <span className="normal-case tracking-normal">{message}</span>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft transition-colors hover:text-ink"
        >
          <X className="size-3" aria-hidden />
          <span className="sr-only md:not-sr-only">Dismiss</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function cryptoId(): string {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
