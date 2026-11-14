# Hostel Complaint Management

A role-based hostel maintenance complaint platform for students, maintenance staff, wardens and administrators. It includes complaint lifecycle management, weighted prioritization, feedback and role-scoped semantic search.

## Project layout

- `frontend/` — Next.js / React application
- `backend/` — Express API, MySQL services, embedding worker and FastAPI embedding service
- `database/migrations/` — relational schema
- `database/seeds/` — reference and development data
- `database/queries/` — views, procedures, functions, triggers, CTEs, window and full-text examples
- `docs/` — requirements, design and verification notes (including `docs/WINDOWS_SETUP.md`)
- `scripts/` — maintenance and evaluation utilities

## Setup

On Windows, start with `scripts/Initialize-LocalEnvironment.ps1` to create local environment files and generate a private JWT secret; see `docs/WINDOWS_SETUP.md` for the complete sequence.

1. Run `database/create_database.sql`, then apply `database/migrations/001_initial_schema.sql` once.
2. Apply `database/migrations/002_complaint_embedding_jobs.sql` to add the embedding job queue.
3. Apply `database/seeds/001_reference_data.sql` for roles, categories and priority reference data.
4. Configure `backend/.env` using `backend/.env.example`; never commit real credentials.
5. Install backend dependencies with `cd backend && npm ci` and start the API with `npm start`.
6. Install frontend dependencies with `cd frontend && npm ci`; configure `frontend/.env.local` from `frontend/.env.example`, then run `npm run dev`.
7. Start local Qdrant with `docker compose -f infrastructure/qdrant/docker-compose.yml up -d`. It binds only to `127.0.0.1:6333` and stores data in a named volume.
8. Configure the embedding service using `backend/embedding_service/requirements.txt` and `backend/.env`. Start FastAPI with `uvicorn app:app --host 127.0.0.1 --port 8001` from `backend/embedding_service` before enabling embedding/indexing workflows.
9. In another backend terminal, start the embedding worker with `npm run worker`.

## Development demo data

The demo seed is explicitly gated and non-destructive. Select a development database, configure backend environment variables, then run from `backend/`:

```bash
NODE_ENV=development node scripts/seed-demo.js
```

On PowerShell:

```powershell
$env:NODE_ENV = "development"
node .\scripts\seed-demo.js
```

Set a unique `DEMO_SEED_PASSWORD` in `backend/.env` before running the seed (12–128 characters). No shared demo password is embedded in the source. Demo accounts use `@demo.hostel.test` addresses; use the configured value to sign in. The script refuses production-like database names. Existing records are reused; it does not truncate or delete data. The script creates 3 demo hostels, 6 rooms, 10 students, 3 wardens, 5 maintenance staff and 12 sample complaint definitions. Room distribution is 2+2 students in Hostel 1, 2+1 in Hostel 2 and 2+1 in Hostel 3.

## Semantic search

Authenticated roles can call `POST /api/search/complaints` with `{ "text": "...", "limit": 5 }`. The API derives hostel scope from the authenticated user's assignments and verifies Qdrant matches against MySQL before returning complaint details. See `docs/SEMANTIC_SEARCH_IMPLEMENTATION.md` and `docs/testing/SEMANTIC_SEARCH_EVALUATION.md`.

## Security notes

- Do not expose `.env` or `.env.local` files.
- Use unique strong credentials outside local development.
- Keep Qdrant and the embedding service on private service networks; do not expose unauthenticated internal endpoints publicly.
- Backend authorization is authoritative; UI filters are not security controls.

## Final verification

Run the consolidated local checks from PowerShell after implementation is complete:

```powershell
.\scripts\Verify-Integration.ps1 -InstallDependencies
```

This runs backend automated tests, frontend lint and production build, plus a Python embedding-service syntax check when Python is installed. It does not start MySQL, Qdrant or the model service. Complete the live role-by-role API and browser workflow checks described in `docs/IMPLEMENTATION_STATUS.md` before treating the deployment as verified.
