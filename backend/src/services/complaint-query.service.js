const pool = require("../config/database");
const { ComplaintError } = require("./complaint.service");

async function listStudentComplaints(user, options = {}) {
    const userId = Number(user?.user_id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new ComplaintError("Authenticated user identity is required", 401);
    }

    const page = options.page === undefined ? 1 : Number(options.page);
    const limit = options.limit === undefined ? 10 : Number(options.limit);

    if (!Number.isSafeInteger(page) || page < 1) {
        throw new ComplaintError("page must be a positive integer");
    }

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
        throw new ComplaintError("limit must be an integer between 1 and 50");
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
        throw new ComplaintError("Requested page is too large");
    }

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

    const [countRows] = await pool.execute(`
        SELECT COUNT(*) AS total
        FROM complaints
        WHERE student_id = ?
    `, [studentId]);

    const total = Number(countRows[0].total);

    const [rows] = await pool.execute(`
        SELECT
            c.complaint_id,
            c.title,
            c.description,
            c.severity,
            c.urgency,
            c.status,
            c.submitted_at,
            c.resolved_at,
            c.updated_at,
            cc.category_name,
            h.hostel_name,
            r.room_number
        FROM complaints c
        INNER JOIN complaint_categories cc
            ON cc.category_id = c.category_id
        INNER JOIN hostels h
            ON h.hostel_id = c.hostel_id
        LEFT JOIN rooms r
            ON r.room_id = c.room_id
           AND r.hostel_id = c.hostel_id
        WHERE c.student_id = ?
        ORDER BY c.submitted_at DESC, c.complaint_id DESC
        LIMIT ? OFFSET ?
    `, [studentId, limit, offset]);

    return {
        complaints: rows,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };
}

module.exports = { listStudentComplaints };
