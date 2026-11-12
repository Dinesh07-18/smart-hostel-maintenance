const pool = require("../config/database");

class FeedbackError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "FeedbackError";
        this.statusCode = statusCode;
    }
}

async function submitFeedback(user, complaintId, rating, comments) {
    const userId = Number(user?.user_id);
    const id = Number(complaintId);

    if (!Number.isSafeInteger(userId) || userId <= 0)
        throw new FeedbackError("Authentication required", 401);

    if (!Number.isSafeInteger(id) || id <= 0)
        throw new FeedbackError("Invalid complaint ID");

    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw new FeedbackError("Rating must be an integer from 1 to 5");

    if (comments !== undefined && comments !== null &&
        (typeof comments !== "string" || comments.length > 5000)) {
        throw new FeedbackError("Comments must not exceed 5000 characters");
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [students] = await connection.execute(
            "SELECT student_id FROM student_profiles WHERE user_id = ? FOR UPDATE",
            [userId]
        );

        if (!students.length)
            throw new FeedbackError("Student profile not found", 403);

        const studentId = students[0].student_id;

        const [complaints] = await connection.execute(
            `SELECT complaint_id, status
               FROM complaints
              WHERE complaint_id = ? AND student_id = ?
              FOR UPDATE`,
            [id, studentId]
        );

        if (!complaints.length)
            throw new FeedbackError("Complaint not found", 404);

        if (!["RESOLVED", "CLOSED"].includes(complaints[0].status))
            throw new FeedbackError("Feedback is available only after complaint resolution", 409);

        const [existing] = await connection.execute(
            "SELECT feedback_id FROM feedback WHERE complaint_id = ? LIMIT 1",
            [id]
        );

        if (existing.length)
            throw new FeedbackError("Feedback has already been submitted for this complaint", 409);

        const [result] = await connection.execute(
            `INSERT INTO feedback (complaint_id, student_id, rating, comments)
             VALUES (?, ?, ?, ?)`,
            [id, studentId, rating, comments?.trim() || null]
        );

        await connection.commit();

        return {
            feedback_id: result.insertId,
            complaint_id: id,
            rating,
            comments: comments?.trim() || null
        };
    } catch (error) {
        await connection.rollback().catch(() => {});
        if (error.code === "ER_DUP_ENTRY")
            throw new FeedbackError("Feedback has already been submitted", 409);
        throw error;
    } finally {
        connection.release();
    }
}

async function listStudentFeedback(user) {
    const userId = Number(user?.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0)
        throw new FeedbackError("Authentication required", 401);

    const [rows] = await pool.execute(
        `SELECT f.feedback_id, f.complaint_id, f.rating, f.comments,
                f.submitted_at, c.title AS complaint_title, c.status AS complaint_status
           FROM feedback f
           JOIN complaints c ON c.complaint_id = f.complaint_id
           JOIN student_profiles sp ON sp.student_id = f.student_id
          WHERE sp.user_id = ?
          ORDER BY f.submitted_at DESC`,
        [userId]
    );

    return rows;
}

module.exports = { submitFeedback, listStudentFeedback, FeedbackError };