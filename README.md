# PHC-AI

Personal Health Checkup AI portfolio prototype.

PHC-AI explains post-visit materials after a clinic or hospital visit: notes,
reports, instructions, images, and audio. It is not for diagnosis,
prescribing, or clinical use.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Mantine UI
- lucide-react icons
- Modal FastAPI backend
- Single `/infer` endpoint
- Vercel frontend deploy target

## Model Plan

| Tab | Model | Task |
| --- | --- | --- |
| Visit Notes | `google/medgemma-1.5-4b-it` | `chat` |
| Conversation | `google/medasr` | `asr` |
| Image Match | `google/medsiglip-448` | `classify` |
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

Backend runtime:

```bash
MAX_LOADED_MODELS=1
MODAL_GPU=L40S
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.vercel.app
```

All six HAI-DEF repos are gated. The Hugging Face token must be from an
account that accepted each model license.

## Safety Scope

- Do not upload PHI unless deployment is compliant
- AI draft copy shown in UI
- No diagnosis, prescribing, or emergency guidance
