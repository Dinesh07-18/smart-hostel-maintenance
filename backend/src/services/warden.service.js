const pool = require("../config/database");
const { ComplaintError } = require("./complaint.service");
const { refreshOpenComplaintPriorities } = require("./priority.service");

const VALID_STATUSES = [
    "SUBMITTED", "VERIFIED", "ASSIGNED", "IN_PROGRESS",
    "RESOLVED", "CLOSED", "REOPENED", "REJECTED"
];

function positiveId(value, fieldName) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new ComplaintError(`A valid ${fieldName} is required`);
    }
    return id;
}

function pagination(options = {}) {
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
    return { page, limit, offset };
}

async function assertHostelAccess(executor, user, hostelId) {
    if (user.role === "ADMINISTRATOR") return;
    const [rows] = await executor.execute(`
        SELECT 1
        FROM warden_assignments
        WHERE user_id = ?
          AND hostel_id = ?
          AND is_active = 1
          AND start_date <= CURRENT_DATE()
          AND (end_date IS NULL OR end_date >= CURRENT_DATE())
        LIMIT 1
    `, [user.user_id, hostelId]);
    if (!rows.length) {
        throw new ComplaintError("You are not assigned to this hostel", 403);
    }
}

async function listWardenComplaints(user, options = {}) {
    const userId = positiveId(user?.user_id, "authenticated user ID");
    const { page, limit, offset } = pagination(options);
    const status = options.status === undefined || options.status === ""
        ? null : String(options.status).toUpperCase();

    if (status && !VALID_STATUSES.includes(status)) {
        throw new ComplaintError("Invalid complaint status filter");
    }

    // Re-score unresolved complaints at most once per hour so waiting time affects queue order.
    await refreshOpenComplaintPriorities();

    const scopeJoin = user.role === "ADMINISTRATOR"
        ? ""
        : `INNER JOIN warden_assignments wa
               ON wa.hostel_id = c.hostel_id
              AND wa.user_id = ?
              AND wa.is_active = 1
              AND wa.start_date <= CURRENT_DATE()
              AND (wa.end_date IS NULL OR wa.end_date >= CURRENT_DATE())`;
    const scopeParams = user.role === "ADMINISTRATOR" ? [] : [userId];

    const [countRows] = await pool.execute(`
        SELECT COUNT(DISTINCT c.complaint_id) AS total
        FROM complaints c
        ${scopeJoin}
        WHERE (? IS NULL OR c.status = ?)
    `, [...scopeParams, status, status]);

    const [rows] = await pool.execute(`
        SELECT
            c.complaint_id, c.title, c.description, c.severity, c.urgency,
            c.status, c.submitted_at, c.resolved_at, c.updated_at,
            cc.category_id, cc.category_name,
            h.hostel_id, h.hostel_name,
            r.room_id, r.room_number,
            student.user_id AS student_user_id,
            student.full_name AS student_name,
            student.email AS student_email,
            latest_priority.total_priority_score,
            latest_priority.priority_level,
            assigned_staff.full_name AS assigned_staff_name
        FROM complaints c
        ${scopeJoin}
        INNER JOIN student_profiles sp ON sp.student_id = c.student_id
        INNER JOIN users student ON student.user_id = sp.user_id
        INNER JOIN complaint_categories cc ON cc.category_id = c.category_id
        INNER JOIN hostels h ON h.hostel_id = c.hostel_id
        LEFT JOIN rooms r ON r.room_id = c.room_id AND r.hostel_id = c.hostel_id
        LEFT JOIN (
            SELECT cps1.complaint_id, cps1.total_priority_score, cps1.priority_level
            FROM complaint_priority_snapshots cps1
            INNER JOIN (
                SELECT complaint_id, MAX(calculated_at) AS latest_at
                FROM complaint_priority_snapshots
                GROUP BY complaint_id
            ) latest ON latest.complaint_id = cps1.complaint_id
                   AND latest.latest_at = cps1.calculated_at
        ) latest_priority ON latest_priority.complaint_id = c.complaint_id
        LEFT JOIN (
            SELECT ca1.*
            FROM complaint_assignments ca1
            INNER JOIN (
                SELECT complaint_id, MAX(assignment_id) AS latest_assignment_id
                FROM complaint_assignments
                GROUP BY complaint_id
            ) latest_assignment
                ON latest_assignment.latest_assignment_id = ca1.assignment_id
        ) ca ON ca.complaint_id = c.complaint_id
        LEFT JOIN maintenance_staff_profiles msp ON msp.staff_id = ca.staff_id
        LEFT JOIN users assigned_staff ON assigned_staff.user_id = msp.user_id
        WHERE (? IS NULL OR c.status = ?)
        ORDER BY
            CASE latest_priority.priority_level
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                WHEN 'LOW' THEN 4
                ELSE 5
            END,
            c.submitted_at ASC,
            c.complaint_id ASC
        LIMIT ? OFFSET ?
    `, [...scopeParams, status, status, limit, offset]);

    const total = Number(countRows[0].total);
    return {
        complaints: rows,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    };
}

async function listAssignableStaff(user, hostelIdValue) {
    const hostelId = positiveId(hostelIdValue, "hostel ID");
    await assertHostelAccess(pool, user, hostelId);

    const [rows] = await pool.execute(`
        SELECT
            msp.staff_id,
            u.user_id,
            u.full_name,
            u.email,
            msp.employee_code,
            msp.availability_status,
            GROUP_CONCAT(DISTINCT ms.specialization_name ORDER BY ms.specialization_name SEPARATOR ', ') AS specializations,
            COUNT(DISTINCT CASE
                WHEN ca.assignment_status = 'ACTIVE' AND ca.unassigned_at IS NULL
                THEN ca.complaint_id
            END) AS active_complaint_count
        FROM staff_hostel_assignments sha
        INNER JOIN maintenance_staff_profiles msp ON msp.staff_id = sha.staff_id
        INNER JOIN users u ON u.user_id = msp.user_id
        LEFT JOIN staff_specializations ss ON ss.staff_id = msp.staff_id
        LEFT JOIN maintenance_specializations ms ON ms.specialization_id = ss.specialization_id
        LEFT JOIN complaint_assignments ca ON ca.staff_id = msp.staff_id
        WHERE sha.hostel_id = ?
          AND sha.is_active = 1
          AND sha.start_date <= CURRENT_DATE()
          AND (sha.end_date IS NULL OR sha.end_date >= CURRENT_DATE())
          AND u.account_status = 'ACTIVE'
        GROUP BY msp.staff_id, u.user_id, u.full_name, u.email,
                 msp.employee_code, msp.availability_status
        ORDER BY
            CASE msp.availability_status
                WHEN 'AVAILABLE' THEN 1
                WHEN 'BUSY' THEN 2
                ELSE 3
            END,
            active_complaint_count ASC,
            u.full_name ASC
    `, [hostelId]);

    return rows;
}

function validateAssignmentData(data = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new ComplaintError("Request body must be a JSON object", 400);
    }

    if (
        data.remarks !== undefined &&
        data.remarks !== null &&
        typeof data.remarks !== "string"
    ) {
        throw new ComplaintError("Remarks must be a string", 400);
    }

    if (typeof data.remarks === "string" && data.remarks.length > 2000) {
        throw new ComplaintError("Remarks cannot exceed 2000 characters", 400);
    }

    return data;
}
async function assignComplaint(user, complaintIdValue, data = {}) {
    data = validateAssignmentData(data);
    const userId = positiveId(user?.user_id, "authenticated user ID");
    const complaintId = positiveId(complaintIdValue, "complaint ID");
    const staffId = positiveId(data.staff_id, "staff ID");
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [complaints] = await connection.execute(`
            SELECT c.complaint_id, c.hostel_id, c.status
            FROM complaints c
            WHERE c.complaint_id = ?
            FOR UPDATE
        `, [complaintId]);

        if (!complaints.length) {
            throw new ComplaintError("Complaint not found", 404);
        }

        const complaint = complaints[0];
        await assertHostelAccess(connection, user, complaint.hostel_id);

        if (!["SUBMITTED", "VERIFIED", "REOPENED"].includes(complaint.status)) {
            throw new ComplaintError(
                `Complaint cannot be assigned while its status is ${complaint.status}`,
                409
            );
        }

        const [staffRows] = await connection.execute(`
            SELECT
                msp.staff_id,
                msp.availability_status,
                sha.staff_hostel_assignment_id
            FROM maintenance_staff_profiles msp
            INNER JOIN users u ON u.user_id = msp.user_id
            INNER JOIN staff_hostel_assignments sha ON sha.staff_id = msp.staff_id
            WHERE msp.staff_id = ?
              AND sha.hostel_id = ?
              AND sha.is_active = 1
              AND sha.start_date <= CURRENT_DATE()
              AND (sha.end_date IS NULL OR sha.end_date >= CURRENT_DATE())
              AND u.account_status = 'ACTIVE'
            LIMIT 1
            FOR UPDATE
        `, [staffId, complaint.hostel_id]);

        if (!staffRows.length) {
            throw new ComplaintError("Staff member is not actively assigned to this hostel", 400);
        }
        if (staffRows[0].availability_status !== "AVAILABLE") {
            throw new ComplaintError(
                `Selected staff member is not available (current status: ${staffRows[0].availability_status})`,
                409
            );
        }

        const [activeAssignments] = await connection.execute(`
            SELECT assignment_id
            FROM complaint_assignments
            WHERE complaint_id = ?
              AND assignment_status = 'ACTIVE'
              AND unassigned_at IS NULL
            LIMIT 1
            FOR UPDATE
        `, [complaintId]);

        if (activeAssignments.length) {
            throw new ComplaintError("Complaint already has an active assignment", 409);
        }

        await connection.execute(`
            INSERT INTO complaint_assignments (
                complaint_id, hostel_id, staff_id,
                staff_hostel_assignment_id, assigned_by
            ) VALUES (?, ?, ?, ?, ?)
        `, [
            complaintId,
            complaint.hostel_id,
            staffId,
            staffRows[0].staff_hostel_assignment_id,
            userId
        ]);

        await connection.execute("SET @app_user_id = ?", [userId]);
        await connection.execute(`
            UPDATE complaints
            SET status = 'ASSIGNED', updated_at = NOW()
            WHERE complaint_id = ?
        `, [complaintId]);

        await connection.execute(`
            INSERT INTO complaint_events (
                complaint_id, performed_by, event_type,
                previous_status, new_status, remarks
            ) VALUES (?, ?, 'COMPLAINT_ASSIGNED', ?, 'ASSIGNED', ?)
        `, [
            complaintId,
            userId,
            complaint.status,
            data.remarks?.trim() || "Complaint assigned to maintenance staff"
        ]);

        await connection.commit();
        return {
            complaint_id: complaintId,
            hostel_id: complaint.hostel_id,
            staff_id: staffId,
            previous_status: complaint.status,
            status: "ASSIGNED"
        };
    } catch (error) {
        try { await connection.rollback(); } catch (rollbackError) {
            console.error("Assignment rollback failed:", rollbackError.message);
        }
        throw error;
    } finally {
        try { await connection.execute("SET @app_user_id = NULL"); } catch (error) {
            console.error("Failed to clear audit session variable:", error.message);
        }
        connection.release();
    }
}

module.exports = {
    listWardenComplaints,
    listAssignableStaff,
    assignComplaint,
    pagination,
    positiveId,
    validateAssignmentData
};
