const pool = require("../config/database");

class ComplaintError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "ComplaintError";
        this.statusCode = statusCode;
    }
}

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

async function createComplaint(user, data) {
    const {
        category_id,
        room_id = null,
        title,
        description,
        severity,
        urgency
    } = data;

    // Validate authenticated identity.
    const userId = Number(user?.user_id);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new ComplaintError("Authenticated user identity is required", 401);
    }

    // Validate request fields.
    const categoryId = Number(category_id);

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
        throw new ComplaintError("A valid category_id is required");
    }

    if (typeof title !== "string" || !title.trim() || title.trim().length > 150) {
        throw new ComplaintError("Title is required and must not exceed 150 characters");
    }

    if (
        typeof description !== "string" ||
        !description.trim() ||
        description.trim().length > 5000
    ) {
        throw new ComplaintError("Description is required and must not exceed 5000 characters");
    }

    if (!VALID_SEVERITIES.includes(severity)) {
        throw new ComplaintError("Invalid severity value");
    }

    if (!VALID_URGENCIES.includes(urgency)) {
        throw new ComplaintError("Invalid urgency value");
    }

    if (
        room_id !== null &&
        (!Number.isSafeInteger(Number(room_id)) || Number(room_id) <= 0)
    ) {
        throw new ComplaintError("room_id must be a positive integer or null");
    }

    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;

        // Lock and retrieve the authenticated user's student profile.
        const [students] = await connection.execute(`
            SELECT student_id
            FROM student_profiles
            WHERE user_id = ?
            FOR UPDATE
        `, [userId]);

        if (students.length === 0) {
            throw new ComplaintError(
                "A student profile is not associated with this account",
                403
            );
        }

        const studentId = students[0].student_id;

        // Lock and retrieve the student's current hostel and room assignment.
        const [assignments] = await connection.execute(`
            SELECT
                student_id,
                hostel_id,
                room_id
            FROM student_room_history
            WHERE student_id = ?
              AND is_active = 1
              AND start_date <= NOW()
              AND (end_date IS NULL OR end_date >= NOW())
            FOR UPDATE
        `, [studentId]);

        if (assignments.length === 0) {
            throw new ComplaintError(
                "No active hostel assignment found for this student",
                403
            );
        }

        if (assignments.length > 1) {
            throw new ComplaintError(
                "Multiple active hostel assignments found; contact an administrator",
                409
            );
        }

        const assignment = assignments[0];

        // A supplied room must match the student's current room.
        if (
            room_id !== null &&
            Number(room_id) !== assignment.room_id
        ) {
            throw new ComplaintError(
                "The selected room does not match your current room assignment",
                403
            );
        }

        // Verify that the complaint category is active.
        const [categories] = await connection.execute(`
            SELECT category_id
            FROM complaint_categories
            WHERE category_id = ?
              AND is_active = 1
            FOR SHARE
        `, [categoryId]);

        if (categories.length === 0) {
            throw new ComplaintError("Invalid or inactive complaint category");
        }

        // Create the complaint using the authenticated student's current assignment.
        const [result] = await connection.execute(`
            INSERT INTO complaints (
                student_id,
                hostel_id,
                room_id,
                category_id,
                title,
                description,
                severity,
                urgency
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            assignment.student_id,
            assignment.hostel_id,
            assignment.room_id,
            categoryId,
            title.trim(),
            description.trim(),
            severity,
            urgency
        ]);

        const complaintId = result.insertId;

        // Record the initial complaint event.
        await connection.execute(`
            INSERT INTO complaint_events (
                complaint_id,
                performed_by,
                event_type,
                previous_status,
                new_status,
                remarks
            )
            VALUES (?, ?, 'COMPLAINT_CREATED', NULL, 'SUBMITTED', ?)
        `, [
            complaintId,
            userId,
            "Complaint submitted"
        ]);

        await connection.commit();
        transactionStarted = false;

        return {
            complaint_id: complaintId,
            student_id: assignment.student_id,
            hostel_id: assignment.hostel_id,
            room_id: assignment.room_id,
            category_id: categoryId,
            title: title.trim(),
            severity,
            urgency,
            status: "SUBMITTED"
        };

    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Complaint transaction rollback failed:", rollbackError.message);
            }
        }

        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    createComplaint,
    ComplaintError
};
