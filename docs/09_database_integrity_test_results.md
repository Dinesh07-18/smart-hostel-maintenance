# Database Integrity Test Results

## 1. Environment

- Database: smart_hostel_maintenance
- DBMS: MySQL Community Server 8.4.13
- Port: 3307
- Storage engine: InnoDB
- Migration tested: database/migrations/001_initial_schema.sql
- Test method: SQL integrity tests inside a transaction
- Cleanup: ROLLBACK executed and verified

## 2. Schema Verification

| Check | Result |
|---|---|
| Tables created | 22 |
| InnoDB tables | 22 |
| CHECK constraints | 15 |
| Foreign key constraints | 29 |
| Primary keys | 22 |
| Unique constraints | 21 |

## 3. Integrity Tests

| Test | Observed result | Status |
|---|---|---|
| Invalid priority policy date range | Rejected by CHECK constraint | PASS |
| Priority factor outside 0–1 | Rejected by CHECK constraint | PASS |
| Feedback rating outside 1–5 | Rejected by CHECK constraint | PASS |
| Invalid staff specialization reference | Rejected by foreign key | PASS |
| Invalid complaint assignment status/timestamp combination | Rejected by CHECK constraint | PASS |
| Duplicate active room allocation for one student | Rejected by unique constraint | PASS |
| Historical inactive room allocation | Accepted | PASS |
| Duplicate active complaint assignment | Rejected by unique constraint | PASS |
| Reassignment after completion | Accepted | PASS |
| Complaint room belonging to another hostel | Rejected by foreign key | PASS |
| Common-area complaint with NULL room | Accepted | PASS |
| Invalid staff-hostel assignment dates | Rejected by CHECK constraint | PASS |
| Invalid warden assignment dates | Rejected by CHECK constraint | PASS |
| Feedback for a complaint belonging to another student | Rejected by foreign key | PASS |
| Invalid audit log user reference | Rejected by foreign key | PASS |

## 4. Identified Validation Gaps

### 4.1 Room Capacity

A room configured with capacity 2 accepted 3 active student allocations.

The current schema does not enforce room capacity across multiple student-room-history records.

Required backend protection:
- Validate active occupancy before allocation.
- Lock the relevant room row using a transaction and SELECT ... FOR UPDATE.
- Insert the allocation only when capacity is available.
- Ensure concurrent allocation requests cannot exceed capacity.

### 4.2 Priority Policy Factor Total

The database accepted three priority factors with weights 0.5, 0.4 and 0.3, producing a total of 1.2.

Individual factor weights are constrained to the range 0–1, but their combined total is not enforced.

Required backend protection:
- Validate that the total factor weight equals 1.0 before activating a policy.
- Perform validation transactionally.
- Prevent factor changes from making an active policy invalid.

## 5. Cleanup Verification

All test records were created inside one transaction.

ROLLBACK was executed successfully.

The following table counts were verified as zero after rollback:

| Table | Remaining test records |
|---|---:|
| roles | 0 |
| users | 0 |
| hostels | 0 |
| rooms | 0 |
| complaints | 0 |
| student_room_history | 0 |
| complaint_assignments | 0 |
| feedback | 0 |
| audit_logs | 0 |
| priority_policies | 0 |

## 6. Conclusion

The initial MySQL schema migration executed successfully and created all 22 InnoDB tables.

The tested CHECK constraints, foreign keys and unique constraints behaved as expected.

Two cross-row business rules remain application-level responsibilities:
1. Room capacity enforcement.
2. Priority policy factor total validation.

These validations must be implemented and tested in the backend before the corresponding operations are considered complete.

This report records the tests actually performed. It does not claim exhaustive testing of every table, constraint or business rule.
