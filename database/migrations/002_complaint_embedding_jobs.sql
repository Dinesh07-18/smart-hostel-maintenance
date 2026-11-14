CREATE TABLE IF NOT EXISTS complaint_embedding_jobs (
    job_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    complaint_id INT NOT NULL,
    status ENUM('PENDING','PROCESSING','RETRY','COMPLETED','FAILED') NOT NULL DEFAULT 'PENDING',
    attempt_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 6,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_expires_at DATETIME DEFAULT NULL,
    last_error TEXT DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (job_id),
    UNIQUE KEY uq_embedding_job_complaint (complaint_id),
    KEY idx_embedding_jobs_ready (status, next_attempt_at),
    KEY idx_embedding_jobs_lease (status, lease_expires_at),
    CONSTRAINT fk_embedding_job_complaint
        FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
