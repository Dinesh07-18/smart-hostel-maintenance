# Final integrated test matrix

Run only after implementation is frozen. Use a disposable development database and never point the demo seed at production.

## Automated checks

| Area | Check | Expected result |
|---|---|---|
| Backend | `npm test` in `backend/` | All service, authorization, admin, feedback, JWT issuer, priority and rate-limit tests pass |
| Frontend | `npm run lint` in `frontend/` | No lint errors |
| Frontend | `npm run build` in `frontend/` | Production build succeeds |
| Python | `python -m compileall -q backend/embedding_service` | No Python syntax errors |
| Database | Apply migrations 001 and 002 once | All expected tables exist; no destructive statements |
| Seed | Run `seed-demo.js` twice against disposable DB | Second run adds no duplicate demo profiles, rooms, assignments or complaints |
| Seed | Run `database/tests/verify_demo_seed.sql` | 3 demo hostels, 6 demo rooms, 10 students and expected room occupancy; exactly 12 demo complaint definitions; no room over capacity |

## Service readiness

- MySQL accepts backend credentials and all 22 base tables plus embedding queue table exist.
- `docker compose -f infrastructure/qdrant/docker-compose.yml config` succeeds; Qdrant is reachable on loopback and the collection vector dimension equals the loaded model's measured dimension (expected 384 for the selected MiniLM model; trust runtime measurement).
- FastAPI `/health` reports Qdrant connected and the loaded model/dimension.
- Express `/api/health` returns success.
- Embedding worker starts, claims a pending job, indexes it and marks it completed.

## Role-based workflows

| Role | Workflow | Authorization assertions |
|---|---|---|
| Student | Login, submit complaint, view history, search related complaints, rate resolved/closed complaint | Can see/search only their active hostel; cannot submit feedback for another student's complaint or unresolved complaint |
| Maintenance Staff | Login, search assigned hostels, view active assignments, move ASSIGNED → IN_PROGRESS → RESOLVED | Cannot search complaints outside active staff-hostel assignments or change another staff member's assignment |
| Warden | Login, filter queue, search assigned hostels, assign complaint to eligible staff | Cannot view/assign complaints outside active warden assignments; staff must be assigned to the same hostel |
| Administrator | Login, search across hostels, create each supported user role, assign hostel/room, update account status | Cannot deactivate own account or last active administrator; cannot assign a room to another hostel, full room or maintenance room |

## Functional and security checks

- Verify priority calculation uses the approved 50/30/20 severity/urgency/waiting-time weights and snapshots refresh as specified.
- Verify feedback duplicate prevention and ownership checks at API level.
- Verify search text and limit validation, no client-supplied hostel scope, and MySQL reauthorization of Qdrant result IDs.
- Verify login rate limit (10 requests per 15 minutes per process/IP) and semantic search rate limit (30 requests per minute per process/IP) on both `/api/search/complaints` and the student similar-complaint endpoint.
- Verify CORS allows only configured origins; test both permitted and rejected origins.
- Verify real deployment secrets are absent from tracked files and logs (documented local demo credentials are the only exception); verify production configuration uses unique JWT and database credentials.
- Verify the embedding service and Qdrant are not publicly exposed without an explicit secured gateway.

## Browser acceptance

At desktop and mobile widths, verify all four dashboards render, controls are usable, empty/error/loading states are legible, session expiry returns to login, and account/complaint actions refresh the relevant lists.

Record actual results, environment versions, test date and any skipped infrastructure-dependent checks. Do not mark a check passed merely because its script exists.
