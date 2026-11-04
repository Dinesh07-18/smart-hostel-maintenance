DELIMITER //

DROP TRIGGER IF EXISTS trg_complaints_status_change //

CREATE TRIGGER trg_complaints_status_change
AFTER UPDATE ON complaints
FOR EACH ROW
BEGIN
    DECLARE v_actor_exists INT DEFAULT 0;

    IF NOT (OLD.status <=> NEW.status) THEN

        IF @app_user_id IS NULL OR @app_user_id <= 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Acting user ID is required';
        END IF;

        SELECT COUNT(*)
        INTO v_actor_exists
        FROM users
        WHERE user_id = @app_user_id;

        IF v_actor_exists = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Acting user does not exist';
        END IF;

        INSERT INTO complaint_events (
            complaint_id,
            performed_by,
            event_type,
            previous_status,
            new_status
        )
        VALUES (
            NEW.complaint_id,
            @app_user_id,
            'STATUS_CHANGED',
            OLD.status,
            NEW.status
        );

    END IF;
END //

DELIMITER ;
