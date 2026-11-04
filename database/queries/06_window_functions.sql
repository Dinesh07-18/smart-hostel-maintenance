-- ============================================================
-- PHASE 3.7: WINDOW FUNCTIONS
-- Smart Hostel Maintenance Platform
-- MySQL 8.4
-- ============================================================

-- 1. ROW_NUMBER(): Rank complaints by waiting time within each hostel.
WITH ranked_complaints AS (
    SELECT
        complaint_id,
        hostel_id,
        title,
        status,
        submitted_at,
        ROW_NUMBER() OVER (
            PARTITION BY hostel_id
            ORDER BY submitted_at ASC, complaint_id ASC
        ) AS waiting_rank
    FROM complaints
    WHERE status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
)
SELECT *
FROM ranked_complaints
ORDER BY hostel_id, waiting_rank;


-- 2. RANK(): Rank maintenance staff by number of active assignments.
WITH staff_workload AS (
    SELECT
        ms.staff_id,
        ms.employee_code,
        u.full_name AS staff_name,
        COUNT(ca.assignment_id) AS active_assignments
    FROM maintenance_staff_profiles ms
    JOIN users u
        ON u.user_id = ms.user_id
    LEFT JOIN complaint_assignments ca
        ON ca.staff_id = ms.staff_id
        AND ca.assignment_status = 'ACTIVE'
        AND ca.unassigned_at IS NULL
    GROUP BY
        ms.staff_id,
        ms.employee_code,
        u.full_name
)
SELECT
    staff_id,
    employee_code,
    staff_name,
    active_assignments,
    RANK() OVER (
        ORDER BY active_assignments DESC
    ) AS workload_rank
FROM staff_workload
ORDER BY workload_rank, staff_id;


-- 3. DENSE_RANK(): Rank complaints by severity within each hostel.
SELECT
    complaint_id,
    hostel_id,
    title,
    severity,
    DENSE_RANK() OVER (
        PARTITION BY hostel_id
        ORDER BY
            CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
            END
    ) AS severity_rank
FROM complaints
ORDER BY hostel_id, severity_rank, complaint_id;


-- 4. LAG(): Compare each complaint event with its previous event.
SELECT
    event_id,
    complaint_id,
    event_type,
    previous_status,
    new_status,
    created_at,
    LAG(new_status) OVER (
        PARTITION BY complaint_id
        ORDER BY created_at, event_id
    ) AS preceding_event_status
FROM complaint_events
ORDER BY complaint_id, created_at, event_id;

