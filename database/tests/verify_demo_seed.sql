-- Read-only verification for the documented demo seed. Run after migrations,
-- reference seed and backend/scripts/seed-demo.js. No data is modified.
USE smart_hostel_maintenance;

SELECT h.hostel_code, h.hostel_name, COUNT(DISTINCT r.room_id) AS room_count,
       COUNT(DISTINCT CASE WHEN srh.is_active=1 THEN srh.student_id END) AS active_students
FROM hostels h
LEFT JOIN rooms r ON r.hostel_id=h.hostel_id
LEFT JOIN student_room_history srh ON srh.room_id=r.room_id AND srh.hostel_id=r.hostel_id
WHERE h.hostel_code IN ('DEMO-NORTH','DEMO-CENTRAL','DEMO-SOUTH')
GROUP BY h.hostel_id, h.hostel_code, h.hostel_name
ORDER BY h.hostel_code;

SELECT r.room_number, h.hostel_code, COUNT(srh.student_id) AS active_occupants,
       r.capacity, (COUNT(srh.student_id) <= r.capacity) AS within_capacity
FROM rooms r
JOIN hostels h ON h.hostel_id=r.hostel_id
LEFT JOIN student_room_history srh
  ON srh.room_id=r.room_id AND srh.hostel_id=r.hostel_id
 AND srh.is_active=1 AND srh.start_date<=NOW()
 AND (srh.end_date IS NULL OR srh.end_date>=NOW())
WHERE h.hostel_code LIKE 'DEMO-%'
GROUP BY r.room_id, r.room_number, h.hostel_code, r.capacity
ORDER BY h.hostel_code, r.room_number;

SELECT r.role_name, COUNT(*) AS active_demo_accounts
FROM users u JOIN roles r ON r.role_id=u.role_id
WHERE u.email LIKE '%@demo.hostel.test' AND u.account_status='ACTIVE'
GROUP BY r.role_name ORDER BY r.role_name;

SELECT COUNT(*) AS demo_complaints,
       (COUNT(*) = 12) AS expected_twelve_complaints_present
FROM complaints c
JOIN student_profiles sp ON sp.student_id=c.student_id
JOIN users u ON u.user_id=sp.user_id
WHERE u.email LIKE 'student%@demo.hostel.test';

SELECT COUNT(*) AS queued_demo_embeddings
FROM complaint_embedding_jobs j
JOIN complaints c ON c.complaint_id=j.complaint_id
JOIN student_profiles sp ON sp.student_id=c.student_id
JOIN users u ON u.user_id=sp.user_id
WHERE u.email LIKE 'student%@demo.hostel.test';
