CREATE OR REPLACE VIEW vw_complaint_details AS
SELECT
    c.complaint_id,
    c.title,
    c.description,
    c.severity,
    c.urgency,
    c.status,
    c.submitted_at,
    c.resolved_at,
    c.closed_at,
    sp.student_id,
    sp.registration_number,
    u.full_name AS student_name,
    u.email AS student_email,
    h.hostel_id,
    h.hostel_name,
    h.hostel_code,
    cc.category_id,
    cc.category_name,
    c.room_id
FROM complaints c
JOIN student_profiles sp ON c.student_id = sp.student_id
JOIN users u ON sp.user_id = u.user_id
JOIN hostels h ON c.hostel_id = h.hostel_id
JOIN complaint_categories cc ON c.category_id = cc.category_id;

CREATE OR REPLACE VIEW vw_complaint_assignment_details AS
SELECT
    ca.assignment_id,
    ca.complaint_id,
    c.title AS complaint_title,
    c.severity,
    c.urgency,
    c.status AS complaint_status,
    ca.staff_id,
    ms.employee_code,
    u.full_name AS staff_name,
    ms.employment_type,
    ms.availability_status,
    ca.hostel_id,
    h.hostel_name,
    ca.assigned_by,
    ca.assigned_at,
    ca.unassigned_at,
    ca.assignment_status
FROM complaint_assignments ca
JOIN complaints c ON ca.complaint_id = c.complaint_id
JOIN maintenance_staff_profiles ms ON ca.staff_id = ms.staff_id
JOIN users u ON ms.user_id = u.user_id
JOIN hostels h ON ca.hostel_id = h.hostel_id;

CREATE OR REPLACE VIEW vw_complaint_status_history AS
SELECT
    ce.event_id,
    ce.complaint_id,
    c.title AS complaint_title,
    ce.event_type,
    ce.previous_status,
    ce.new_status,
    ce.remarks,
    ce.performed_by,
    u.full_name AS performed_by_name,
    r.role_name AS performed_by_role,
    ce.created_at AS event_timestamp
FROM complaint_events ce
JOIN complaints c ON ce.complaint_id = c.complaint_id
JOIN users u ON ce.performed_by = u.user_id
JOIN roles r ON u.role_id = r.role_id;
