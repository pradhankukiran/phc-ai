"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Suggestion,
  Suggestions,
} from "@/components/ai-elements/suggestion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, Copy, Eraser, Sparkles } from "lucide-react";
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
    <div className="flex h-full flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && !pending ? (
            <EmptyState
              workflow={workflow}
              onPick={(text) => {
                setDraft(text);
              }}
            />
          ) : (
            <>
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}
              {pending && <PendingBubble text={pending} />}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertTitle>Inference failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <PromptInput
            onSubmit={(message) => {
              const text = message.text ?? "";
              setDraft("");
              return submit(text);
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask about your visit notes, labs, or instructions…"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                disabled={!!pending}
              />
              <PromptInputFooter>
                <PromptInputTools>
                  <Tooltip>
                    <TooltipTrigger render={<span />}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={clear}
                        disabled={
                          messages.length === 0 && !error && draft.length === 0
                        }
                        aria-label="Clear conversation"
                      >
                        <Eraser className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>
                </PromptInputTools>
                <PromptInputSubmit
                  status={status}
                  disabled={!draft.trim() || !!pending}
                />
              </PromptInputFooter>
            </PromptInputBody>
          </PromptInput>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Enter to send · Shift+Enter for newline · Not for diagnosis
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
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
    <Message from={message.role}>
      <MessageContent>
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <MessageResponse>{message.content}</MessageResponse>
        )}
      </MessageContent>
      <MessageActions className="px-1 text-xs text-muted-foreground">
        <span>{formatTime(message.createdAt)}</span>
        {!isUser && (
          <MessageAction
            tooltip={copied ? "Copied" : "Copy"}
            onClick={copy}
            label="Copy message"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </MessageAction>
        )}
      </MessageActions>
    </Message>
  );
}

function PendingBubble({ text }: { text: string }) {
  return (
    <>
      <Message from="user">
        <MessageContent>
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
            </span>
            <span className="text-sm">Thinking…</span>
          </div>
        </MessageContent>
      </Message>
    </>
  );
}

function EmptyState({
  workflow,
  onPick,
}: {
  workflow: Workflow;
  onPick: (text: string) => void;
}) {
  return (
    <ConversationEmptyState
      className="my-auto"
      icon={
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
      }
      title={workflow.label}
      description={workflow.help}
    >
      <div className="flex size-full flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">
            {workflow.label}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {workflow.help}
          </p>
        </div>
        <Suggestions className="justify-center">
          {workflow.questions.map((question) => (
            <Suggestion
              key={question}
              suggestion={question}
              onClick={onPick}
            />
          ))}
        </Suggestions>
      </div>
    </ConversationEmptyState>
  );
}

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
