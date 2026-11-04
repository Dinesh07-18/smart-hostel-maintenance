DELIMITER //

CREATE PROCEDURE sp_get_hostel_complaints(
    IN p_hostel_id INT,
    IN p_status VARCHAR(30)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM hostels
        WHERE hostel_id = p_hostel_id
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid hostel ID';
    END IF;

    IF p_status IS NOT NULL AND p_status NOT IN (
        'SUBMITTED',
        'VERIFIED',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED',
        'REOPENED',
        'REJECTED'
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid complaint status';
    END IF;

    SELECT
        c.complaint_id,
        c.title,
        c.description,
        c.severity,
        c.urgency,
        c.status,
        cc.category_name,
        sp.registration_number,
        u.full_name AS student_name,
        h.hostel_name,
        c.room_id,
        c.submitted_at,
        c.resolved_at
    FROM complaints c
    JOIN complaint_categories cc
        ON c.category_id = cc.category_id
    JOIN student_profiles sp
        ON c.student_id = sp.student_id
    JOIN users u
        ON sp.user_id = u.user_id
    JOIN hostels h
        ON c.hostel_id = h.hostel_id
    WHERE c.hostel_id = p_hostel_id
      AND (p_status IS NULL OR c.status = p_status)
    ORDER BY c.submitted_at DESC;
END //

DELIMITER ;
