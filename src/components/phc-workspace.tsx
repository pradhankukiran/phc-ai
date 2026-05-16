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
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Bone,
  Brain,
  ClipboardCheck,
  ClipboardList,
  FileImage,
  HeartPulse,
  Microscope,
  Search,
  Send,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { useMemo, useState } from "react";
import { infer, type InferResponse, type PhcModel, type PhcTask } from "@/lib/modalInfer";

type Workflow = {
  id: string;
  label: string;
  shortLabel: string;
  model: PhcModel;
  task: PhcTask;
  icon: LucideIcon;
  accepts: "text" | "audio" | "image" | "image-text";
  prompt: string;
  help: string;
  questions: string[];
};

const workflows: Workflow[] = [
  {
    id: "visit",
    label: "Visit Notes",
    shortLabel: "Notes",
    model: "google/medgemma-1.5-4b-it",
    task: "chat",
    icon: ClipboardList,
    accepts: "text",
    prompt:
      "Explain this health report in plain language. List key findings, what I may have missed, and questions to ask my doctor.",
    help: "Paste real or sample visit notes, lab comments, discharge instructions, or report text.",
    questions: [
      "What changed since my last visit?",
      "Which follow-ups are time sensitive?",
      "What should I confirm with my doctor?",
    ],
  },
  {
    id: "asr",
    label: "Conversation",
    shortLabel: "Audio",
    model: "google/medasr",
    task: "asr",
    icon: AudioLines,
    accepts: "audio",
    prompt: "Upload visit audio for transcription.",
    help: "Upload an audio file. Backend sends it to MedASR and returns transcript.",
    questions: [
      "Did I capture dosage timing correctly?",
      "Which instructions are unclear?",
      "What needs follow-up?",
    ],
  },
  {
    id: "siglip",
    label: "Image Match",
    shortLabel: "Images",
    model: "google/medsiglip-448",
    task: "classify",
    icon: Search,
    accepts: "image-text",
    prompt:
      "normal follow-up image\nneeds clinician review\nunclear image quality",
    help: "Upload an image and provide candidate labels, one per line, for MedSigLIP scores.",
    questions: [
      "Does this image need formal review?",
      "Should I track change over time?",
      "Is image quality good enough?",
    ],
  },
  {
    id: "cxr",
    label: "Chest X-ray",
    shortLabel: "CXR",
    model: "google/cxr-foundation",
    task: "image_embed",
    icon: Bone,
    accepts: "image",
    prompt: "Upload a chest X-ray image for CXR Foundation embedding.",
    help: "Returns CXR embedding vector preview. Use for search/similarity, not diagnosis.",
    questions: [
      "Was anything new compared with prior scan?",
      "Do symptoms match imaging findings?",
      "Is repeat imaging needed?",
    ],
  },
  {
    id: "derm",
    label: "Skin",
    shortLabel: "Skin",
    model: "google/derm-foundation",
    task: "image_embed",
    icon: FileImage,
    accepts: "image",
    prompt: "Upload a dermatology image for Derm Foundation embedding.",
    help: "Returns Derm Foundation embedding preview. Use for retrieval or organization.",
    questions: [
      "Which changes matter most?",
      "How often should I photograph it?",
      "When should I book review?",
    ],
  },
  {
    id: "path",
    label: "Pathology",
    shortLabel: "Path",
    model: "google/path-foundation",
    task: "image_embed",
    icon: Microscope,
    accepts: "image",
    prompt: "Upload a 224x224 pathology patch or image crop for Path Foundation embedding.",
    help: "Returns Path Foundation embedding preview. Whole-slide tiling is not implemented.",
    questions: [
      "What result changes my treatment plan?",
      "Were margins clear?",
      "Do I need specialist review?",
    ],
  },
];

type Inputs = {
  prompt: string;
  text: string;
  file: File | null;
};

const defaultInputs: Inputs = {
  prompt: workflows[0].prompt,
  text: "",
  file: null,
};

export function PhcWorkspace() {
  const [active, setActive] = useState(workflows[0].id);
  const [inputs, setInputs] = useState<Inputs>(defaultInputs);
  const [result, setResult] = useState<InferResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);

  const workflow = useMemo(
    () => workflows.find((item) => item.id === active) ?? workflows[0],
    [active],
  );

  function switchTab(value: string | null) {
    if (!value) return;
    const next = workflows.find((item) => item.id === value) ?? workflows[0];
    setActive(next.id);
    setInputs({ prompt: next.prompt, text: "", file: null });
    setResult(null);
    setError(null);
  }

  async function runInference() {
    setStatus("running");
    setError(null);
    setResult(null);

    try {
      const fileBase64 = inputs.file ? await fileToDataUrl(inputs.file) : null;
      const labels =
        workflow.id === "siglip"
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

                <Alert color="yellow" radius="md" icon={<ShieldAlert size={18} />}>
                  PHC-AI helps explain care documents. It does not diagnose,
                  prescribe, or replace your clinician.
                </Alert>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper radius="lg" p="lg" shadow="sm" withBorder bg="white">
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
        <Tabs value={active} onChange={switchTab} variant="pills" radius="md" color="teal">
          <Tabs.List grow>
            {workflows.map((item) => {
              const Icon = item.icon;
              return (
                <Tabs.Tab key={item.id} value={item.id} leftSection={<Icon size={16} />}>
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
    <Card radius="lg" shadow="sm" withBorder>
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
            label={workflow.id === "siglip" ? "Candidate labels" : "Question or instruction"}
            minRows={workflow.id === "siglip" ? 4 : 5}
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
        <Card radius="lg" shadow="sm" withBorder>
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
              <Paper radius="md" p="lg" bg="#f7fbfa" withBorder>
                <Text c="dimmed">
                  Add required input, then analyze. Results will appear here.
                </Text>
              </Paper>
            )}

            {outputText && (
              <Paper radius="md" p="md" bg="#fbfefd" withBorder>
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
          <Card radius="lg" shadow="sm" withBorder>
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

          <Alert color="gray" radius="md" icon={<ShieldAlert size={18} />}>
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
