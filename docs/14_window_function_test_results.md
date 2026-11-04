# Phase 3.7 – Window Function Test Results

## Project
Smart Hostel Maintenance & Complaint Prioritization Platform

## Environment
- Database: MySQL 8.4.13
- Database name: smart_hostel_maintenance
- SQL script: database/queries/06_window_functions.sql

## Objective
To implement and functionally verify ROW_NUMBER(), RANK(), DENSE_RANK(), and LAG() window functions using representative hostel complaint, staff assignment, and complaint event data.

## Test Data
Temporary records were inserted inside an explicit transaction:
- 3 complaints with different submission times and severity levels.
- 2 maintenance staff members.
- 3 active complaint assignments.
- 6 complaint status events.

The test records were used only for functional verification and were rolled back after testing.

## Test Cases and Results

### 1. ROW_NUMBER() – Complaint Waiting-Time Ranking

Purpose:
Rank open complaints within each hostel, with the oldest complaint receiving the first rank.

Actual result:

| Complaint ID | Hostel ID | Status | Waiting Rank |
|---|---|---|---:|
| 13 | 8 | ASSIGNED | 1 |
| 14 | 8 | ASSIGNED | 2 |
| 15 | 8 | ASSIGNED | 3 |

Result: PASS

### 2. RANK() – Maintenance Staff Workload Ranking

Purpose:
Rank maintenance staff according to their number of active complaint assignments.

Actual result:

| Staff ID | Employee Code | Active Assignments | Workload Rank |
|---|---|---:|---:|
| 3 | WIN-STAFF-001 | 2 | 1 |
| 4 | WIN-STAFF-002 | 1 | 2 |

Result: PASS

### 3. DENSE_RANK() – Complaint Severity Ranking

Purpose:
Rank complaints within each hostel according to severity, using the order CRITICAL, HIGH, MEDIUM, LOW.

Actual result:

| Complaint ID | Severity | Severity Rank |
|---|---|---:|
| 13 | CRITICAL | 1 |
| 14 | HIGH | 2 |
| 15 | MEDIUM | 3 |

Result: PASS

### 4. LAG() – Previous Complaint Event Status

Purpose:
Retrieve the preceding event's new_status for each complaint using LAG(), partitioned by complaint_id and ordered by created_at and event_id.

Actual result:

| Complaint ID | New Status | Preceding Event Status |
|---|---|---|
| 13 | SUBMITTED | NULL |
| 13 | VERIFIED | SUBMITTED |
| 13 | ASSIGNED | VERIFIED |
| 14 | SUBMITTED | NULL |
| 14 | ASSIGNED | SUBMITTED |
| 15 | SUBMITTED | NULL |

Result: PASS

The partitioning ensured that event history from one complaint did not affect the preceding-event result of another complaint.

## Cleanup and Verification

After all tests:
- ROLLBACK executed successfully.
- Test complaint count: 0.
- Test assignment count: 0.
- Test event count: 0.
- Test maintenance staff count: 0.
- Test hostel count: 0.
- Test user count: 0.

All temporary test data was removed successfully.

## Final Outcome

All four window-function queries executed successfully and produced the expected functional results.

| Window Function | Result |
|---|---|
| ROW_NUMBER() | PASS |
| RANK() | PASS |
| DENSE_RANK() | PASS |
| LAG() | PASS |

Phase 3.7 – Window Functions: COMPLETE.
