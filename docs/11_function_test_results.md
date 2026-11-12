# Function Test Results

## 1. fn_complaint_waiting_hours

Purpose: Calculate elapsed complaint waiting time in hours.

Input: DATETIME submission timestamp.

Output: DECIMAL(10,2).

| Test | Expected | Actual | Result |
|---|---|---|---|
| Timestamp 5 hours before current time | 5.00 | 5.00 | PASSED |
| NULL input | NULL | NULL | PASSED |

## 2. fn_get_staff_active_assignments

Purpose: Count active complaint assignments for a maintenance staff member.

Input: Staff ID (INT).

Output: Active assignment count (INT).

Conditions:
- assignment_status = ACTIVE
- unassigned_at IS NULL
- Invalid staff IDs (NULL or <= 0) raise SQLSTATE 45000.

| Test | Expected | Actual | Result |
|---|---|---|---|
| Staff ID 1 | Assignment count | 0 | PASSED |
| Staff ID 0 | Invalid staff ID error | Error 1644 | PASSED |

## Conclusion

Both functions were successfully created and tested in MySQL 8.4.13.

All four test cases passed.

Note: The waiting-hours SQL function calculates elapsed duration, not the weighted priority score. The application-level scoring proposal is now documented in `17_priority_policy_proposal.md`. Its score mappings, waiting-time bands and thresholds are proposed defaults and still require project/faculty review. The SQL function results above remain historical database-function test results.
