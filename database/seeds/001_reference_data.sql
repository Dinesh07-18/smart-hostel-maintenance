-- Smart Hostel Maintenance & Complaint Prioritization Platform
-- Phase 4 reference-data seed
-- Target: MySQL 8.4 | Database: smart_hostel_maintenance
-- Safe to re-run: inserts missing records and updates the approved policy factors.
-- This script does not create users, hostels, rooms, or staff/student profiles.

USE smart_hostel_maintenance;

START TRANSACTION;

-- -----------------------------------------------------------------------------
-- 1. Roles (four roles documented in the project requirements)
-- -----------------------------------------------------------------------------
INSERT INTO roles (role_name, description)
SELECT seed.role_name, seed.description
FROM (
    SELECT 'STUDENT' AS role_name, 'Student who submits and tracks maintenance complaints.' AS description
    UNION ALL SELECT 'MAINTENANCE_STAFF', 'Maintenance staff who handle assigned complaints.'
    UNION ALL SELECT 'WARDEN', 'Warden who oversees complaints within assigned hostels.'
    UNION ALL SELECT 'ADMINISTRATOR', 'Administrator who manages platform-wide operations.'
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM roles existing WHERE existing.role_name = seed.role_name
);

-- -----------------------------------------------------------------------------
-- 2. Complaint categories (five categories documented in project scope)
-- -----------------------------------------------------------------------------
INSERT INTO complaint_categories (category_name, description, is_active)
SELECT seed.category_name, seed.description, TRUE
FROM (
    SELECT 'Plumbing' AS category_name, 'Water supply, leakage, drainage, and plumbing issues.' AS description
    UNION ALL SELECT 'Electrical', 'Electrical wiring, lighting, power, and related issues.'
    UNION ALL SELECT 'Furniture', 'Damaged or faulty hostel furniture and fixtures.'
    UNION ALL SELECT 'Cleanliness', 'Cleaning, sanitation, and housekeeping issues.'
    UNION ALL SELECT 'Internet Connectivity', 'Hostel network and internet connectivity issues.'
) AS seed
WHERE NOT EXISTS (
    SELECT 1 FROM complaint_categories existing
    WHERE existing.category_name = seed.category_name
);

-- -----------------------------------------------------------------------------
-- 3. Default priority policy
-- -----------------------------------------------------------------------------
INSERT INTO priority_policies
    (policy_name, description, version, is_active, effective_from, effective_until)
SELECT
    'Default Complaint Priority Policy',
    'Approved weighted policy: severity 0.500, urgency 0.300, waiting time 0.200.',
    '1.0',
    FALSE,
    CURRENT_TIMESTAMP,
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM priority_policies
    WHERE policy_name = 'Default Complaint Priority Policy'
      AND version = '1.0'
);

-- Resolve the policy ID without assuming a generated numeric ID.
SET @default_policy_id = (
    SELECT policy_id
    FROM priority_policies
    WHERE policy_name = 'Default Complaint Priority Policy'
      AND version = '1.0'
    ORDER BY policy_id
    LIMIT 1
);

-- Keep the policy description aligned with the approved decision.
UPDATE priority_policies
SET description = 'Approved weighted policy: severity 0.500, urgency 0.300, waiting time 0.200.'
WHERE policy_id = @default_policy_id;

-- Insert missing factors.
INSERT INTO priority_policy_factors
    (policy_id, factor_name, factor_weight, description)
SELECT @default_policy_id, seed.factor_name, seed.factor_weight, seed.description
FROM (
    SELECT 'severity' AS factor_name, 0.500 AS factor_weight,
           'Contribution based on the reported severity of the complaint.' AS description
    UNION ALL SELECT 'urgency', 0.300,
           'Contribution based on the urgency of the complaint.'
    UNION ALL SELECT 'waiting_time', 0.200,
           'Contribution based on how long the complaint has been waiting.'
) AS seed
WHERE @default_policy_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM priority_policy_factors existing
      WHERE existing.policy_id = @default_policy_id
        AND existing.factor_name = seed.factor_name
  );

-- Enforce the approved values even if this script is re-run after a prior edit.
UPDATE priority_policy_factors
SET factor_weight = 0.500,
    description = 'Contribution based on the reported severity of the complaint.'
WHERE policy_id = @default_policy_id AND factor_name = 'severity';

UPDATE priority_policy_factors
SET factor_weight = 0.300,
    description = 'Contribution based on the urgency of the complaint.'
WHERE policy_id = @default_policy_id AND factor_name = 'urgency';

UPDATE priority_policy_factors
SET factor_weight = 0.200,
    description = 'Contribution based on how long the complaint has been waiting.'
WHERE policy_id = @default_policy_id AND factor_name = 'waiting_time';

-- Activate only when all three expected factors exist and sum to exactly 1.000.
UPDATE priority_policies
SET is_active = CASE
    WHEN (
        SELECT COUNT(*)
        FROM priority_policy_factors
        WHERE policy_id = @default_policy_id
          AND factor_name IN ('severity', 'urgency', 'waiting_time')
    ) = 3
    AND (
        SELECT ROUND(SUM(factor_weight), 3)
        FROM priority_policy_factors
        WHERE policy_id = @default_policy_id
          AND factor_name IN ('severity', 'urgency', 'waiting_time')
    ) = 1.000
    THEN TRUE
    ELSE FALSE
END
WHERE policy_id = @default_policy_id;

COMMIT;

-- -----------------------------------------------------------------------------
-- 4. Verification output
-- -----------------------------------------------------------------------------
SELECT role_id, role_name, description
FROM roles
WHERE role_name IN ('STUDENT', 'MAINTENANCE_STAFF', 'WARDEN', 'ADMINISTRATOR')
ORDER BY role_id;

SELECT category_id, category_name, is_active
FROM complaint_categories
WHERE category_name IN (
    'Plumbing', 'Electrical', 'Furniture', 'Cleanliness', 'Internet Connectivity'
)
ORDER BY category_id;

SELECT policy_id, policy_name, version, is_active, effective_from, effective_until
FROM priority_policies
WHERE policy_id = @default_policy_id;

SELECT factor_name, factor_weight, description
FROM priority_policy_factors
WHERE policy_id = @default_policy_id
ORDER BY FIELD(factor_name, 'severity', 'urgency', 'waiting_time');

SELECT
    COUNT(*) AS expected_factor_count,
    ROUND(SUM(factor_weight), 3) AS total_weight,
    CASE
        WHEN COUNT(*) = 3 AND ROUND(SUM(factor_weight), 3) = 1.000
        THEN 'VALID'
        ELSE 'INVALID - DO NOT USE POLICY'
    END AS validation_status
FROM priority_policy_factors
WHERE policy_id = @default_policy_id
  AND factor_name IN ('severity', 'urgency', 'waiting_time');
