# Stored Procedure Test Results

## Procedure
`sp_get_hostel_complaints`

## Purpose
Retrieves complaints for a specified hostel, with an optional complaint-status filter.

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `p_hostel_id` | INT | Required hostel ID |
| `p_status` | VARCHAR(30) | Optional complaint status; NULL returns all statuses |

## Features
- Validates that the supplied hostel ID exists.
- Validates the supplied complaint status.
- Joins complaints with complaint categories, student profiles, users and hostels.
- Returns complaint and student details.
- Sorts results by submission date in descending order.

## Test Results

| Test | Input | Expected Result | Actual Result |
|---|---|---|---|
| Invalid hostel | `CALL sp_get_hostel_complaints(99999, NULL)` | Reject invalid hostel ID | Passed |
| All statuses | `CALL sp_get_hostel_complaints(4, NULL)` | Return all complaints for hostel 4 | Passed |
| Status filter | `CALL sp_get_hostel_complaints(4, 'SUBMITTED')` | Return SUBMITTED complaints | Passed |
| Invalid status | `CALL sp_get_hostel_complaints(4, 'INVALID_STATUS')` | Reject invalid status | Passed |

## Test Data Cleanup
Temporary test records were created inside a transaction and removed using `ROLLBACK`.

Final verification:
- Hostels: 0
- Complaints: 0
- Users: 0

The database was left clean after testing.

## Conclusion
The stored procedure was successfully created, verified and tested. All four tests passed.
