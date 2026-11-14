# Backend services

## Node.js API

Configure `.env` from `.env.example`, apply the MySQL schema and queue migration, then:

```bash
npm ci
npm start
```

The API listens on `PORT` (default 5001). Set `CORS_ORIGINS` to a comma-separated list of exact frontend origins.

## Embedding service

From `backend/embedding_service`, create and activate a Python virtual environment, install `requirements.txt`, then start:

```bash
uvicorn app:app --host 127.0.0.1 --port 8001
```

Configure `QDRANT_URL`, optional `QDRANT_API_KEY`, `QDRANT_COLLECTION` and `EMBEDDING_MODEL` in `backend/.env`; the service loads this file with `python-dotenv`. The service loads the model, measures its actual vector dimension and checks the Qdrant collection dimension and cosine distance at startup. Keep this internal service private; it is not intended to be exposed directly to browsers or the public internet.

## Embedding worker

In another terminal, from `backend/`:

```bash
npm run worker
```

The worker requires `database/migrations/002_complaint_embedding_jobs.sql`. It leases pending jobs, retries failures with backoff and writes embedding references after successful indexing.

## Development demo seed

From `backend/`, set `NODE_ENV=development` and run:

```bash
node scripts/seed-demo.js
```

The seed is non-destructive and requires explicit development opt-in. See the root README for demo account details and database verification SQL.
