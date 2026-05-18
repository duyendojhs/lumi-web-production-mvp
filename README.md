# Lumi Web AI

Lumi la project web AI doc lap, tach khoi runtime/backend cua `lumi-ai-assistant`.

Ban hien tai chi dung Gemini API. Groq, OpenRouter va cac provider khac khong con nam trong runtime.

Project duoc to chuc theo 4 phan he:

- `data/`: raw data, processed data va features sau nay.
- `ai_module/`: model notes, training/eval va Gemini serving design.
- `qa_ba/`: tests, monitoring, bao cao QA/BA.
- `frontend/`: Next.js web app va dashboard demo.

`data/raw` hien da co dataset raw cho local development. Production mode khong phu thuoc duong dan local: metadata/documents doc tu managed Postgres, raw files nam trong object storage, jobs chay qua worker/cron.

## Chay nhanh

```powershell
cd frontend\web_app
Copy-Item .env.example .env.local
# dien GEMINI_API_KEY trong .env.local
npm install
npm run dev
```

Mo:

- Web app: http://127.0.0.1:3000
- Health API: http://127.0.0.1:3000/api/health
- Data Layer dashboard: http://127.0.0.1:3000/data-layer

## Chay Data Layer

```powershell
python data\scripts\run_data_layer.py
```

Output chinh:

- `data/metadata/data_catalog.json/csv/xlsx`
- `data/processed/documents/processed_documents.jsonl`
- `data/features/chunks/document_chunks.jsonl`
- `data/features/statistics/data_statistics.json`
- `data/reports/data_quality_report.md`

Khong dua Gemini API key vao client, khong dung `NEXT_PUBLIC_` cho key, va khong commit `.env.local`.

## Deploy production

Huong deploy that:

- Vercel root directory: `frontend/web_app`.
- Gemini key dat trong Vercel env.
- Managed Postgres/Supabase chay `frontend/web_app/db/schema.sql`.
- Object storage dung Supabase Storage, S3 hoac R2 qua storage abstraction.
- Jobs/OCR/RAG chay qua QStash/Inngest/worker, khong phu thuoc Docker local.

Tai lieu can doc truoc khi push/deploy:

- `docs/PRODUCTION_ENV_CHECKLIST.md`
- `docs/SUPABASE_SETUP.md`
- `docs/VERCEL_DEPLOYMENT.md`
- `docs/DATA_DEPLOY_STRATEGY.md`
- `docs/DEPLOYMENT.md`

Kiem tra truoc khi push:

```powershell
python scripts\predeploy_check.py
```
