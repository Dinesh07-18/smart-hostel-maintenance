# Implementation status and verification boundary

## Implemented source scope

- Role-based authentication for Student, Maintenance Staff, Warden and Administrator.
- Complaint submission, history, lifecycle actions, assignment and reassignment services.
- Weighted complaint prioritization and priority snapshots.
- Student feedback submission and history, with backend ownership and resolved/closed checks.
- Administrator user management, hostel lookup and available-room lookup.
- Role-scoped semantic search across all four roles, with MySQL reauthorization of Qdrant match IDs.
- Qdrant embedding service, embedding worker and retryable MySQL embedding-job queue.
- Development demo seed for 3 demo hostels, 6 rooms, 10 students, 3 wardens, 5 maintenance staff, one administrator and 12 complaint definitions.
- Windows environment initialization and setup-preflight scripts.
- Consolidated backend, frontend and Python verification entry points.

## Changes made during this handoff preparation

- Added the twelfth demo complaint definition (the seed previously contained eleven).
- Removed the shared hardcoded demo password. `DEMO_SEED_PASSWORD` must now be set privately to a unique value between 12 and 128 characters before seeding.
- Aligned backend defaults and frontend API URL to port 5001, matching the current project run configuration.
- Replaced the leftover Create Next App frontend README with project-specific setup instructions.
- Removed stale backend backup files, duplicate migration copy and temporary source-inspection artifacts.
- Added `scripts/Initialize-LocalEnvironment.ps1` to create local env files and generate a private JWT secret.
- Added `scripts/Prepare-Verification.ps1` to report setup readiness without running tests or changing the database.

## Verification status

**No final verification has been run on this updated working copy.**

A previous project snapshot was reported as having 119/119 backend tests passing, but the source has since changed and that historical result must not be treated as current verification. Frontend lint/build, live MySQL, Qdrant, model loading/indexing and browser-based role workflows remain for the consolidated PowerShell verification phase.

Run `scripts/Prepare-Verification.ps1` to inspect local prerequisites. When implementation is frozen and local services are configured, run `scripts/Verify-Integration.ps1 -InstallDependencies`, then follow `docs/testing/FINAL_TEST_MATRIX.md`.

## Operational caveats

- The in-memory rate limiter is per Node process; multi-instance deployments require a shared store.
- The embedding worker requires migration `002_complaint_embedding_jobs.sql`.
- The API and frontend default to port 5001 and `http://localhost:5001/api`; update both environment files together if changing the port.
- The embedding service requires Python dependencies and a model download on first startup. This is an expected runtime prerequisite, not something verified by source preparation.
- Qdrant is intended to remain private and loopback-bound for local development.
- Demo accounts use `@demo.hostel.test` addresses. Set a unique local `DEMO_SEED_PASSWORD`; no demo password is committed.
