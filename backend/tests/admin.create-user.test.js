const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const pool = require("../src/config/database");
const {
    AdminError,
    validateCreateUserData,
    createUser,
    listHostels,
    listAvailableRooms
} = require("../src/services/admin.service");

const admin = { user_id: 9, role: "ADMINISTRATOR" };

const student = {
    role: "STUDENT",
    full_name: "Test Student",
    email: "STUDENT@EXAMPLE.COM",
    password: "SecurePassword123",
    registration_number: "TEST2026001"
};

const staff = {
    role: "MAINTENANCE_STAFF",
    full_name: "Test Staff",
    email: "staff@example.com",
    password: "SecurePassword123",
    employee_code: "EMP001",
    hostel_id: 5,
    start_date: "2026-11-13"
};

const warden = {
    role: "WARDEN",
    full_name: "Test Warden",
    email: "warden@example.com",
    password: "SecurePassword123",
    hostel_id: 5,
    start_date: "2026-11-13"
};

function installMock(options = {}) {
    const calls = [];
    const original = pool.getConnection;

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),

        execute: async (sql, params = []) => {
            const normalized = sql.replace(/\s+/g, " ").trim();
            calls.push({ sql: normalized, params });

            if (normalized.includes("SELECT role_id FROM roles")) {
                return [[{ role_id: 2 }], []];
            }

            if (normalized.includes("SELECT hostel_id FROM hostels")) {
                return [options.missingHostel ? [] : [{ hostel_id: 5 }], []];
            }

            if (normalized.includes("INSERT INTO users")) {
                if (options.duplicate) {
                    const error = new Error("Duplicate entry");
                    error.code = "ER_DUP_ENTRY";
                    error.errno = 1062;
                    throw error;
                }

                return [{ insertId: 101 }, []];
            }

            if (normalized.includes("INSERT INTO maintenance_staff_profiles")) {
                if (options.profileFailure) {
                    throw new Error("Simulated profile failure");
                }
                return [{ insertId: 201 }, []];
            }

            if (normalized.includes("INSERT INTO audit_logs")) {
                if (options.auditFailure) {
                    throw new Error("Simulated audit failure");
                }
                return [{ insertId: 301 }, []];
            }

            if (normalized.includes("INSERT INTO")) {
                if (options.profileFailure) {
                    throw new Error("Simulated profile failure");
                }
                return [{ insertId: 401 }, []];
            }

            throw new Error(`Unexpected SQL: ${normalized}`);
        },

        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    return {
        calls,
        restore: () => { pool.getConnection = original; }
    };
}

test("Student account validation normalizes email and defaults status", () => {
    const result = validateCreateUserData(student);

    assert.equal(result.email, "student@example.com");
    assert.equal(result.account_status, "ACTIVE");
});

test("rejects Administrator account creation through this endpoint", () => {
    assert.throws(
        () => validateCreateUserData({
            ...student,
            role: "ADMINISTRATOR"
        }),
        AdminError
    );
});

test("student hostel and room assignment must be supplied together", () => {
    assert.throws(
        () => validateCreateUserData({ ...student, hostel_id: 5 }),
        error => error instanceof AdminError && /provided together/.test(error.message)
    );
    assert.throws(
        () => validateCreateUserData({ ...student, room_id: 12 }),
        error => error instanceof AdminError && /provided together/.test(error.message)
    );
});

test("rejects weak passwords and missing profile identifiers", () => {
    assert.throws(
        () => validateCreateUserData({ ...student, password: "short" }),
        AdminError
    );

    assert.throws(
        () => validateCreateUserData({
            ...student,
            registration_number: ""
        }),
        AdminError
    );

    assert.throws(
        () => validateCreateUserData({
            ...staff,
            start_date: "2026-02-30"
        }),
        AdminError
    );
});

test("rejects non-administrator before requesting a database connection", async () => {
    const mock = installMock();

    try {
        await assert.rejects(
            createUser({ user_id: 10, role: "WARDEN" }, student),
            error => error instanceof AdminError && error.statusCode === 403
        );

        assert.equal(
            mock.calls.length,
            0
        );
    } finally {
        mock.restore();
    }
});

test("creates Student profile and audits without exposing password hash", async () => {
    const mock = installMock();

    try {
        const result = await createUser(admin, student, "127.0.0.1");

        assert.equal(result.user_id, 101);
        assert.equal(result.role, "STUDENT");
        assert.equal(result.email, "student@example.com");
        assert.equal(result.password_hash, undefined);

        const insert = mock.calls.find(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO users")
        );

        assert.ok(await bcrypt.compare(student.password, insert.params[3]));

        const profile = mock.calls.find(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO student_profiles")
        );

        assert.ok(profile);

        const audit = mock.calls.find(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO audit_logs")
        );

        assert.ok(audit);
        assert.equal(audit.params[1], "USER_CREATED");
        assert.equal(audit.params[6], "127.0.0.1");
        assert.equal(audit.params[4], null);
        assert.ok(!JSON.stringify(audit.params).includes(student.password));

        assert.ok(mock.calls.includes("commit"));
        assert.ok(!mock.calls.includes("rollback"));
    } finally {
        mock.restore();
    }
});

test("creates Maintenance Staff profile and hostel assignment", async () => {
    const mock = installMock();

    try {
        const result = await createUser(admin, staff);

        assert.equal(result.role, "MAINTENANCE_STAFF");

        assert.ok(mock.calls.some(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO maintenance_staff_profiles")
        ));

        assert.ok(mock.calls.some(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO staff_hostel_assignments")
        ));

        assert.ok(mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("creates Warden hostel assignment", async () => {
    const mock = installMock();

    try {
        const result = await createUser(admin, warden);

        assert.equal(result.role, "WARDEN");

        assert.ok(mock.calls.some(
            call => typeof call === "object" &&
                call.sql.includes("INSERT INTO warden_assignments")
        ));

        assert.ok(mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("rejects nonexistent hostel and rolls back", async () => {
    const mock = installMock({ missingHostel: true });

    try {
        await assert.rejects(
            createUser(admin, staff),
            error => error instanceof AdminError && error.statusCode === 404
        );

        assert.ok(mock.calls.includes("rollback"));
        assert.ok(!mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("duplicate account identifiers return conflict and roll back", async () => {
    const mock = installMock({ duplicate: true });

    try {
        await assert.rejects(
            createUser(admin, student),
            error => error instanceof AdminError && error.statusCode === 409
        );

        assert.ok(mock.calls.includes("rollback"));
        assert.ok(!mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("profile failure rolls back the entire account creation", async () => {
    const mock = installMock({ profileFailure: true });

    try {
        await assert.rejects(
            createUser(admin, staff),
            /Simulated profile failure/
        );

        assert.ok(mock.calls.includes("rollback"));
        assert.ok(!mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("audit failure rolls back account creation", async () => {
    const mock = installMock({ auditFailure: true });

    try {
        await assert.rejects(
            createUser(admin, student),
            /Simulated audit failure/
        );

        assert.ok(mock.calls.includes("rollback"));
        assert.ok(!mock.calls.includes("commit"));
    } finally {
        mock.restore();
    }
});

test("creates a Student active room allocation when hostel and room IDs are supplied", async () => {
    const original = pool.getConnection;
    const calls = [];
    pool.getConnection = async () => ({
        beginTransaction: async () => {},
        execute: async (sql, params = []) => {
            const normalized = sql.replace(/\s+/g, " ").trim();
            calls.push({ sql: normalized, params });
            if (normalized.includes("SELECT role_id FROM roles")) return [[{ role_id: 2 }], []];
            if (normalized.includes("SELECT hostel_id FROM hostels")) return [[{ hostel_id: 5 }], []];
            if (normalized.includes("SELECT room_id, capacity, room_status FROM rooms")) return [[{ room_id: 12, capacity: 2, room_status: "OCCUPIED" }], []];
            if (normalized.includes("SELECT COUNT(*) AS occupants")) return [[{ occupants: 1 }], []];
            if (normalized.includes("INSERT INTO users")) return [{ insertId: 101 }, []];
            if (normalized.includes("INSERT INTO student_profiles")) return [{ insertId: 201 }, []];
            if (normalized.includes("INSERT INTO student_room_history")) return [{ insertId: 301 }, []];
            if (normalized.includes("INSERT INTO audit_logs")) return [{ insertId: 401 }, []];
            throw new Error(`Unexpected SQL: ${normalized}`);
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });
    try {
        const result = await createUser(admin, { ...student, hostel_id: 5, room_id: 12 });
        assert.equal(result.role, "STUDENT");
        assert.ok(calls.some(call => typeof call === "object" && call.sql.includes("INSERT INTO student_room_history")));
        assert.ok(calls.includes("commit"));
        assert.ok(!calls.includes("rollback"));
    } finally { pool.getConnection = original; }
});


test("administrator hostel lookup returns configured hostels", async () => {
    const original = pool.execute;
    try {
        pool.execute = async (sql) => {
            assert.match(sql, /FROM hostels/);
            return [[{ hostel_id: 2, hostel_name: "North Hostel", hostel_code: "NORTH" }], []];
        };
        const rows = await listHostels();
        assert.equal(rows.length, 1);
        assert.equal(rows[0].hostel_id, 2);
    } finally { pool.execute = original; }
});

test("available-room lookup filters full and maintenance rooms", async () => {
    const original = pool.execute;
    try {
        pool.execute = async (sql, params) => {
            assert.match(sql, /HAVING r\.room_status <> 'MAINTENANCE'/);
            assert.match(sql, /active_occupants < r\.capacity/);
            assert.deepEqual(params, [5]);
            return [[{ room_id: 10, room_number: "101", available_beds: 1 }], []];
        };
        const rows = await listAvailableRooms(5);
        assert.equal(rows.length, 1);
        assert.equal(rows[0].available_beds, 1);
    } finally { pool.execute = original; }
});

test("rejects student assignment when the selected room is full", async () => {
    const original = pool.getConnection;
    const calls = [];
    pool.getConnection = async () => ({
        beginTransaction: async () => {},
        execute: async (sql) => {
            const normalized = sql.replace(/\s+/g, " ").trim();
            calls.push(normalized);
            if (normalized.includes("SELECT role_id FROM roles")) return [[{ role_id: 2 }], []];
            if (normalized.includes("SELECT hostel_id FROM hostels")) return [[{ hostel_id: 5 }], []];
            if (normalized.includes("SELECT room_id, capacity, room_status FROM rooms")) return [[{ room_id: 12, capacity: 2, room_status: "OCCUPIED" }], []];
            if (normalized.includes("SELECT COUNT(*) AS occupants")) return [[{ occupants: 2 }], []];
            if (normalized.includes("INSERT INTO users")) throw new Error("User insert must not occur for a full room");
            throw new Error(`Unexpected SQL: ${normalized}`);
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });
    try {
        await assert.rejects(
            () => createUser(admin, { ...student, hostel_id: 5, room_id: 12 }),
            error => error instanceof AdminError && error.statusCode === 409
        );
        assert.ok(calls.includes("rollback"));
        assert.ok(!calls.includes("commit"));
        assert.ok(!calls.some(sql => typeof sql === "string" && sql.includes("INSERT INTO users")));
    } finally { pool.getConnection = original; }
});
