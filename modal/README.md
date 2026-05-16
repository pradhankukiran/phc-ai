# PHC-AI Modal backend

Single GPU, single `/infer` endpoint. Portfolio default runs in demo mode:

```bash
modal secret create phc-ai-hf HF_TOKEN=hf_...
modal deploy modal/app.py
```

Environment:

```bash
PHC_AI_DEMO_MODE=1
MAX_LOADED_MODELS=1
MODAL_GPU=L40S
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.vercel.app
```

Request:

```bash
curl -X POST "$MODAL_URL/infer" \
  -H "content-type: application/json" \
  -d '{
    "model": "google/medgemma-1.5-4b-it",
    "task": "chat",
    "inputs": {
      "prompt": "Explain this synthetic visit note."
    }
  }'
```

Supported models:

- `google/medgemma-1.5-4b-it`
- `google/medasr`
- `google/medsiglip-448`
- `google/cxr-foundation`
- `google/derm-foundation`
- `google/path-foundation`

Real model runners still need per-model adapters. Current scaffold validates
model/task pairs, mounts persistent HF cache at `/models`, and keeps one loaded
model in process memory by default.
