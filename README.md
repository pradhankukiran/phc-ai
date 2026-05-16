# PHC-AI

Personal Health Checkup AI portfolio prototype.

PHC-AI explains synthetic post-visit materials after a real clinic or hospital
visit: notes, reports, instructions, images, and audio. It is not for diagnosis,
prescribing, or clinical use.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- lucide-react icons
- Modal FastAPI backend scaffold
- Single `/infer` endpoint
- Vercel frontend deploy target

## Model Plan

| Tab | Model | Task |
| --- | --- | --- |
| Visit Notes | `google/medgemma-1.5-4b-it` | `chat` |
| Conversation | `google/medasr` | `asr` |
| Image Match | `google/medsiglip-448` | `image_embed` |
| Chest X-ray | `google/cxr-foundation` | `image_embed` |
| Skin | `google/derm-foundation` | `image_embed` |
| Pathology | `google/path-foundation` | `image_embed` |

## Local Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Modal Backend

```bash
modal secret create phc-ai-hf HF_TOKEN=hf_...
modal deploy modal/app.py
```

Set frontend env:

```bash
NEXT_PUBLIC_MODAL_INFER_URL=https://your-workspace--phc-ai-medical-models-infer.modal.run/infer
```

Default backend is demo-safe:

```bash
PHC_AI_DEMO_MODE=1
MAX_LOADED_MODELS=1
MODAL_GPU=L40S
```

Real model adapters belong in `modal/model_registry.py`.

## Safety Scope

- Synthetic/demo data only
- No PHI upload
- AI draft copy shown in UI
- No diagnosis, prescribing, or emergency guidance
