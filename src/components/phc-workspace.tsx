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
  JsonInput,
  List,
  Paper,
  Stack,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  Brain,
  ClipboardCheck,
  HeartPulse,
  Send,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { infer, type InferResponse } from "@/lib/modalInfer";
import { workflows, type Workflow, type WorkflowRoute } from "@/lib/workflows";

type Inputs = {
  prompt: string;
  text: string;
  file: File | null;
};

export function PhcWorkspace({ activeRoute }: { activeRoute: WorkflowRoute }) {
  const workflow = useMemo(
    () => workflows.find((item) => item.route === activeRoute) ?? workflows[0],
    [activeRoute],
  );
  const [inputs, setInputs] = useState<Inputs>({
    prompt: workflow.prompt,
    text: "",
    file: null,
  });
  const [result, setResult] = useState<InferResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);

  async function runInference() {
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
          image_base64:
            workflow.accepts === "image" || workflow.accepts === "image-text"
              ? fileBase64
              : null,
          audio_base64: workflow.accepts === "audio" ? fileBase64 : null,
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

  const canRun =
    workflow.accepts === "text"
      ? Boolean(inputs.prompt.trim() || inputs.text.trim())
      : Boolean(inputs.file);

  return (
    <Box bg="#f6faf9" mih="100vh">
      <Box
        bg="linear-gradient(135deg, #e7f6f2 0%, #f7fbff 52%, #fff8ec 100%)"
        style={{ borderBottom: "1px solid #dbe7e4" }}
      >
        <Container size="xl" py={{ base: 28, md: 42 }}>
          <Grid align="center" gap="xl">
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <Stack gap={6}>
                  <Text size="sm" fw={700} c="teal.8" tt="uppercase">
                    Personal Health Clinic
                  </Text>
                  <Title order={1} size="h1" c="#10201c">
                    PHC-AI
                  </Title>
                  <Text size="xl" fw={600} c="#1d3a35">
                    Understand your checkup after the visit.
                  </Text>
                  <Text size="md" maw={680} c="dimmed" lh={1.7}>
                    Ask questions about your visit notes, reports, images, and
                    recorded instructions in one place.
                  </Text>
                </Stack>

                <Alert color="yellow" icon={<ShieldAlert size={18} />}>
                  PHC-AI helps explain care documents. It does not diagnose,
                  prescribe, or replace your clinician.
                </Alert>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper p="lg" shadow="sm" withBorder bg="white">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>Your health packet</Text>
                      <Text size="sm" c="dimmed">
                        Notes, reports, images, and instructions
                      </Text>
                    </div>
                    <ThemeIcon color="teal" variant="light" size="lg">
                      <HeartPulse size={22} />
                    </ThemeIcon>
                  </Group>
                  <List size="sm" spacing="xs" c="dimmed">
                    <List.Item>Summarize doctor notes in plain language</List.Item>
                    <List.Item>Transcribe visit recordings</List.Item>
                    <List.Item>Review images and reports</List.Item>
                    <List.Item>Prepare questions for follow-up</List.Item>
                  </List>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      <Container size="xl" py="lg">
        <Tabs value={activeRoute} variant="pills" color="teal">
          <Tabs.List grow>
            {workflows.map((item) => {
              const Icon = item.icon;
              return (
                <Tabs.Tab
                  key={item.route}
                  value={item.route}
                  leftSection={<Icon size={16} />}
                  renderRoot={(props) => <Link {...props} href={`/${item.route}`} />}
                >
                  {item.shortLabel}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>

          <Grid gap="lg" mt="md">
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <InputPanel
                canRun={canRun}
                inputs={inputs}
                setInputs={setInputs}
                status={status}
                workflow={workflow}
                onRun={runInference}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 8 }}>
              <OutputPanel error={error} result={result} status={status} workflow={workflow} />
            </Grid.Col>
          </Grid>
        </Tabs>
      </Container>
    </Box>
  );
}

function InputPanel({
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
  const needsFile = workflow.accepts !== "text";

  return (
    <Card shadow="sm" withBorder>
      <Stack gap="md">
        <Group>
          <ThemeIcon color="teal" variant="light" size="lg">
            <Brain size={22} />
          </ThemeIcon>
          <div>
            <Text fw={700}>{workflow.label}</Text>
            <Text size="sm" c="dimmed">
              {workflow.help}
            </Text>
          </div>
        </Group>

        {(workflow.accepts === "text" || workflow.accepts === "image-text") && (
          <Textarea
            label={workflow.route === "image-match" ? "Candidate labels" : "Question or instruction"}
            minRows={workflow.route === "image-match" ? 4 : 5}
            value={inputs.prompt}
            onChange={(event) =>
              setInputs((current) => ({ ...current, prompt: event.currentTarget.value }))
            }
          />
        )}

        {workflow.accepts === "text" && (
          <Textarea
            label="Report or visit text"
            minRows={8}
            value={inputs.text}
            onChange={(event) =>
              setInputs((current) => ({ ...current, text: event.currentTarget.value }))
            }
            placeholder="Paste discharge summary, labs, prescription note, or visit instructions..."
          />
        )}

        {needsFile && (
          <FileInput
            accept={workflow.accepts === "audio" ? "audio/*" : "image/*"}
            label={workflow.accepts === "audio" ? "Audio file" : "Image file"}
            placeholder="Choose file"
            value={inputs.file}
            onChange={(file) => setInputs((current) => ({ ...current, file }))}
          />
        )}

        <Button
          color="teal"
          leftSection={<Send size={16} />}
          loading={status === "running"}
          disabled={!canRun}
          onClick={onRun}
        >
          Analyze
        </Button>
      </Stack>
    </Card>
  );
}

function OutputPanel({
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
    (result?.output?.embedding ? `Embedding preview: ${result.output.embedding.slice(0, 24).join(", ")}` : "");

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, xl: 8 }}>
        <Card shadow="sm" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Group align="flex-start">
                <ThemeIcon color="teal" variant="light" size="xl">
                  <Icon size={24} />
                </ThemeIcon>
                <div>
                  <Title order={2} size="h3">
                    {workflow.label}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {workflow.model}
                  </Text>
                </div>
              </Group>
              <Badge color="gray" variant="light">
                {workflow.task}
              </Badge>
            </Group>

            <Divider />

            {status === "running" && (
              <Alert color="teal" icon={<Stethoscope size={18} />}>
                Analyzing your information. First analysis for a section can take
                a few minutes.
              </Alert>
            )}

            {error && (
              <Alert color="red" icon={<ShieldAlert size={18} />}>
                {error}
              </Alert>
            )}

            {!result && status === "idle" && !error && (
              <Paper p="lg" bg="#f7fbfa" withBorder>
                <Text c="dimmed">
                  Add required input, then analyze. Results will appear here.
                </Text>
              </Paper>
            )}

            {outputText && (
              <Paper p="md" bg="#fbfefd" withBorder>
                <Group align="flex-start" gap="sm">
                  <ThemeIcon color="teal" variant="light" size="sm">
                    <ClipboardCheck size={14} />
                  </ThemeIcon>
                  <Text size="sm" lh={1.7} c="#31443f" style={{ whiteSpace: "pre-wrap" }}>
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
              />
            )}
          </Stack>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, xl: 4 }}>
        <Stack gap="md">
          <Card shadow="sm" withBorder>
            <Stack gap="sm">
              <Group>
                <ThemeIcon color="yellow" variant="light">
                  <Stethoscope size={18} />
                </ThemeIcon>
                <Text fw={700}>Ask your clinician</Text>
              </Group>
              <List size="sm" spacing="sm" c="#31443f">
                {workflow.questions.map((question) => (
                  <List.Item key={question}>{question}</List.Item>
                ))}
              </List>
            </Stack>
          </Card>

          <Alert color="gray" icon={<ShieldAlert size={18} />}>
            <Text size="sm">
              Outputs explain or embed provided material. They are not diagnosis,
              prescriptions, or emergency guidance.
            </Text>
          </Alert>
        </Stack>
      </Grid.Col>
    </Grid>
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
