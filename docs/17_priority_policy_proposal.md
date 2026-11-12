# Complaint Priority Policy — Proposed Scoring Rules

**Status:** Proposed implementation policy (score mappings, waiting-time bands and thresholds require project/faculty review).
**Policy version:** 1.0 proposal
**Scope:** Unresolved complaints in the Smart Hostel Maintenance & Complaint Prioritization Platform.

## 1. Weighting

The project reference-data seed records the following factor weights:

| Factor | Weight |
|---|---:|
| Severity | 50% |
| Urgency | 30% |
| Waiting time | 20% |
| **Total** | **100%** |

The weights are read from the active `priority_policies` and `priority_policy_factors` records. The service refuses to calculate a score if there is no active policy or if its factors do not match the expected 50/30/20 policy.

## 2. Proposed input score mappings

Each component is normalized to a score from 0 to 100.

| Input value | Proposed score |
|---|---:|
| LOW | 25 |
| MEDIUM | 50 |
| HIGH | 75 |
| CRITICAL | 100 |

The same mapping is used for severity and urgency. The two inputs remain separate factors and retain their different weights.

## 3. Proposed waiting-time bands

Waiting time is measured from `complaints.submitted_at` until the current calculation time.

| Time waiting | Proposed score |
|---|---:|
| Less than 24 hours | 0 |
| 24 to less than 48 hours | 25 |
| 48 to less than 72 hours | 50 |
| 72 to less than 96 hours | 75 |
| 96 hours or more | 100 |

Waiting-time score is capped at 100. Resolved, closed and rejected complaints are not periodically recalculated.

## 4. Formula

`Total = (Severity × 0.50) + (Urgency × 0.30) + (WaitingTime × 0.20)`

The total is rounded to three decimal places and remains in the 0–100 range.

## 5. Proposed priority thresholds

| Total score | Priority |
|---|---|
| 0 to less than 25 | LOW |
| 25 to less than 50 | MEDIUM |
| 50 to less than 75 | HIGH |
| 75 to 100 | CRITICAL |

## 6. Calculation lifecycle

1. When a student submits a complaint, the backend reads the active policy, calculates the initial score with zero elapsed waiting time, and inserts a row into `complaint_priority_snapshots` in the same database transaction as complaint creation.
2. When the Warden/Admin complaint queue is read, unresolved complaints without a snapshot in the preceding hour are recalculated. Each recalculation inserts a new snapshot rather than overwriting history.
3. The latest snapshot is used to rank complaints in the Warden/Admin queue.
4. A missing or invalid active policy causes complaint creation to fail and roll back. This prevents silently accepting complaints without a priority result.

## 7. Worked example

For severity HIGH (75), urgency MEDIUM (50), and 48–less-than-72 hours waiting (50):

`(75 × 0.50) + (50 × 0.30) + (50 × 0.20) = 62.5`

The proposed priority is HIGH.

## 8. Governance and limitations

These score mappings, waiting-time bands and thresholds are sensible initial defaults for implementation, not empirically validated service-level targets. They should be reviewed against hostel maintenance policy and faculty requirements. The system currently uses the latest calculated snapshot; queue reads refresh unresolved complaints at most hourly. A dedicated scheduled worker may replace read-triggered refresh in a production deployment.
