-- ============================================================
-- PHASE 3.8: FULL-TEXT SEARCH
-- Smart Hostel Maintenance Platform
-- MySQL 8.4
-- ============================================================

-- Create a FULLTEXT index across complaint titles and descriptions.

ALTER TABLE complaints
ADD FULLTEXT INDEX ft_complaints_title_description (
    title,
    description
);
