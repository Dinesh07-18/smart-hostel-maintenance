const pool = require("../config/database");
const { ComplaintError } = require("./complaint.service");

async function getStudentComplaintDetails(user, complaintId) {
    const userId = Number(user?.user_id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new ComplaintError("Authenticated user identity is required", 401);
    }

    const id = Number(complaintId);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new ComplaintError("A valid complaint ID is required", 400);
    }

    // Verify that the authenticated account has a student profile.
    const [students] = await pool.execute(`
        SELECT student_id
        FROM student_profiles
        WHERE user_id = ?
    `, [userId]);

    if (students.length === 0) {
        throw new ComplaintError(
            "A student profile is not associated with this account",
            403
        );
    }

    const studentId = students[0].student_id;

    // Ownership is enforced directly in this query.
    const [complaints] = await pool.execute(`
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
            c.updated_at,
            cc.category_id,
            cc.category_name,
            h.hostel_id,
            h.hostel_name,
            r.room_id,
            r.room_number
        FROM complaints c
        INNER JOIN complaint_categories cc
            ON cc.category_id = c.category_id
        INNER JOIN hostels h
            ON h.hostel_id = c.hostel_id
        LEFT JOIN rooms r
            ON r.room_id = c.room_id
           AND r.hostel_id = c.hostel_id
        WHERE c.complaint_id = ?
          AND c.student_id = ?
        LIMIT 1
    `, [id, studentId]);

    if (complaints.length === 0) {
        throw new ComplaintError("Complaint not found", 404);
    }

    // Retrieve the complaint's chronological event timeline.
    const [events] = await pool.execute(`
        SELECT
            ce.event_id,
            ce.event_type,
            ce.previous_status,
            ce.new_status,
            ce.remarks,
            ce.created_at,
            u.full_name AS performed_by_name
        FROM complaint_events ce
        INNER JOIN users u
            ON u.user_id = ce.performed_by
        WHERE ce.complaint_id = ?
        ORDER BY ce.created_at ASC, ce.event_id ASC
    `, [id]);

    return {
        ...complaints[0],
        timeline: events
    };
}

module.exports = { getStudentComplaintDetails };