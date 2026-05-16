"use client";

import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  List,
  Paper,
  Progress,
  SimpleGrid,
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
  BadgeCheck,
  Bone,
  Brain,
  ClipboardCheck,
  ClipboardList,
  FileImage,
  HeartPulse,
  Microscope,
  Pill,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

type Workflow = {
  id: string;
  label: string;
  shortLabel: string;
  model: string;
  task: string;
  icon: LucideIcon;
  reviewed: string;
  prompt: string;
  output: string[];
  questions: string[];
  limits: string;
  score: number;
};

const workflows: Workflow[] = [
  {
    id: "visit",
    label: "Visit Notes",
    shortLabel: "Notes",
    model: "google/medgemma-1.5-4b-it",
    task: "chat",
    icon: ClipboardList,
    reviewed: "Clinic note, lab comments, discharge instructions",
    prompt:
      "Explain my follow-up visit note in plain language. Highlight what changed, what I should monitor, and questions for my doctor.",
    output: [
      "Blood pressure remains above target in this synthetic chart, so follow-up tracking matters.",
      "Kidney and liver markers are presented as stable. Do not change medication without clinician confirmation.",
      "Next visit should clarify home readings, side effects, and whether repeat labs are needed.",
    ],
    questions: [
      "Which symptoms should make me seek urgent care?",
      "When should I repeat labs?",
      "What home readings should I record?",
    ],
    limits: "Draft explanation from uploaded text. It cannot verify missing context.",
    score: 82,
  },
  {
    id: "asr",
    label: "Conversation",
    shortLabel: "Audio",
    model: "google/medasr",
    task: "asr",
    icon: AudioLines,
    reviewed: "Recorded visit audio or dictated instructions",
    prompt:
      "Transcribe this synthetic visit audio, then turn clinician instructions into a checklist.",
    output: [
      "Transcript: continue current medication, track morning readings, schedule follow-up after labs.",
      "Checklist: take meds as prescribed, log blood pressure, complete labs, book review appointment.",
      "Unclear audio segments are marked for manual confirmation.",
    ],
    questions: [
      "Did I capture dosage timing correctly?",
      "Should I bring my home monitor to the next visit?",
      "Who should I call if readings stay high?",
    ],
    limits: "Audio quality affects transcript accuracy. Confirm all instructions with care team.",
    score: 74,
  },
  {
    id: "siglip",
    label: "Image Match",
    shortLabel: "Images",
    model: "google/medsiglip-448",
    task: "image_embed",
    icon: Search,
    reviewed: "Medical image embedding and similarity demo",
    prompt:
      "Compare this synthetic medical image against demo reference images and explain similar visual patterns.",
    output: [
      "Closest demo cluster: routine follow-up images with low-acuity visual pattern labels.",
      "Visual similarity does not mean same diagnosis.",
      "Use match results to organize images for clinician review.",
    ],
    questions: [
      "Does this image need formal review?",
      "Should I track change over time?",
      "What image quality would help comparison?",
    ],
    limits: "Similarity search only. Not diagnostic classification.",
    score: 68,
  },
  {
    id: "cxr",
    label: "Chest X-ray",
    shortLabel: "CXR",
    model: "google/cxr-foundation",
    task: "image_embed",
    icon: Bone,
    reviewed: "Chest X-ray image embeddings",
    prompt:
      "Explain this synthetic chest X-ray report in patient-friendly language and list follow-up questions.",
    output: [
      "Report language suggests no emergency finding in this synthetic example.",
      "Follow-up depends on symptoms, prior imaging, and clinician interpretation.",
      "Bring prior X-rays if available because comparison can change meaning.",
    ],
    questions: [
      "Was anything new compared with my prior scan?",
      "Do symptoms match imaging findings?",
      "Is repeat imaging needed?",
    ],
    limits: "Embedding workflow, not radiologist replacement.",
    score: 71,
  },
  {
    id: "derm",
    label: "Skin",
    shortLabel: "Skin",
    model: "google/derm-foundation",
    task: "image_embed",
    icon: FileImage,
    reviewed: "Dermatology image embeddings",
    prompt:
      "Explain what my synthetic dermatology visit summary says and what changes I should document.",
    output: [
      "The note focuses on monitoring size, color, border change, symptoms, and timing.",
      "Consistent photos under similar lighting help clinician comparison.",
      "Do not self-treat suspicious or changing lesions.",
    ],
    questions: [
      "Which changes matter most?",
      "How often should I photograph it?",
      "When should I book urgent review?",
    ],
    limits: "Cannot diagnose skin cancer or replace in-person exam.",
    score: 79,
  },
  {
    id: "path",
    label: "Pathology",
    shortLabel: "Path",
    model: "google/path-foundation",
    task: "image_embed",
    icon: Microscope,
    reviewed: "Pathology report terms and slide embeddings",
    prompt:
      "Translate this synthetic pathology report into plain language and list points to ask my specialist.",
    output: [
      "Pathology terms describe tissue features seen under microscope.",
      "Meaning depends on sample site, clinical history, margins, and specialist plan.",
      "Ask clinician to explain grade, margins, and treatment impact if mentioned.",
    ],
    questions: [
      "What result changes my treatment plan?",
      "Were margins clear?",
      "Do I need another biopsy or specialist visit?",
    ],
    limits: "Educational explanation only. Specialist interpretation required.",
    score: 64,
  },
];

const visitFacts = [
  ["Blood pressure", "142/88", "Track at home"],
  ["A1C", "5.8%", "Discuss prevention"],
  ["eGFR", "92", "Stable"],
  ["Next step", "Labs", "Before review"],
];

export function PhcWorkspace() {
  const [input, setInput] = useState(workflows[0].prompt);
  const [status, setStatus] = useState<"idle" | "running" | "ready">("idle");
  const activePrompt = useMemo(() => input.trim() || workflows[0].prompt, [input]);

  function runDemo() {
    setStatus("running");
    window.setTimeout(() => setStatus("ready"), 650);
  }

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
                <Group gap="xs">
                  <Badge color="teal" variant="light" leftSection={<BadgeCheck size={14} />}>
                    Portfolio prototype
                  </Badge>
                  <Badge color="yellow" variant="light" leftSection={<ShieldAlert size={14} />}>
                    AI draft
                  </Badge>
                </Group>

                <Stack gap={6}>
                  <Title order={1} size="h1" c="#10201c">
                    PHC-AI
                  </Title>
                  <Text size="xl" fw={600} c="#1d3a35">
                    Understand your checkup after the visit.
                  </Text>
                  <Text size="md" maw={680} c="dimmed" lh={1.7}>
                    Upload or paste synthetic reports, visit notes, images, or
                    doctor instructions. PHC-AI turns them into plain-language
                    summaries and questions for your care team.
                  </Text>
                </Stack>

                <Alert color="yellow" radius="md" icon={<ShieldAlert size={18} />}>
                  PHC-AI does not diagnose, prescribe, or replace licensed
                  medical care. Use synthetic/demo data only.
                </Alert>
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 5 }}>
              <Paper radius="lg" p="lg" shadow="sm" withBorder bg="white">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>Your post-visit packet</Text>
                      <Text size="sm" c="dimmed">
                        Synthetic wellness follow-up
                      </Text>
                    </div>
                    <ThemeIcon color="teal" variant="light" size="lg">
                      <HeartPulse size={22} />
                    </ThemeIcon>
                  </Group>
                  <SimpleGrid cols={2}>
                    {visitFacts.map(([label, value, helper]) => (
                      <Paper key={label} radius="md" p="sm" bg="#f3f8f7">
                        <Text size="xs" c="dimmed">
                          {label}
                        </Text>
                        <Text fw={700}>{value}</Text>
                        <Text size="xs" c="teal.8">
                          {helper}
                        </Text>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        </Container>
      </Box>

      <Container size="xl" py="lg">
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Stack gap="md">
              <Card radius="lg" shadow="sm" withBorder>
                <Stack gap="md">
                  <Group>
                    <ThemeIcon color="teal" variant="light" size="lg">
                      <Brain size={22} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700}>Ask about your visit</Text>
                      <Text size="sm" c="dimmed">
                        Plain language, follow-up focused
                      </Text>
                    </div>
                  </Group>

                  <Textarea
                    minRows={6}
                    value={input}
                    onChange={(event) => setInput(event.currentTarget.value)}
                    placeholder="Paste visit note or ask a question..."
                  />

                  <Button
                    color="teal"
                    leftSection={<Send size={16} />}
                    loading={status === "running"}
                    onClick={runDemo}
                  >
                    Run demo analysis
                  </Button>

                  <Text size="xs" c="dimmed" lh={1.5}>
                    Prompt: {activePrompt.slice(0, 130)}
                    {activePrompt.length > 130 ? "..." : ""}
                  </Text>
                </Stack>
              </Card>

              <Card radius="lg" shadow="sm" withBorder>
                <Stack gap="sm">
                  <Group>
                    <ThemeIcon color="blue" variant="light">
                      <Pill size={18} />
                    </ThemeIcon>
                    <Text fw={700}>What PHC-AI helps with</Text>
                  </Group>
                  <List size="sm" spacing="xs" c="dimmed">
                    <List.Item>Explain doctor notes after appointment</List.Item>
                    <List.Item>Turn instructions into checklists</List.Item>
                    <List.Item>Prepare questions for next visit</List.Item>
                    <List.Item>Organize imaging demos by model</List.Item>
                  </List>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Tabs defaultValue="visit" variant="pills" radius="md" color="teal">
              <Tabs.List grow>
                {workflows.map((workflow) => {
                  const Icon = workflow.icon;
                  return (
                    <Tabs.Tab
                      key={workflow.id}
                      value={workflow.id}
                      leftSection={<Icon size={16} />}
                    >
                      {workflow.shortLabel}
                    </Tabs.Tab>
                  );
                })}
              </Tabs.List>

              {workflows.map((workflow) => (
                <Tabs.Panel key={workflow.id} value={workflow.id} pt="md">
                  <WorkflowPanel status={status} workflow={workflow} />
                </Tabs.Panel>
              ))}
            </Tabs>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

function WorkflowPanel({
  workflow,
  status,
}: {
  workflow: Workflow;
  status: "idle" | "running" | "ready";
}) {
  const Icon = workflow.icon;

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
                    {workflow.reviewed}
                  </Text>
                </div>
              </Group>
              <Badge color="gray" variant="light">
                {workflow.task}
              </Badge>
            </Group>

            <Paper radius="md" p="md" bg="#f7fbfa" withBorder>
              <Group justify="space-between" mb={8}>
                <Text size="sm" fw={700}>
                  Readiness signal
                </Text>
                <Text size="sm" c="teal.8" fw={700}>
                  {workflow.score}%
                </Text>
              </Group>
              <Progress value={workflow.score} color="teal" radius="xl" />
              <Text size="xs" c="dimmed" mt={8}>
                Demo score for completeness of synthetic packet.
              </Text>
            </Paper>

            <Divider />

            <Stack gap="sm">
              <Text fw={700}>Plain-language explanation</Text>
              {workflow.output.map((item) => (
                <Paper key={item} radius="md" p="md" bg="#fbfefd" withBorder>
                  <Group align="flex-start" gap="sm">
                    <ThemeIcon color="teal" variant="light" size="sm">
                      <ClipboardCheck size={14} />
                    </ThemeIcon>
                    <Text size="sm" lh={1.6} c="#31443f">
                      {status === "running" ? "Preparing model response..." : item}
                    </Text>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, xl: 4 }}>
        <Stack gap="md">
          <Card radius="lg" shadow="sm" withBorder>
            <Stack gap="sm">
              <Group>
                <ThemeIcon color="yellow" variant="light">
                  <Sparkles size={18} />
                </ThemeIcon>
                <Text fw={700}>Model</Text>
              </Group>
              <Text size="sm" c="dimmed">
                {workflow.model}
              </Text>
            </Stack>
          </Card>

          <Card radius="lg" shadow="sm" withBorder>
            <Stack gap="sm">
              <Text fw={700}>Ask your clinician</Text>
              <List size="sm" spacing="sm" c="#31443f">
                {workflow.questions.map((question) => (
                  <List.Item key={question}>{question}</List.Item>
                ))}
              </List>
            </Stack>
          </Card>

          <Alert color="gray" radius="md" icon={<ShieldAlert size={18} />}>
            <Text size="sm">{workflow.limits}</Text>
          </Alert>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
