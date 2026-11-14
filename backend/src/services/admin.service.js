const pool = require("../config/database");
const bcrypt = require("bcryptjs");

const VALID_ROLES = [
    "STUDENT",
    "MAINTENANCE_STAFF",
    "WARDEN",
    "ADMINISTRATOR"
];

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];

class AdminError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = "AdminError";
        this.statusCode = statusCode;
    }
}

function positiveId(value, fieldName) {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new AdminError(`A valid ${fieldName} is required`);
    }

    return id;
}

function pagination(options = {}) {
    const page = options.page === undefined ? 1 : Number(options.page);
    const limit = options.limit === undefined ? 20 : Number(options.limit);

    if (!Number.isSafeInteger(page) || page < 1) {
        throw new AdminError("page must be a positive integer");
    }

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
        throw new AdminError("limit must be an integer between 1 and 50");
    }

    const offset = (page - 1) * limit;

    if (!Number.isSafeInteger(offset)) {
        throw new AdminError("Requested page is too large");
    }

    return { page, limit, offset };
}

function buildUserFilters(options = {}) {
    const conditions = [];
    const params = [];

    const role = options.role === undefined || options.role === ""
        ? null
        : String(options.role).trim().toUpperCase();

    const status = options.status === undefined || options.status === ""
        ? null
        : String(options.status).trim().toUpperCase();

    const search = options.search === undefined
        ? ""
        : String(options.search).trim();

    if (role && !VALID_ROLES.includes(role)) {
        throw new AdminError("Invalid role filter");
    }

    if (status && !VALID_STATUSES.includes(status)) {
        throw new AdminError("Invalid account status filter");
    }

    if (search.length > 100) {
        throw new AdminError("Search query cannot exceed 100 characters");
    }

    if (role) {
        conditions.push("r.role_name = ?");
        params.push(role);
    }

    if (status) {
        conditions.push("u.account_status = ?");
        params.push(status);
    }

    if (search) {
        conditions.push("(u.full_name LIKE ? OR u.email LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }

    return {
        where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        params
    };
}

const USER_SELECT = `
    SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.account_status,
        u.created_at,
        u.updated_at,
        r.role_name,
        sp.registration_number,
        sp.department,
        sp.course,
        msp.employee_code,
        msp.employment_type,
        msp.availability_status
    FROM users u
    INNER JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN student_profiles sp ON sp.user_id = u.user_id
    LEFT JOIN maintenance_staff_profiles msp ON msp.user_id = u.user_id
`;

async function listUsers(options = {}) {
    const { page, limit, offset } = pagination(options);
    const { where, params } = buildUserFilters(options);

    const [countRows] = await pool.execute(`
        SELECT COUNT(*) AS total
        FROM users u
        INNER JOIN roles r ON r.role_id = u.role_id
        ${where}
    `, params);

    const [rows] = await pool.execute(`
        ${USER_SELECT}
        ${where}
        ORDER BY u.created_at DESC, u.user_id DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const total = Number(countRows[0].total);

    return {
        users: rows,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };
}

async function listHostels() {
    const [rows] = await pool.execute(
        "SELECT hostel_id, hostel_name, hostel_code FROM hostels ORDER BY hostel_name, hostel_id"
    );
    return rows;
}

async function listAvailableRooms(hostelIdValue) {
    const hostelId = positiveId(hostelIdValue, "hostel ID");
    const [rows] = await pool.execute(`
        SELECT r.room_id, r.room_number, r.floor_number, r.capacity, r.room_status,
               COUNT(srh.room_history_id) AS active_occupants,
               GREATEST(r.capacity - COUNT(srh.room_history_id), 0) AS available_beds
        FROM rooms r
        LEFT JOIN student_room_history srh
          ON srh.room_id = r.room_id AND srh.hostel_id = r.hostel_id AND srh.is_active = TRUE
        WHERE r.hostel_id = ?
        GROUP BY r.room_id, r.room_number, r.floor_number, r.capacity, r.room_status
        HAVING r.room_status <> 'MAINTENANCE' AND active_occupants < r.capacity
        ORDER BY r.floor_number, r.room_number
    `, [hostelId]);
    return rows;
}

async function getUserById(userIdValue) {
    const userId = positiveId(userIdValue, "user ID");

    const [rows] = await pool.execute(`
        ${USER_SELECT}
        WHERE u.user_id = ?
        LIMIT 1
    `, [userId]);

    if (!rows.length) {
        throw new AdminError("User not found", 404);
    }

    return rows[0];
}

function validateStatusData(data = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new AdminError("Request body must be a JSON object");
    }

    if (
        typeof data.account_status !== "string" ||
        !VALID_STATUSES.includes(data.account_status.trim().toUpperCase())
    ) {
        throw new AdminError(
            "account_status must be ACTIVE, INACTIVE or SUSPENDED"
        );
    }

    return {
        account_status: data.account_status.trim().toUpperCase()
    };
}

async function updateUserStatus(actor, targetIdValue, data = {}, ipAddress = null) {
    if (actor?.role !== "ADMINISTRATOR") {
        throw new AdminError("Administrator access required", 403);
    }
    const actorId = positiveId(actor?.user_id, "authenticated user ID");
    const targetId = positiveId(targetIdValue, "user ID");
    const validated = validateStatusData(data);
    const newStatus = validated.account_status;

    if (actorId === targetId && newStatus !== "ACTIVE") {
        throw new AdminError(
            "Administrators cannot deactivate or suspend their own account",
            403
        );
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Serialize account-status changes around administrator records.
        const [adminRows] = await connection.execute(`
            SELECT u.user_id, u.account_status
            FROM users u
            INNER JOIN roles r ON r.role_id = u.role_id
            WHERE r.role_name = 'ADMINISTRATOR'
            ORDER BY u.user_id
            FOR UPDATE
        `);

        const [targetRows] = await connection.execute(`
            SELECT u.user_id, u.account_status, r.role_name
            FROM users u
            INNER JOIN roles r ON r.role_id = u.role_id
            WHERE u.user_id = ?
            FOR UPDATE
        `, [targetId]);

        if (!targetRows.length) {
            throw new AdminError("User not found", 404);
        }

        const target = targetRows[0];

        if (
            target.role_name === "ADMINISTRATOR" &&
            target.account_status === "ACTIVE" &&
            newStatus !== "ACTIVE"
        ) {
            const activeAdministrators = adminRows.filter(
                row => row.account_status === "ACTIVE"
            );

            if (activeAdministrators.length <= 1) {
                throw new AdminError(
                    "Cannot deactivate or suspend the last active administrator",
                    409
                );
            }
        }

        if (target.account_status === newStatus) {
            await connection.commit();

            return {
                user_id: targetId,
                previous_status: target.account_status,
                account_status: newStatus,
                changed: false
            };
        }

        await connection.execute(`
            UPDATE users
            SET account_status = ?
            WHERE user_id = ?
        `, [newStatus, targetId]);

        await connection.execute(`
            INSERT INTO audit_logs (
                user_id,
                action,
                entity_name,
                entity_id,
                old_values,
                new_values,
                ip_address
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            actorId,
            "ACCOUNT_STATUS_UPDATED",
            "users",
            String(targetId),
            JSON.stringify({ account_status: target.account_status }),
            JSON.stringify({ account_status: newStatus }),
            typeof ipAddress === "string" && ipAddress.length <= 45
                ? ipAddress
                : null
        ]);

        await connection.commit();

        return {
            user_id: targetId,
            previous_status: target.account_status,
            account_status: newStatus,
            changed: true
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Administrator transaction rollback failed:",
                rollbackError.message);
        }

        throw error;
    } finally {
        connection.release();
    }
}

module.exports = {
    AdminError,
    positiveId,
    pagination,
    buildUserFilters,
    listUsers,
    listHostels,
    listAvailableRooms,
    getUserById,
    validateStatusData,
    updateUserStatus,
    validateCreateUserData,
    createUser
};

function validateCreateUserData(data = {}) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new AdminError("Request body must be a JSON object");
    }

    const role = typeof data.role === "string"
        ? data.role.trim().toUpperCase()
        : "";

    if (!["STUDENT", "MAINTENANCE_STAFF", "WARDEN"].includes(role)) {
        throw new AdminError(
            "role must be STUDENT, MAINTENANCE_STAFF or WARDEN"
        );
    }

    const full_name = typeof data.full_name === "string"
        ? data.full_name.trim() : "";
    const email = typeof data.email === "string"
        ? data.email.trim().toLowerCase() : "";
    const password = data.password;

    if (!full_name || full_name.length > 120) {
        throw new AdminError("full_name is required and must not exceed 120 characters");
    }

    if (
        !email ||
        email.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        throw new AdminError("A valid email address is required");
    }

    if (typeof password !== "string" || password.length < 12 || password.length > 128) {
        throw new AdminError("Password must contain between 12 and 128 characters");
    }

    const phone = data.phone == null ? null : String(data.phone).trim();
    if (phone !== null && phone.length > 20) {
        throw new AdminError("phone cannot exceed 20 characters");
    }

    const account_status = data.account_status === undefined
        ? "ACTIVE"
        : String(data.account_status).trim().toUpperCase();

    if (!VALID_STATUSES.includes(account_status)) {
        throw new AdminError("Invalid account status");
    }

    const result = {
        role,
        full_name,
        email,
        password,
        phone,
        account_status
    };

    if (role === "STUDENT") {
        result.registration_number =
            typeof data.registration_number === "string"
                ? data.registration_number.trim() : "";

        if (!result.registration_number || result.registration_number.length > 40) {
            throw new AdminError("A valid registration_number is required");
        }

        result.department = data.department == null ? null : String(data.department).trim();
        result.course = data.course == null ? null : String(data.course).trim();

        if (result.department?.length > 100 || result.course?.length > 100) {
            throw new AdminError("department and course cannot exceed 100 characters");
        }

        if (data.admission_year !== undefined && data.admission_year !== null &&
            (!Number.isInteger(Number(data.admission_year)) ||
             Number(data.admission_year) < 1901 ||
             Number(data.admission_year) > 2155)) {
            throw new AdminError("admission_year must be a valid year");
        }

        result.admission_year = data.admission_year == null
            ? null : Number(data.admission_year);

        const hasHostel = data.hostel_id !== undefined && data.hostel_id !== null && data.hostel_id !== "";
        const hasRoom = data.room_id !== undefined && data.room_id !== null && data.room_id !== "";
        if (hasHostel !== hasRoom) {
            throw new AdminError("hostel_id and room_id must be provided together");
        }
        if (hasHostel) {
            result.hostel_id = positiveId(data.hostel_id, "hostel ID");
            result.room_id = positiveId(data.room_id, "room ID");
        }
    }

    if (role === "MAINTENANCE_STAFF") {
        result.employee_code =
            typeof data.employee_code === "string"
                ? data.employee_code.trim() : "";

        if (!result.employee_code || result.employee_code.length > 40) {
            throw new AdminError("A valid employee_code is required");
        }

        result.employment_type = data.employment_type == null
            ? null : String(data.employment_type).trim();

        if (result.employment_type?.length > 40) {
            throw new AdminError("employment_type cannot exceed 40 characters");
        }
    }

    if (role === "MAINTENANCE_STAFF" || role === "WARDEN") {
        result.hostel_id = positiveId(data.hostel_id, "hostel ID");
        result.start_date = data.start_date;

        if (
            typeof result.start_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(result.start_date) ||
            Number.isNaN(Date.parse(`${result.start_date}T00:00:00Z`)) ||
            new Date(`${result.start_date}T00:00:00Z`).toISOString().slice(0, 10)
                !== result.start_date
        ) {
            throw new AdminError("start_date must be a valid YYYY-MM-DD date");
        }
    }

    return result;
}

async function createUser(actor, data = {}, ipAddress = null) {
    if (actor?.role !== "ADMINISTRATOR") {
        throw new AdminError("Administrator access required", 403);
    }

    const actorId = positiveId(actor?.user_id, "authenticated user ID");
    const user = validateCreateUserData(data);
    const passwordHash = await bcrypt.hash(user.password, 12);

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [roleRows] = await connection.execute(
            "SELECT role_id FROM roles WHERE role_name = ? LIMIT 1",
            [user.role]
        );

        if (!roleRows.length) {
            throw new AdminError("Configured role was not found", 500);
        }

        if (user.hostel_id) {
            const [hostelRows] = await connection.execute(
                "SELECT hostel_id FROM hostels WHERE hostel_id = ? FOR UPDATE",
                [user.hostel_id]
            );

            if (!hostelRows.length) {
                throw new AdminError("Hostel not found", 404);
            }
        }

        if (user.role === "STUDENT" && user.room_id) {
            const [roomRows] = await connection.execute(
                "SELECT room_id, capacity, room_status FROM rooms WHERE room_id = ? AND hostel_id = ? FOR UPDATE",
                [user.room_id, user.hostel_id]
            );
            if (!roomRows.length) throw new AdminError("Room does not belong to the selected hostel", 404);
            if (roomRows[0].room_status === "MAINTENANCE") throw new AdminError("The selected room is under maintenance", 409);
            const [occupancyRows] = await connection.execute(
                "SELECT COUNT(*) AS occupants FROM student_room_history WHERE room_id = ? AND hostel_id = ? AND is_active = TRUE",
                [user.room_id, user.hostel_id]
            );
            if (Number(occupancyRows[0].occupants) >= Number(roomRows[0].capacity)) {
                throw new AdminError("The selected room has reached its capacity", 409);
            }
        }

        const [userInsert] = await connection.execute(`
            INSERT INTO users (
                role_id, full_name, email, password_hash, phone, account_status
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            roleRows[0].role_id,
            user.full_name,
            user.email,
            passwordHash,
            user.phone,
            user.account_status
        ]);

        const userId = userInsert.insertId;

        if (user.role === "STUDENT") {
            const [studentInsert] = await connection.execute(`
                INSERT INTO student_profiles (
                    user_id, registration_number, department, course, admission_year
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                userId,
                user.registration_number,
                user.department,
                user.course,
                user.admission_year
            ]);

            if (user.room_id) {
                await connection.execute(`
                    INSERT INTO student_room_history (
                        student_id, hostel_id, room_id, start_date, is_active
                    ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, TRUE)
                `, [studentInsert.insertId, user.hostel_id, user.room_id]);
            }
        }

        if (user.role === "MAINTENANCE_STAFF") {
            const [staffInsert] = await connection.execute(`
                INSERT INTO maintenance_staff_profiles (
                    user_id, employee_code, employment_type
                ) VALUES (?, ?, ?)
            `, [
                userId,
                user.employee_code,
                user.employment_type
            ]);

            await connection.execute(`
                INSERT INTO staff_hostel_assignments (
                    staff_id, hostel_id, start_date, is_active
                ) VALUES (?, ?, ?, TRUE)
            `, [
                staffInsert.insertId,
                user.hostel_id,
                user.start_date
            ]);
        }

        if (user.role === "WARDEN") {
            await connection.execute(`
                INSERT INTO warden_assignments (
                    user_id, hostel_id, start_date, is_active
                ) VALUES (?, ?, ?, TRUE)
            `, [
                userId,
                user.hostel_id,
                user.start_date
            ]);
        }

        const auditData = {
            role: user.role,
            full_name: user.full_name,
            email: user.email,
            account_status: user.account_status
        };

        if (user.registration_number) {
            auditData.registration_number = user.registration_number;
        }
        if (user.employee_code) {
            auditData.employee_code = user.employee_code;
        }
        if (user.room_id) auditData.room_id = user.room_id;
        if (user.hostel_id) {
            auditData.hostel_id = user.hostel_id;
            auditData.start_date = user.start_date;
        }

        await connection.execute(`
            INSERT INTO audit_logs (
                user_id, action, entity_name, entity_id,
                old_values, new_values, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            actorId,
            "USER_CREATED",
            "users",
            String(userId),
            null,
            JSON.stringify(auditData),
            typeof ipAddress === "string" && ipAddress.length <= 45
                ? ipAddress : null
        ]);

        await connection.commit();

        return {
            user_id: userId,
            role: user.role,
            full_name: user.full_name,
            email: user.email,
            account_status: user.account_status
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("User creation rollback failed:", rollbackError.message);
        }

        if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
            throw new AdminError(
                "A user with this email or profile identifier already exists",
                409
            );
        }

        throw error;
    } finally {
        connection.release();
    }
}
