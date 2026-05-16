"use client";

import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  Check,
  Copy,
  Eraser,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { infer } from "@/lib/modalInfer";
import type { Workflow } from "@/lib/workflows";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export function ChatWorkflow({ workflow }: { workflow: Workflow }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages.length, status, scrollToBottom]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [workflow.route]);

  const canSend = input.trim().length > 0 && status === "idle";

  async function send() {
    if (!canSend) return;
    const trimmed = input.trim();
    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setStatus("running");
    setError(null);
    setInput("");
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
          prev.length > 0 && prev[prev.length - 1] === userMessage
            ? prev.slice(0, -1)
            : prev,
        );
        setInput(trimmed);
      } else if (response.output?.text) {
        const assistantText = response.output.text;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: assistantText,
            createdAt: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inference failed.");
      setMessages((prev) =>
        prev.length > 0 && prev[prev.length - 1] === userMessage
          ? prev.slice(0, -1)
          : prev,
      );
      setInput(trimmed);
    } finally {
      setStatus("idle");
    }
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
    setInput("");
    textareaRef.current?.focus();
  }

  function fillStarter(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  return (
    <Box
      style={{
        height: "calc(100vh - var(--phc-header-height))",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto" }}
        aria-live="polite"
        aria-atomic="false"
      >
        <Container size="md" py="xl">
          {messages.length === 0 ? (
            <EmptyState workflow={workflow} onPickStarter={fillStarter} />
          ) : (
            <Stack gap="lg">
              {messages.map((m, index) => (
                <MessageBubble
                  key={`${m.role}-${m.createdAt}-${index}`}
                  message={m}
                />
              ))}
              {status === "running" && <ThinkingBubble />}
            </Stack>
          )}
        </Container>
      </Box>

      <Box
        style={{
          background: "var(--phc-surface)",
          borderTop: "1px solid var(--phc-border)",
        }}
      >
        <Container size="md" py="sm">
          {error && (
            <Alert
              color="red"
              icon={<ShieldAlert size={16} />}
              mb="xs"
              withCloseButton
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={handleKey}
              placeholder="Ask about your visit notes, labs, or instructions..."
              autosize
              minRows={1}
              maxRows={6}
              disabled={status === "running"}
              aria-label="Message"
              style={{ flex: 1 }}
            />
            <Tooltip label="Clear conversation" disabled={messages.length === 0}>
              <ActionIcon
                size="lg"
                variant="subtle"
                color="gray"
                onClick={clearConversation}
                disabled={messages.length === 0 && !error && input.length === 0}
                aria-label="Clear conversation"
              >
                <Eraser size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              color="teal"
              leftSection={<Send size={14} />}
              loading={status === "running"}
              disabled={!canSend}
              onClick={send}
            >
              Send
            </Button>
          </Group>
          <Text size="xs" c="var(--phc-text-muted)" mt={6}>
            Enter to send · Shift+Enter for newline · Not for diagnosis
          </Text>
        </Container>
      </Box>
    </Box>
  );
}

function EmptyState({
  workflow,
  onPickStarter,
}: {
  workflow: Workflow;
  onPickStarter: (text: string) => void;
}) {
  return (
    <Stack gap="lg" align="center" pt={48}>
      <Box
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: "var(--phc-bubble-user)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <Sparkles size={28} color="var(--phc-accent)" />
      </Box>
      <Stack gap={4} align="center" style={{ textAlign: "center" }}>
        <Text fw={700} size="lg" c="var(--phc-text-strong)">
          {workflow.label}
        </Text>
        <Text size="sm" c="var(--phc-text-muted)" maw={460}>
          {workflow.help}
        </Text>
      </Stack>
      <Stack gap="xs" w="100%" maw={520}>
        {workflow.questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onPickStarter(question)}
            style={{
              padding: "10px 14px",
              textAlign: "left",
              background: "var(--phc-surface)",
              border: "1px solid var(--phc-border)",
              color: "var(--phc-text)",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            {question}
          </button>
        ))}
      </Stack>
    </Stack>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignored — clipboard unavailable
    }
  }

  return (
    <Group
      justify={isUser ? "flex-end" : "flex-start"}
      align="flex-start"
      gap="xs"
      wrap="nowrap"
    >
      <Stack
        gap={4}
        style={{
          maxWidth: "78%",
          alignItems: isUser ? "flex-end" : "flex-start",
        }}
      >
        <Box
          style={{
            background: isUser
              ? "var(--phc-bubble-user)"
              : "var(--phc-bubble-assistant)",
            border: `1px solid ${isUser ? "transparent" : "var(--phc-border)"}`,
            padding: "10px 14px",
            color: "var(--phc-text-strong)",
          }}
        >
          <Text
            size="sm"
            lh={1.65}
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {message.content}
          </Text>
        </Box>
        <Group gap={6}>
          <Text size="xs" c="var(--phc-text-muted)">
            {formatTime(message.createdAt)}
          </Text>
          {!isUser && (
            <Tooltip label={copied ? "Copied" : "Copy"}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={copy}
                aria-label="Copy message"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Stack>
    </Group>
  );
}

function ThinkingBubble() {
  return (
    <Group justify="flex-start" align="flex-start" gap="xs" wrap="nowrap">
      <Stack
        gap={4}
        style={{ maxWidth: "78%", alignItems: "flex-start" }}
      >
        <Box
          style={{
            background: "var(--phc-bubble-assistant)",
            border: "1px solid var(--phc-border)",
            padding: "10px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Loader size="xs" color="teal" />
          <Text size="sm" c="var(--phc-text-muted)">
            Thinking…
          </Text>
        </Box>
      </Stack>
    </Group>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
