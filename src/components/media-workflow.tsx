"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  FileInput,
  Grid,
  Group,
  Image as MantineImage,
  JsonInput,
  List,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  ClipboardCheck,
  Send,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState } from "react";
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
    <Container size="xl" py="lg">
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <InputCard
            workflow={workflow}
            inputs={inputs}
            setInputs={setInputs}
            status={status}
            canRun={canRun}
            onRun={run}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Stack gap="md">
            <OutputCard
              workflow={workflow}
              result={result}
              status={status}
              error={error}
            />
            <QuestionsCard workflow={workflow} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

function InputCard({
  workflow,
  inputs,
  setInputs,
  status,
  canRun,
  onRun,
}: {
  workflow: Workflow;
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  status: "idle" | "running";
  canRun: boolean;
  onRun: () => void;
}) {
  const needsImage =
    workflow.accepts === "image" || workflow.accepts === "image-text";
  const needsAudio = workflow.accepts === "audio";
  const needsFile = needsImage || needsAudio;
  const showText = workflow.accepts === "text" || workflow.accepts === "image-text";

  return (
    <Card withBorder shadow="xs" padding="lg">
      <Stack gap="md">
        <Stack gap={4}>
          <Text fw={700} size="lg" c="var(--phc-text-strong)">
            {workflow.label}
          </Text>
          <Text size="sm" c="var(--phc-text-muted)">
            {workflow.help}
          </Text>
        </Stack>

        {showText && (
          <Textarea
            label={
              workflow.route === "image-match"
                ? "Candidate labels (one per line)"
                : "Message"
            }
            minRows={workflow.route === "image-match" ? 4 : 5}
            value={inputs.prompt}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setInputs((current) => ({ ...current, prompt: value }));
            }}
          />
        )}

        {workflow.accepts === "text" && (
          <Textarea
            label="Report or visit context"
            minRows={6}
            value={inputs.text}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setInputs((current) => ({ ...current, text: value }));
            }}
            placeholder="Paste discharge summary, labs, prescription note, or visit instructions..."
          />
        )}

        {needsFile && (
          <FileInput
            accept={needsAudio ? "audio/*" : "image/*"}
            label={needsAudio ? "Audio file" : "Image file"}
            placeholder="Choose file"
            value={inputs.file}
            onChange={(file) => setInputs((current) => ({ ...current, file }))}
            clearable
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
          color="teal"
          leftSection={<Send size={14} />}
          loading={status === "running"}
          disabled={!canRun}
          onClick={onRun}
          mt="xs"
        >
          Analyze
        </Button>
      </Stack>
    </Card>
  );
}

function FilePreview({ file, kind }: { file: File; kind: "image" | "audio" }) {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (kind === "image") {
    return (
      <Paper
        withBorder
        p="xs"
        style={{ background: "var(--phc-surface-soft)" }}
      >
        <MantineImage
          src={url}
          alt={file.name}
          fit="contain"
          h={180}
          fallbackSrc=""
        />
        <Text size="xs" c="var(--phc-text-muted)" mt={6}>
          {file.name} · {formatBytes(file.size)}
        </Text>
      </Paper>
    );
  }

  return (
    <Paper
      withBorder
      p="xs"
      style={{ background: "var(--phc-surface-soft)" }}
    >
      <audio src={url} controls style={{ width: "100%" }} />
      <Text size="xs" c="var(--phc-text-muted)" mt={6}>
        {file.name} · {formatBytes(file.size)}
      </Text>
    </Paper>
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
      ? `Embedding preview (${result.output.embedding.length} dims shown): ${result.output.embedding
          .slice(0, 24)
          .map((n) => n.toFixed(3))
          .join(", ")}`
      : "");

  return (
    <Card withBorder shadow="xs" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group align="flex-start" gap="sm">
            <ThemeIcon color="teal" variant="light" size="xl">
              <Icon size={22} />
            </ThemeIcon>
            <Stack gap={2}>
              <Title order={2} size="h4">
                {workflow.label}
              </Title>
              <Text size="xs" c="var(--phc-text-muted)" ff="monospace">
                {workflow.model}
              </Text>
            </Stack>
          </Group>
          <Badge color="teal" variant="light">
            {workflow.task}
          </Badge>
        </Group>

        <Divider />

        <Box aria-live="polite" aria-atomic="false">
          {status === "running" && (
            <Alert color="teal" icon={<Stethoscope size={16} />}>
              Analyzing your input. First call on a cold model can take a couple
              of minutes.
            </Alert>
          )}

          {error && (
            <Alert color="red" icon={<ShieldAlert size={16} />} mt={status === "running" ? "xs" : 0}>
              {error}
            </Alert>
          )}

          {!result && status === "idle" && !error && (
            <Paper
              p="lg"
              withBorder
              style={{ background: "var(--phc-surface-soft)" }}
            >
              <Text c="var(--phc-text-muted)">
                Add required input, then analyze. Results appear here.
              </Text>
            </Paper>
          )}

          {outputText && (
            <Paper
              p="md"
              withBorder
              mt={error || status === "running" ? "xs" : 0}
              style={{ background: "var(--phc-surface)" }}
            >
              <Group align="flex-start" gap="sm" wrap="nowrap">
                <ThemeIcon color="teal" variant="light" size="sm">
                  <ClipboardCheck size={14} />
                </ThemeIcon>
                <Text
                  size="sm"
                  lh={1.7}
                  c="var(--phc-text-strong)"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {outputText}
                </Text>
              </Group>
            </Paper>
          )}

          {result?.output?.scores && (
            <JsonInput
              label="Scores"
              value={JSON.stringify(result.output.scores, null, 2)}
              readOnly
              autosize
              mt="xs"
            />
          )}
        </Box>
      </Stack>
    </Card>
  );
}

function QuestionsCard({ workflow }: { workflow: Workflow }) {
  return (
    <Card withBorder shadow="xs" padding="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon color="yellow" variant="light" size="md">
            <Stethoscope size={16} />
          </ThemeIcon>
          <Text fw={700} c="var(--phc-text-strong)">
            Ask your clinician
          </Text>
        </Group>
        <List size="sm" spacing="xs" c="var(--phc-text)">
          {workflow.questions.map((question) => (
            <List.Item key={question}>{question}</List.Item>
          ))}
        </List>
      </Stack>
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
