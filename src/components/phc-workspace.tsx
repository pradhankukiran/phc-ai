"use client";

import {
  AudioLines,
  BadgeCheck,
  Bone,
  Brain,
  ClipboardList,
  FileImage,
  Microscope,
  Pill,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Workflow = {
  id: string;
  label: string;
  model: string;
  task: string;
  icon: typeof ClipboardList;
  reviewed: string;
  prompt: string;
  output: string[];
  questions: string[];
  limits: string;
};

const workflows: Workflow[] = [
  {
    id: "visit",
    label: "Visit Notes",
    model: "google/medgemma-1.5-4b-it",
    task: "chat",
    icon: ClipboardList,
    reviewed: "Clinic note, lab comments, discharge instructions",
    prompt:
      "Explain my follow-up visit note in plain language. Highlight what changed, what I should monitor, and questions for my doctor.",
    output: [
      "Blood pressure remains above target in this synthetic chart, so follow-up tracking matters.",
      "Kidney and liver markers are presented as stable. No medication change should be made without clinician confirmation.",
      "Next visit should clarify home readings, side effects, and whether repeat labs are needed.",
    ],
    questions: [
      "Which symptoms should make me seek urgent care?",
      "When should I repeat labs?",
      "What home readings should I record?",
    ],
    limits: "Draft explanation from uploaded text. It cannot verify missing context.",
  },
  {
    id: "asr",
    label: "Conversation",
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
  },
  {
    id: "siglip",
    label: "Image Match",
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
  },
  {
    id: "cxr",
    label: "Chest X-ray",
    model: "google/cxr-foundation",
    task: "image_embed",
    icon: Bone,
    reviewed: "Chest X-ray image embeddings",
    prompt:
      "Explain this synthetic chest X-ray report in patient-friendly language and list follow-up questions.",
    output: [
      "The report language suggests no emergency finding in this synthetic example.",
      "Follow-up depends on symptoms, prior imaging, and clinician interpretation.",
      "Bring prior X-rays if available because comparison can change meaning.",
    ],
    questions: [
      "Was anything new compared with my prior scan?",
      "Do symptoms match imaging findings?",
      "Is repeat imaging needed?",
    ],
    limits: "Embedding workflow, not radiologist replacement.",
  },
  {
    id: "derm",
    label: "Skin",
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
  },
  {
    id: "path",
    label: "Pathology",
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
  },
];

const modelStats = [
  ["Modal endpoint", "single /infer"],
  ["GPU", "L40S or A100-80GB"],
  ["Cache", "lazy model load"],
  ["Data", "synthetic demo only"],
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
    <main className="min-h-screen bg-[#f7f9fb] text-[#18202a]">
      <section className="border-b border-[#d8e1e6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md bg-[#126b5d]/10 px-3 py-1 text-sm font-medium text-[#126b5d]">
                  <BadgeCheck className="size-4" />
                  Portfolio prototype
                </span>
                <span className="inline-flex items-center gap-2 rounded-md bg-[#f0b429]/15 px-3 py-1 text-sm font-medium text-[#785900]">
                  <ShieldAlert className="size-4" />
                  AI draft
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-normal text-[#101820] sm:text-4xl">
                  PHC-AI
                </h1>
                <p className="mt-2 max-w-2xl text-base leading-7 text-[#536575]">
                  Personal Health Checkup AI for understanding post-visit notes,
                  reports, images, and instructions after real care.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
              {modelStats.map(([label, value]) => (
                <div
                  className="rounded-lg border border-[#d8e1e6] bg-[#f7f9fb] p-3"
                  key={label}
                >
                  <p className="text-xs font-medium text-[#6b7c8b]">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#18202a]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#f0b429]/40 bg-[#fff8e6] p-4 text-sm leading-6 text-[#604600]">
            AI-generated explanations may be incomplete or incorrect. PHC-AI
            does not diagnose, prescribe, or replace licensed medical care.
            Follow clinician instructions and seek urgent help for urgent
            symptoms.
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="size-5 text-[#126b5d]" />
                Demo Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[#536575]">
              <div>
                <p className="font-medium text-[#18202a]">
                  Synthetic patient visit
                </p>
                <p>Hypertension follow-up, basic labs, medication review.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-[#edf3f6] p-3">
                  <p className="text-xs text-[#6b7c8b]">BP</p>
                  <p className="font-semibold text-[#18202a]">142/88</p>
                </div>
                <div className="rounded-md bg-[#edf3f6] p-3">
                  <p className="text-xs text-[#6b7c8b]">A1C</p>
                  <p className="font-semibold text-[#18202a]">5.8%</p>
                </div>
                <div className="rounded-md bg-[#edf3f6] p-3">
                  <p className="text-xs text-[#6b7c8b]">eGFR</p>
                  <p className="font-semibold text-[#18202a]">92</p>
                </div>
                <div className="rounded-md bg-[#edf3f6] p-3">
                  <p className="text-xs text-[#6b7c8b]">Status</p>
                  <p className="font-semibold text-[#18202a]">Stable</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="size-5 text-[#126b5d]" />
                Ask PHC-AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label="Prompt"
              />
              <Button className="w-full" onClick={runDemo}>
                <Send className="size-4" />
                Run demo analysis
              </Button>
              <p className="text-xs leading-5 text-[#6b7c8b]">
                Current prompt: {activePrompt.slice(0, 110)}
                {activePrompt.length > 110 ? "..." : ""}
              </p>
            </CardContent>
          </Card>
        </aside>

        <Tabs defaultValue="visit" className="min-w-0">
          <TabsList>
            {workflows.map((workflow) => {
              const Icon = workflow.icon;
              return (
                <TabsTrigger key={workflow.id} value={workflow.id}>
                  <Icon className="size-4" />
                  {workflow.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {workflows.map((workflow) => (
            <TabsContent key={workflow.id} value={workflow.id}>
              <WorkflowPanel status={status} workflow={workflow} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </main>
  );
}

function WorkflowPanel({
  workflow,
  status,
}: {
  workflow: Workflow;
  status: "idle" | "running" | "ready";
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{workflow.label}</CardTitle>
              <p className="mt-1 text-sm text-[#536575]">
                {workflow.reviewed}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[#edf3f6] px-3 py-1 text-xs font-medium text-[#536575]">
              <Sparkles className="size-3.5" />
              {workflow.model}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[#d8e1e6] bg-[#f7f9fb] p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#6b7c8b]">
              Task
            </p>
            <p className="mt-1 text-sm font-medium text-[#18202a]">
              {workflow.task}
            </p>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-[#18202a]">
              Plain-language explanation
            </h3>
            <div className="mt-3 space-y-2">
              {workflow.output.map((item) => (
                <p
                  className="rounded-md border border-[#d8e1e6] bg-white p-3 text-sm leading-6 text-[#354554]"
                  key={item}
                >
                  {status === "running" ? "Preparing model response..." : item}
                </p>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Ask your clinician</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm leading-6 text-[#354554]">
              {workflow.questions.map((question) => (
                <li className="rounded-md bg-[#edf3f6] p-3" key={question}>
                  {question}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-[#536575]">
            {workflow.limits}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
