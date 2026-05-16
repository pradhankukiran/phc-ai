import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Bone,
  ClipboardList,
  FileImage,
  Microscope,
  Search,
} from "lucide-react";
import type { PhcModel, PhcTask } from "@/lib/modalInfer";

export type WorkflowRoute =
  | "chat"
  | "conversation"
  | "image-match"
  | "chest-xray"
  | "skin"
  | "pathology";

export type Workflow = {
  route: WorkflowRoute;
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

export const workflows: Workflow[] = [
  {
    route: "chat",
    label: "Visit Notes",
    shortLabel: "Chat",
    model: "google/medgemma-1.5-4b-it",
    task: "chat",
    icon: ClipboardList,
    accepts: "text",
    prompt:
      "Explain this health report in plain language. List key findings, what I may have missed, and questions to ask my doctor.",
    help: "Paste visit notes, lab comments, discharge instructions, or report text.",
    questions: [
      "What changed since my last visit?",
      "Which follow-ups are time sensitive?",
      "What should I confirm with my doctor?",
    ],
  },
  {
    route: "conversation",
    label: "Conversation",
    shortLabel: "Audio",
    model: "google/medasr",
    task: "asr",
    icon: AudioLines,
    accepts: "audio",
    prompt: "Upload visit audio for transcription.",
    help: "Upload an audio file. PHC-AI returns a transcript.",
    questions: [
      "Did I capture dosage timing correctly?",
      "Which instructions are unclear?",
      "What needs follow-up?",
    ],
  },
  {
    route: "image-match",
    label: "Image Match",
    shortLabel: "Images",
    model: "google/medsiglip-448",
    task: "classify",
    icon: Search,
    accepts: "image-text",
    prompt: "normal follow-up image\nneeds clinician review\nunclear image quality",
    help: "Upload an image and provide candidate labels, one per line.",
    questions: [
      "Does this image need formal review?",
      "Should I track change over time?",
      "Is image quality good enough?",
    ],
  },
  {
    route: "chest-xray",
    label: "Chest X-ray",
    shortLabel: "CXR",
    model: "google/cxr-foundation",
    task: "image_embed",
    icon: Bone,
    accepts: "image",
    prompt: "Upload a chest X-ray image for CXR Foundation embedding.",
    help: "Returns an embedding vector preview for search/similarity.",
    questions: [
      "Was anything new compared with prior scan?",
      "Do symptoms match imaging findings?",
      "Is repeat imaging needed?",
    ],
  },
  {
    route: "skin",
    label: "Skin",
    shortLabel: "Skin",
    model: "google/derm-foundation",
    task: "image_embed",
    icon: FileImage,
    accepts: "image",
    prompt: "Upload a dermatology image for Derm Foundation embedding.",
    help: "Returns an embedding preview for retrieval or organization.",
    questions: [
      "Which changes matter most?",
      "How often should I photograph it?",
      "When should I book review?",
    ],
  },
  {
    route: "pathology",
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

export function getWorkflow(route: string): Workflow | undefined {
  return workflows.find((workflow) => workflow.route === route);
}
