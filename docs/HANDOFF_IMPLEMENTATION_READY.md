# Implementation-ready handoff

This source package is prepared for the user's consolidated Windows/PowerShell verification phase.

## Changes in this handoff

- Demo seed now defines 12 sample complaints.
- Demo seed requires a private `DEMO_SEED_PASSWORD` (12–128 characters); no default shared password remains in source or documentation.
- Demo seed synchronizes demo maintenance-staff availability with active assignment records.
- API default port and frontend API URL are aligned to 5001.
- API startup requires a JWT secret of at least 32 bytes; JWT signing and verification explicitly use HS256 and the configured issuer.
- Student semantic-search results suppress other students' complaint descriptions and do not expose room numbers.
- Frontend README is project-specific rather than the Next.js starter README.
- Windows setup documentation now gives the correct environment, MySQL migration, Qdrant, embedding service, worker, frontend and seed sequence.
- Added `Initialize-LocalEnvironment.ps1` and `Prepare-Verification.ps1`.
- Removed duplicate migration copies, temporary source-inspection artifacts, backup server file and unused Next.js starter artwork.
- Updated `.gitignore` so nested `.env.example` templates remain trackable.

## Verification boundary

No backend tests, frontend lint/build, Python runtime checks, MySQL migrations, Qdrant calls, model downloads or browser workflows were run during this implementation pass. Those are intentionally deferred to the user's final testing phase.

Start with:

```powershell
.\scripts\Initialize-LocalEnvironment.ps1
.\scripts\Prepare-Verification.ps1
```

When the local services and dependencies are ready, run:

```powershell
.\scripts\Verify-Integration.ps1 -InstallDependencies
```

Then follow `docs/testing/FINAL_TEST_MATRIX.md`. Do not treat this archive as production-verified until the actual results are recorded.
