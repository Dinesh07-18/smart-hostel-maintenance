const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/config/database");
const {
    AdminError,
    positiveId,
    pagination,
    buildUserFilters,
    listUsers,
    getUserById,
    validateStatusData,
    updateUserStatus
} = require("../src/services/admin.service");

function expectAdminError(fn, statusCode, messagePattern) {
    assert.throws(fn, error => {
        assert.ok(error instanceof AdminError);
        assert.equal(error.statusCode, statusCode);
        if (messagePattern) {
            assert.match(error.message, messagePattern);
        }
        return true;
    });
}

test("positiveId accepts positive integer strings", () => {
    assert.equal(positiveId("12", "user ID"), 12);
});

test("positiveId rejects invalid IDs", () => {
    for (const value of [0, -1, "abc", 1.5, null, undefined]) {
        expectAdminError(
            () => positiveId(value, "user ID"),
            400,
            /valid user ID/
        );
    }
});

test("pagination defaults to page 1 and limit 20", () => {
    assert.deepEqual(pagination(), {
        page: 1,
        limit: 20,
        offset: 0
    });
});

test("pagination calculates offset", () => {
    assert.deepEqual(pagination({ page: 3, limit: 10 }), {
        page: 3,
        limit: 10,
        offset: 20
    });
});

test("pagination rejects invalid page and limit", () => {
    for (const options of [
        { page: 0 },
        { page: -1 },
        { page: 1.5 },
        { limit: 0 },
        { limit: 51 },
        { limit: 2.5 },
        { page: Number.MAX_SAFE_INTEGER, limit: 50 }
    ]) {
        assert.throws(() => pagination(options), AdminError);
    }
});

test("buildUserFilters returns no conditions without filters", () => {
    assert.deepEqual(buildUserFilters(), {
        where: "",
        params: []
    });
});

test("buildUserFilters supports role and status filters", () => {
    assert.deepEqual(
        buildUserFilters({
            role: "administrator",
            status: "active"
        }),
        {
            where: "WHERE r.role_name = ? AND u.account_status = ?",
            params: ["ADMINISTRATOR", "ACTIVE"]
        }
    );
});

test("buildUserFilters supports name and email search", () => {
    assert.deepEqual(
        buildUserFilters({ search: "Dinesh" }),
        {
            where: "WHERE (u.full_name LIKE ? OR u.email LIKE ?)",
            params: ["%Dinesh%", "%Dinesh%"]
        }
    );
});

test("buildUserFilters rejects invalid role, status and long search", () => {
    assert.throws(
        () => buildUserFilters({ role: "SUPERUSER" }),
        AdminError
    );

    assert.throws(
        () => buildUserFilters({ status: "DELETED" }),
        AdminError
    );

    assert.throws(
        () => buildUserFilters({ search: "x".repeat(101) }),
        AdminError
    );
});

test("validateStatusData accepts supported account statuses", () => {
    for (const status of ["ACTIVE", "INACTIVE", "SUSPENDED"]) {
        assert.deepEqual(
            validateStatusData({ account_status: status.toLowerCase() }),
            { account_status: status }
        );
    }
});

test("validateStatusData rejects invalid request bodies", () => {
    for (const body of [
        null,
        [],
        "ACTIVE",
        {},
        { account_status: "DELETED" },
        { account_status: 123 }
    ]) {
        assert.throws(() => validateStatusData(body), AdminError);
    }
});

test("listUsers uses parameterized queries and excludes password hashes", async () => {
    const originalExecute = pool.execute;
    const calls = [];

    pool.execute = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes("COUNT(*) AS total")) {
            return [[{ total: 1 }]];
        }

        return [[{
            user_id: 7,
            full_name: "Test User",
            email: "test@example.com",
            role_name: "STUDENT",
            account_status: "ACTIVE"
        }]];
    };

    try {
        const result = await listUsers({
            page: 2,
            limit: 10,
            role: "STUDENT",
            status: "ACTIVE",
            search: "Test"
        });

        assert.equal(calls.length, 2);
        assert.deepEqual(calls[0].params, [
            "STUDENT",
            "ACTIVE",
            "%Test%",
            "%Test%"
        ]);
        assert.deepEqual(calls[1].params, [
            "STUDENT",
            "ACTIVE",
            "%Test%",
            "%Test%",
            10,
            10
        ]);

        assert.ok(
            calls.every(call => !/password_hash/i.test(call.sql)),
            "User queries must not select password hashes"
        );

        assert.equal(result.users.length, 1);
        assert.deepEqual(result.pagination, {
            page: 2,
            limit: 10,
            total: 1,
            total_pages: 1
        });
    } finally {
        pool.execute = originalExecute;
    }
});

test("getUserById returns a user without selecting password hash", async () => {
    const originalExecute = pool.execute;
    let capturedSql = "";
    let capturedParams = [];

    pool.execute = async (sql, params) => {
        capturedSql = sql;
        capturedParams = params;

        return [[{
            user_id: 9,
            full_name: "Example User",
            role_name: "STUDENT"
        }]];
    };

    try {
        const user = await getUserById("9");

        assert.equal(user.user_id, 9);
        assert.deepEqual(capturedParams, [9]);
        assert.doesNotMatch(capturedSql, /password_hash/i);
    } finally {
        pool.execute = originalExecute;
    }
});

test("getUserById returns 404 for a missing user", async () => {
    const originalExecute = pool.execute;

    pool.execute = async () => [[]];

    try {
        await assert.rejects(
            getUserById(999),
            error => error instanceof AdminError &&
                error.statusCode === 404
        );
    } finally {
        pool.execute = originalExecute;
    }
});

test("updateUserStatus prevents self-deactivation before database access", async () => {
    const originalGetConnection = pool.getConnection;
    let connectionRequested = false;

    pool.getConnection = async () => {
        connectionRequested = true;
        throw new Error("Database should not be accessed");
    };

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 5, role: "ADMINISTRATOR" },
                5,
                { account_status: "SUSPENDED" }
            ),
            error => error instanceof AdminError &&
                error.statusCode === 403
        );

        assert.equal(connectionRequested, false);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("updateUserStatus rejects invalid status before database access", async () => {
    const originalGetConnection = pool.getConnection;
    let connectionRequested = false;

    pool.getConnection = async () => {
        connectionRequested = true;
        throw new Error("Database should not be accessed");
    };

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 5, role: "ADMINISTRATOR" },
                6,
                { account_status: "DELETED" }
            ),
            AdminError
        );

        assert.equal(connectionRequested, false);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("updateUserStatus rolls back when target user does not exist", async () => {
    const originalGetConnection = pool.getConnection;
    const calls = [];

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),
        execute: async sql => {
            calls.push(sql.includes("WHERE r.role_name") ? "lock-admins" : "lock-target");
            return [[]];
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 1, role: "ADMINISTRATOR" },
                99,
                { account_status: "INACTIVE" }
            ),
            error => error instanceof AdminError &&
                error.statusCode === 404
        );

        assert.ok(calls.includes("rollback"));
        assert.ok(calls.includes("release"));
        assert.ok(!calls.includes("commit"));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("updateUserStatus protects the last active administrator", async () => {
    const originalGetConnection = pool.getConnection;
    const calls = [];

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),
        execute: async sql => {
            if (sql.includes("WHERE r.role_name")) {
                return [[{
                    user_id: 1,
                    account_status: "ACTIVE"
                }]];
            }

            if (sql.includes("WHERE u.user_id")) {
                return [[{
                    user_id: 1,
                    account_status: "ACTIVE",
                    role_name: "ADMINISTRATOR"
                }]];
            }

            calls.push("update");
            return [{ affectedRows: 1 }];
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 2, role: "ADMINISTRATOR" },
                1,
                { account_status: "SUSPENDED" }
            ),
            error => error instanceof AdminError &&
                error.statusCode === 409
        );

        assert.ok(!calls.includes("update"));
        assert.ok(calls.includes("rollback"));
        assert.ok(calls.includes("release"));
        assert.ok(!calls.includes("commit"));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("updateUserStatus permits suspension when another active administrator exists", async () => {
    const originalGetConnection = pool.getConnection;
    const calls = [];

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),
        execute: async (sql, params) => {
            if (sql.includes("WHERE r.role_name")) {
                return [[
                    { user_id: 1, account_status: "ACTIVE" },
                    { user_id: 2, account_status: "ACTIVE" }
                ]];
            }

            if (sql.includes("WHERE u.user_id")) {
                return [[{
                    user_id: 1,
                    account_status: "ACTIVE",
                    role_name: "ADMINISTRATOR"
                }]];
            }

            if (sql.includes("UPDATE users")) {
                calls.push({ update: true, params });
                return [{ affectedRows: 1 }];
            }

            if (sql.includes("INSERT INTO audit_logs")) {
                calls.push({ audit: true, params });
                return [{ affectedRows: 1 }];
            }

            throw new Error("Unexpected SQL in test mock");
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    try {
        const result = await updateUserStatus(
            { user_id: 2, role: "ADMINISTRATOR" },
            1,
            { account_status: "SUSPENDED" }
        );

        assert.equal(result.changed, true);
        assert.equal(result.previous_status, "ACTIVE");
        assert.equal(result.account_status, "SUSPENDED");

        const auditCall = calls.find(call =>
            typeof call === "object" && call.audit === true
        );

        assert.ok(auditCall, "Status update must create an audit record");
        assert.equal(auditCall.params[0], 2);
        assert.equal(auditCall.params[1], "ACCOUNT_STATUS_UPDATED");
        assert.equal(auditCall.params[2], "users");
        assert.equal(auditCall.params[3], "1");
        assert.deepEqual(JSON.parse(auditCall.params[4]), {
            account_status: "ACTIVE"
        });
        assert.deepEqual(JSON.parse(auditCall.params[5]), {
            account_status: "SUSPENDED"
        });
        assert.ok(calls.some(call =>
            typeof call === "object" &&
            call.update === true &&
            call.params[0] === "SUSPENDED" &&
            call.params[1] === 1
        ));
        assert.ok(calls.includes("commit"));
        assert.ok(!calls.includes("rollback"));
        assert.ok(calls.includes("release"));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});


test("updateUserStatus rolls back when audit insertion fails", async () => {
    const originalGetConnection = pool.getConnection;
    const calls = [];

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),
        execute: async sql => {
            if (sql.includes("WHERE r.role_name")) {
                return [[
                    { user_id: 1, account_status: "ACTIVE" },
                    { user_id: 2, account_status: "ACTIVE" }
                ]];
            }

            if (sql.includes("WHERE u.user_id")) {
                return [[{
                    user_id: 10,
                    account_status: "ACTIVE",
                    role_name: "STUDENT"
                }]];
            }

            if (sql.includes("UPDATE users")) {
                calls.push("update");
                return [{ affectedRows: 1 }];
            }

            if (sql.includes("INSERT INTO audit_logs")) {
                calls.push("audit-failed");
                throw new Error("Simulated audit insertion failure");
            }

            throw new Error("Unexpected SQL in test mock");
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 2, role: "ADMINISTRATOR" },
                10,
                { account_status: "SUSPENDED" }
            ),
            /Simulated audit insertion failure/
        );

        assert.ok(calls.includes("update"));
        assert.ok(calls.includes("audit-failed"));
        assert.ok(calls.includes("rollback"));
        assert.ok(!calls.includes("commit"));
        assert.ok(calls.includes("release"));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});
test("updateUserStatus commits without updating when status is unchanged", async () => {
    const originalGetConnection = pool.getConnection;
    const calls = [];

    pool.getConnection = async () => ({
        beginTransaction: async () => calls.push("begin"),
        execute: async sql => {
            if (sql.includes("WHERE r.role_name")) {
                return [[{
                    user_id: 1,
                    account_status: "ACTIVE"
                }]];
            }

            if (sql.includes("WHERE u.user_id")) {
                return [[{
                    user_id: 1,
                    account_status: "ACTIVE",
                    role_name: "STUDENT"
                }]];
            }

            calls.push("update");
            return [{ affectedRows: 1 }];
        },
        commit: async () => calls.push("commit"),
        rollback: async () => calls.push("rollback"),
        release: () => calls.push("release")
    });

    try {
        const result = await updateUserStatus(
            { user_id: 2, role: "ADMINISTRATOR" },
            1,
            { account_status: "ACTIVE" }
        );

        assert.equal(result.changed, false);
        assert.ok(calls.includes("commit"));
        assert.ok(!calls.includes("update"));
        assert.ok(!calls.includes("rollback"));
        assert.ok(calls.includes("release"));
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("updateUserStatus rejects non-administrator actors before database access", async () => {
    const originalGetConnection = pool.getConnection;
    let connectionRequested = false;

    pool.getConnection = async () => {
        connectionRequested = true;
        throw new Error("Database should not be accessed");
    };

    try {
        await assert.rejects(
            updateUserStatus(
                { user_id: 5, role: "WARDEN" },
                6,
                { account_status: "SUSPENDED" }
            ),
            error => error instanceof AdminError &&
                error.statusCode === 403
        );

        assert.equal(connectionRequested, false);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});
