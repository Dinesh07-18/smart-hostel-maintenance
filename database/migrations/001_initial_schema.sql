-- Smart Hostel Maintenance & Complaint Prioritization Platform
-- Migration: 001_initial_schema.sql
-- Target: MySQL 8.4 LTS
-- Source of truth: docs/08_relational_schema.md
--
-- IMPORTANT:
-- Select smart_hostel_maintenance before running this file.
-- This creates the 22 approved relational tables. It does not create Qdrant
-- collections or store vectors. Cross-row/time-dependent rules need
-- transactional application logic and/or dedicated triggers.
-- This migration is non-destructive and is not intended to be rerun.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE roles (
    role_id INT NOT NULL AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id),
    CONSTRAINT uq_roles_role_name UNIQUE (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    role_id INT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    account_status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email UNIQUE (email),
    KEY idx_users_role_id (role_id),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE hostels (
    hostel_id INT NOT NULL AUTO_INCREMENT,
    hostel_name VARCHAR(120) NOT NULL,
    hostel_code VARCHAR(30) NOT NULL,
    address VARCHAR(255) NOT NULL,
    hostel_type VARCHAR(30) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (hostel_id),
    CONSTRAINT uq_hostels_hostel_code UNIQUE (hostel_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE rooms (
    room_id INT NOT NULL AUTO_INCREMENT,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor_number INT NOT NULL,
    capacity INT NOT NULL,
    room_status ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id),
    CONSTRAINT uq_rooms_hostel_room_number UNIQUE (hostel_id, room_number),
    CONSTRAINT uq_rooms_room_hostel UNIQUE (room_id, hostel_id),
    CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
    CONSTRAINT chk_rooms_floor_number CHECK (floor_number >= 0),
    KEY idx_rooms_hostel_id (hostel_id),
    CONSTRAINT fk_rooms_hostel FOREIGN KEY (hostel_id) REFERENCES hostels (hostel_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE student_profiles (
    student_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    registration_number VARCHAR(40) NOT NULL,
    department VARCHAR(100) NULL,
    course VARCHAR(100) NULL,
    admission_year YEAR NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id),
    CONSTRAINT uq_student_profiles_user_id UNIQUE (user_id),
    CONSTRAINT uq_student_profiles_registration_number UNIQUE (registration_number),
    CONSTRAINT fk_student_profiles_user FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE maintenance_staff_profiles (
    staff_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    employee_code VARCHAR(40) NOT NULL,
    employment_type VARCHAR(40) NULL,
    availability_status ENUM('AVAILABLE', 'BUSY', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id),
    CONSTRAINT uq_maintenance_staff_user_id UNIQUE (user_id),
    CONSTRAINT uq_maintenance_staff_employee_code UNIQUE (employee_code),
    CONSTRAINT fk_maintenance_staff_user FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE warden_assignments (
    warden_assignment_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    hostel_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (warden_assignment_id),
    CONSTRAINT chk_warden_assignment_dates CHECK (end_date IS NULL OR end_date >= start_date),
    KEY idx_warden_assignments_user_id (user_id),
    KEY idx_warden_assignments_hostel_id (hostel_id),
    CONSTRAINT fk_warden_assignments_user FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_warden_assignments_hostel FOREIGN KEY (hostel_id) REFERENCES hostels (hostel_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE student_room_history (
    room_history_id INT NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    room_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    active_student_id INT GENERATED ALWAYS AS (
        CASE WHEN is_active = TRUE THEN student_id ELSE NULL END
    ) STORED,
    PRIMARY KEY (room_history_id),
    CONSTRAINT uq_student_room_history_active_student UNIQUE (active_student_id),
    CONSTRAINT chk_student_room_history_dates CHECK (end_date IS NULL OR end_date >= start_date),
    KEY idx_student_room_history_student_id (student_id),
    KEY idx_student_room_history_hostel_id (hostel_id),
    KEY idx_student_room_history_room_hostel (room_id, hostel_id),
    CONSTRAINT fk_student_room_history_student FOREIGN KEY (student_id)
        REFERENCES student_profiles (student_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_student_room_history_hostel FOREIGN KEY (hostel_id)
        REFERENCES hostels (hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_student_room_history_room_hostel FOREIGN KEY (room_id, hostel_id)
        REFERENCES rooms (room_id, hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaint_categories (
    category_id INT NOT NULL AUTO_INCREMENT,
    category_name VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (category_id),
    CONSTRAINT uq_complaint_categories_name UNIQUE (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE maintenance_specializations (
    specialization_id INT NOT NULL AUTO_INCREMENT,
    specialization_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (specialization_id),
    CONSTRAINT uq_maintenance_specializations_name UNIQUE (specialization_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE staff_specializations (
    staff_specialization_id INT NOT NULL AUTO_INCREMENT,
    staff_id INT NOT NULL,
    specialization_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_specialization_id),
    CONSTRAINT uq_staff_specializations_staff_specialization UNIQUE (staff_id, specialization_id),
    KEY idx_staff_specializations_specialization_id (specialization_id),
    CONSTRAINT fk_staff_specializations_staff FOREIGN KEY (staff_id)
        REFERENCES maintenance_staff_profiles (staff_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_staff_specializations_specialization FOREIGN KEY (specialization_id)
        REFERENCES maintenance_specializations (specialization_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE staff_hostel_assignments (
    staff_hostel_assignment_id INT NOT NULL AUTO_INCREMENT,
    staff_id INT NOT NULL,
    hostel_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (staff_hostel_assignment_id),
    CONSTRAINT uq_staff_hostel_assignment_composite
        UNIQUE (staff_hostel_assignment_id, staff_id, hostel_id),
    CONSTRAINT chk_staff_hostel_assignment_dates CHECK (end_date IS NULL OR end_date >= start_date),
    KEY idx_staff_hostel_assignments_staff_id (staff_id),
    KEY idx_staff_hostel_assignments_hostel_id (hostel_id),
    CONSTRAINT fk_staff_hostel_assignments_staff FOREIGN KEY (staff_id)
        REFERENCES maintenance_staff_profiles (staff_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_staff_hostel_assignments_hostel FOREIGN KEY (hostel_id)
        REFERENCES hostels (hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaints (
    complaint_id INT NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    room_id INT NULL,
    category_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    status ENUM('SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED', 'REJECTED')
        NOT NULL DEFAULT 'SUBMITTED',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL,
    closed_at DATETIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (complaint_id),
    CONSTRAINT uq_complaints_complaint_student UNIQUE (complaint_id, student_id),
    CONSTRAINT uq_complaints_complaint_hostel UNIQUE (complaint_id, hostel_id),
    KEY idx_complaints_student_id (student_id),
    KEY idx_complaints_hostel_id (hostel_id),
    KEY idx_complaints_category_id (category_id),
    KEY idx_complaints_status (status),
    KEY idx_complaints_submitted_at (submitted_at),
    KEY idx_complaints_room_hostel (room_id, hostel_id),
    CONSTRAINT fk_complaints_student FOREIGN KEY (student_id)
        REFERENCES student_profiles (student_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaints_hostel FOREIGN KEY (hostel_id)
        REFERENCES hostels (hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaints_room_hostel FOREIGN KEY (room_id, hostel_id)
        REFERENCES rooms (room_id, hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaints_category FOREIGN KEY (category_id)
        REFERENCES complaint_categories (category_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaint_assignments (
    assignment_id INT NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    hostel_id INT NOT NULL,
    staff_id INT NOT NULL,
    staff_hostel_assignment_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at DATETIME NULL,
    assignment_status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    active_complaint_id INT GENERATED ALWAYS AS (
        CASE WHEN assignment_status = 'ACTIVE' THEN complaint_id ELSE NULL END
    ) STORED,
    PRIMARY KEY (assignment_id),
    CONSTRAINT uq_complaint_assignments_active_complaint UNIQUE (active_complaint_id),
    CONSTRAINT chk_complaint_assignments_dates CHECK (unassigned_at IS NULL OR unassigned_at >= assigned_at),
    CONSTRAINT chk_complaint_assignments_status_timestamp CHECK (
        (assignment_status = 'ACTIVE' AND unassigned_at IS NULL)
        OR (assignment_status IN ('COMPLETED', 'CANCELLED') AND unassigned_at IS NOT NULL)
    ),
    KEY idx_complaint_assignments_complaint_id (complaint_id),
    KEY idx_complaint_assignments_staff_id (staff_id),
    KEY idx_complaint_assignments_staff_hostel_assignment (staff_hostel_assignment_id, staff_id, hostel_id),
    KEY idx_complaint_assignments_assigned_by (assigned_by),
    CONSTRAINT fk_complaint_assignments_complaint_hostel FOREIGN KEY (complaint_id, hostel_id)
        REFERENCES complaints (complaint_id, hostel_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaint_assignments_staff_hostel FOREIGN KEY (staff_hostel_assignment_id, staff_id, hostel_id)
        REFERENCES staff_hostel_assignments (staff_hostel_assignment_id, staff_id, hostel_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaint_assignments_assigned_by FOREIGN KEY (assigned_by)
        REFERENCES users (user_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaint_events (
    event_id INT NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    performed_by INT NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    previous_status VARCHAR(30) NULL,
    new_status VARCHAR(30) NULL,
    remarks TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    KEY idx_complaint_events_complaint_id (complaint_id),
    KEY idx_complaint_events_performed_by (performed_by),
    CONSTRAINT fk_complaint_events_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaint_events_user FOREIGN KEY (performed_by)
        REFERENCES users (user_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE priority_policies (
    policy_id INT NOT NULL AUTO_INCREMENT,
    policy_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    version VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from DATETIME NOT NULL,
    effective_until DATETIME NULL,
    PRIMARY KEY (policy_id),
    CONSTRAINT chk_priority_policies_effective_dates
        CHECK (effective_until IS NULL OR effective_until >= effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE priority_policy_factors (
    factor_id INT NOT NULL AUTO_INCREMENT,
    policy_id INT NOT NULL,
    factor_name VARCHAR(80) NOT NULL,
    factor_weight DECIMAL(6,3) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (factor_id),
    CONSTRAINT uq_priority_policy_factors_policy_factor UNIQUE (policy_id, factor_name),
    CONSTRAINT chk_priority_policy_factors_weight CHECK (factor_weight >= 0 AND factor_weight <= 1),
    CONSTRAINT fk_priority_policy_factors_policy FOREIGN KEY (policy_id)
        REFERENCES priority_policies (policy_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaint_priority_snapshots (
    snapshot_id INT NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    policy_id INT NOT NULL,
    severity_score DECIMAL(8,3) NOT NULL,
    urgency_score DECIMAL(8,3) NOT NULL,
    waiting_time_score DECIMAL(8,3) NOT NULL,
    total_priority_score DECIMAL(10,3) NOT NULL,
    priority_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (snapshot_id),
    CONSTRAINT chk_priority_snapshot_severity_score CHECK (severity_score >= 0),
    CONSTRAINT chk_priority_snapshot_urgency_score CHECK (urgency_score >= 0),
    CONSTRAINT chk_priority_snapshot_waiting_score CHECK (waiting_time_score >= 0),
    CONSTRAINT chk_priority_snapshot_total_score CHECK (total_priority_score >= 0),
    KEY idx_priority_snapshots_complaint_id (complaint_id),
    KEY idx_priority_snapshots_policy_id (policy_id),
    CONSTRAINT fk_priority_snapshots_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_priority_snapshots_policy FOREIGN KEY (policy_id)
        REFERENCES priority_policies (policy_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE embedding_models (
    model_id INT NOT NULL AUTO_INCREMENT,
    model_name VARCHAR(150) NOT NULL,
    model_version VARCHAR(80) NOT NULL,
    vector_dimension INT NOT NULL,
    qdrant_collection VARCHAR(120) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (model_id),
    CONSTRAINT chk_embedding_models_vector_dimension CHECK (vector_dimension > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE complaint_embedding_references (
    embedding_reference_id INT NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    model_id INT NOT NULL,
    qdrant_point_id VARCHAR(100) NOT NULL,
    collection_name VARCHAR(120) NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (embedding_reference_id),
    CONSTRAINT uq_complaint_embedding_qdrant_point UNIQUE (qdrant_point_id),
    CONSTRAINT uq_complaint_embedding_complaint_model UNIQUE (complaint_id, model_id),
    KEY idx_complaint_embedding_model_id (model_id),
    CONSTRAINT fk_complaint_embedding_complaint FOREIGN KEY (complaint_id)
        REFERENCES complaints (complaint_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_complaint_embedding_model FOREIGN KEY (model_id)
        REFERENCES embedding_models (model_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE feedback (
    feedback_id INT NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    student_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comments TEXT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (feedback_id),
    CONSTRAINT uq_feedback_complaint_id UNIQUE (complaint_id),
    CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
    KEY idx_feedback_student_id (student_id),
    CONSTRAINT fk_feedback_complaint_student FOREIGN KEY (complaint_id, student_id)
        REFERENCES complaints (complaint_id, student_id) ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
    audit_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(80) NOT NULL,
    entity_id VARCHAR(80) NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id),
    KEY idx_audit_logs_user_id (user_id),
    KEY idx_audit_logs_created_at (created_at),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- End of migration: 22 tables.
