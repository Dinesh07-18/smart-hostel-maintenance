DELIMITER //

CREATE FUNCTION fn_complaint_waiting_hours(
    p_submitted_at DATETIME
)
RETURNS DECIMAL(10,2)
NOT DETERMINISTIC
NO SQL
BEGIN
    IF p_submitted_at IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN ROUND(
        TIMESTAMPDIFF(SECOND, p_submitted_at, CURRENT_TIMESTAMP) / 3600,
        2
    );
END //

CREATE FUNCTION fn_get_staff_active_assignments(
    p_staff_id INT
)
RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_assignment_count INT DEFAULT 0;

    IF p_staff_id IS NULL OR p_staff_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid staff ID';
    END IF;

    SELECT COUNT(*)
    INTO v_assignment_count
    FROM complaint_assignments
    WHERE staff_id = p_staff_id
      AND assignment_status = 'ACTIVE'
      AND unassigned_at IS NULL;

    RETURN v_assignment_count;
END //

DELIMITER ;
