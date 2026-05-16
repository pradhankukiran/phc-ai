# PHC-AI Modal backend

Single GPU, single `/infer` endpoint with lazy model loading:

```bash
modal secret create phc-ai-hai-def-hf HF_TOKEN=hf_...
modal deploy modal/app.py
```

Environment:

```bash
MAX_LOADED_MODELS=1
MODAL_GPU=L40S
MODAL_APP_NAME=phc-ai-health-companion
MODAL_VOLUME_NAME=phc-ai-hai-def-cache
MODAL_HF_SECRET_NAME=phc-ai-hai-def-hf
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
      "prompt": "Explain this visit note in plain language.",
      "text": "Paste report text here."
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

Current backend validates model/task pairs, mounts persistent HF cache at
`/models`, lazy-loads model adapters, and keeps one loaded model in process
memory by default.
