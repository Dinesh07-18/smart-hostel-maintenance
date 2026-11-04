# CTE and Recursive CTE Test Results

## Phase
Phase 3.6 – Common Table Expressions and Recursive CTEs

## Environment
- Database: smart_hostel_maintenance
- DBMS: MySQL 8.4.13
- Implementation: database/queries/05_ctes.sql

## 1. Single CTE – Hostel Complaint Statistics
- Calculated total, open and resolved complaints.
- Calculated average complaint waiting time.
- Tested with two hostels and three temporary complaints.

Expected vs Actual:
- Total complaints: 3 / 3
- Open complaints: 2 / 2
- Resolved complaints: 1 / 1
- Average waiting time: 48 / 48.00 hours
- Empty hostel: all metrics returned 0.

Result: PASSED.

## 2. Multiple CTEs – Complaint Statistics
- Used hostel_totals and critical_complaints CTEs.
- Combined their results using LEFT JOIN.

Expected vs Actual:
- Total complaints: 3 / 3
- Critical complaints: 1 / 1
- Empty hostel totals: 0 / 0
- Empty hostel critical complaints: 0 / 0

Result: PASSED.

## 3. Recursive CTE – Number Sequence
- Generated numbers from 1 through 10.
- Verified all 10 rows.

Result: PASSED.

## 4. Recursive CTE – Complaint Ageing Thresholds
- Generated thresholds in 24-hour intervals.
- Verified: 0, 24, 48, 72, 96, 120, 144 and 168 hours.

Result: PASSED.

## 5. Test Data Cleanup
- Removed three temporary complaints.
- Removed the temporary student profile and user.
- Removed the temporary category.
- Removed both temporary hostels.
- Removed the temporary role.
- Committed the cleanup transaction.
- Verified zero remaining test complaints and hostels.

Result: PASSED.

## Limitations
- Complaint category hierarchy is not supported by the current schema.
- Recursive CTEs were demonstrated using sequences and ageing thresholds rather than hierarchical category data.
- Application-level integration testing is reserved for the later integration phase.

## Conclusion
Single CTEs, multiple CTEs and recursive CTEs were successfully implemented and tested in MySQL 8.4.13. Functional calculations were verified using temporary test records, and cleanup was confirmed.
