-- Phase 3.6: Common Table Expressions (CTEs)

-- 1. Single CTE: Hostel complaint statistics
WITH hostel_complaint_stats AS (
    SELECT
        hostel_id,
        COUNT(*) AS total_complaints,
        SUM(CASE
            WHEN status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
            THEN 1 ELSE 0
        END) AS open_complaints,
        SUM(CASE
            WHEN status IN ('RESOLVED', 'CLOSED')
            THEN 1 ELSE 0
        END) AS resolved_complaints,
        ROUND(
            AVG(TIMESTAMPDIFF(HOUR, submitted_at, CURRENT_TIMESTAMP)),
            2
        ) AS avg_waiting_hours
    FROM complaints
    GROUP BY hostel_id
)
SELECT
    h.hostel_id,
    h.hostel_name,
    COALESCE(s.total_complaints, 0) AS total_complaints,
    COALESCE(s.open_complaints, 0) AS open_complaints,
    COALESCE(s.resolved_complaints, 0) AS resolved_complaints,
    COALESCE(s.avg_waiting_hours, 0) AS avg_waiting_hours
FROM hostels h
LEFT JOIN hostel_complaint_stats s
    ON h.hostel_id = s.hostel_id
ORDER BY total_complaints DESC;


-- 2. Multiple CTEs: Total and critical complaints per hostel
WITH hostel_totals AS (
    SELECT hostel_id, COUNT(*) AS total_complaints
    FROM complaints
    GROUP BY hostel_id
),
critical_complaints AS (
    SELECT hostel_id, COUNT(*) AS critical_count
    FROM complaints
    WHERE severity = 'CRITICAL'
    GROUP BY hostel_id
)
SELECT
    h.hostel_name,
    COALESCE(ht.total_complaints, 0) AS total_complaints,
    COALESCE(cc.critical_count, 0) AS critical_complaints
FROM hostels h
LEFT JOIN hostel_totals ht
    ON h.hostel_id = ht.hostel_id
LEFT JOIN critical_complaints cc
    ON h.hostel_id = cc.hostel_id;


-- 3. Recursive CTE: Generate numbers from 1 to 10
WITH RECURSIVE number_sequence AS (
    SELECT 1 AS num
    UNION ALL
    SELECT num + 1
    FROM number_sequence
    WHERE num < 10
)
SELECT num
FROM number_sequence;


-- 4. Recursive CTE: Generate complaint ageing thresholds
WITH RECURSIVE ageing_thresholds AS (
    SELECT 0 AS hours_threshold
    UNION ALL
    SELECT hours_threshold + 24
    FROM ageing_thresholds
    WHERE hours_threshold < 168
)
SELECT
    hours_threshold,
    CONCAT(hours_threshold, ' hours') AS waiting_period
FROM ageing_thresholds;
