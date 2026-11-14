# Windows / PowerShell setup

Use a disposable development database. Do not run the demo seed against production or a database containing important data.

## 1. Initialize local environment files

From the extracted project root:

```powershell
.\scripts\Initialize-LocalEnvironment.ps1
```

This creates `backend/.env` and `frontend/.env.local`, generates a private JWT secret, and aligns the frontend API URL with the backend's default port `5001`.

Open `backend/.env` and set the values for your machine:

- `DB_HOST`
- `DB_PORT` (the example uses `3307`; use the port your MySQL server actually listens on)
- `DB_NAME` (default `smart_hostel_maintenance`)
- `DB_USER`
- `DB_PASSWORD`
- `DEMO_SEED_PASSWORD` (unique local password, 12–128 characters)

Do not share or commit either environment file.

## 2. Create and initialize the MySQL database

Use MySQL Workbench or your preferred MySQL client to execute these files in order:

1. `database/create_database.sql`
2. `database/migrations/001_initial_schema.sql` (once, against the newly created database)
3. `database/migrations/002_complaint_embedding_jobs.sql`
4. `database/seeds/001_reference_data.sql`

The initial schema migration is not intended to be rerun. Select the `smart_hostel_maintenance` database before executing migrations 001 and 002.

## 3. Install and start the backend API

In PowerShell terminal 1:

```powershell
cd .\backend
npm ci
npm start
```

The API listens on `http://localhost:5001` by default. Health endpoint: `http://localhost:5001/api/health`.

## 4. Start Qdrant

From the project root, in PowerShell terminal 2:

```powershell
docker compose -f .\infrastructure\qdrant\docker-compose.yml up -d
```

Qdrant is bound to loopback at `127.0.0.1:6333` for local development.

## 5. Install and start the embedding service

In PowerShell terminal 3:

```powershell
cd .\backend\embedding_service
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8001
```

The first startup downloads the selected SentenceTransformer model if it is not cached. The service reads Qdrant and model settings from `backend/.env`.

## 6. Start the embedding worker

In PowerShell terminal 4:

```powershell
cd .\backend
npm run worker
```

The worker requires migration `002_complaint_embedding_jobs.sql` and a reachable embedding service.

## 7. Install and start the frontend

In PowerShell terminal 5:

```powershell
cd .\frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. The frontend API URL is set in `frontend/.env.local`.

## 8. Create development demonstration data

Only after confirming that `backend/.env` points to a disposable development database and contains a unique `DEMO_SEED_PASSWORD`:

```powershell
cd .\backend
$env:NODE_ENV = "development"
node .\scripts\seed-demo.js
```

The seed is non-destructive and does not truncate tables. It creates/reuses the demo accounts and data: 3 hostels, 6 rooms, 10 students, 3 wardens, 5 maintenance staff, 1 administrator and 12 sample complaint definitions.

## 9. Setup preflight (does not run tests)

From the project root:

```powershell
.\scripts\Prepare-Verification.ps1
```

This checks required project files, reports available local tools and reminds you about missing environment values. It does not install dependencies, execute tests, modify the database or start services.

## 10. Final verification (run only after implementation is frozen)

From the project root:

```powershell
.\scripts\Verify-Integration.ps1 -InstallDependencies
```

This installs Node dependencies and runs backend tests, frontend lint/build and Python syntax compilation. It does not replace live MySQL, Qdrant, embedding-indexing, API authorization and browser workflow checks. Follow `docs/testing/FINAL_TEST_MATRIX.md` and record actual results.
