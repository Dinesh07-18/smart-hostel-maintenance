const test = require("node:test");
const assert = require("node:assert/strict");

const pool = require("../src/config/database");
const {
    listAssignableStaff,
    assignComplaint
} = require("../src/services/warden.service");
const { findSimilarComplaints } = require("../src/services/vector.service");
const allowRoles = require("../src/middleware/role.middleware");

test("warden can access a hostel to which they are actively assigned", async () => {
    const originalExecute = pool.execute;

    try {
        const queries = [];

        pool.execute = async (sql) => {
            queries.push(sql);

            if (sql.includes("FROM warden_assignments")) {
                return [[{ allowed: 1 }], []];
            }

            if (sql.includes("FROM staff_hostel_assignments")) {
                return [[{ staff_id: 5, full_name: "Test Staff" }], []];
            }

            throw new Error("Unexpected SQL in test: " + sql);
        };

        const result = await listAssignableStaff(
            { user_id: 10, role: "WARDEN" },
            7
        );

        assert.equal(result.length, 1);
        assert.equal(queries.length, 2);
    } finally {
        pool.execute = originalExecute;
    }
});

test("warden cannot access an unassigned hostel", async () => {
    const originalExecute = pool.execute;

    try {
        let queryCount = 0;

        pool.execute = async () => {
            queryCount++;
            return [[], []];
        };

        await assert.rejects(
            () => listAssignableStaff(
                { user_id: 10, role: "WARDEN" },
                99
            ),
            error => error.statusCode === 403
        );

        assert.equal(queryCount, 1);
    } finally {
        pool.execute = originalExecute;
    }
});

test("administrator can access a hostel without a warden assignment", async () => {
    const originalExecute = pool.execute;

    try {
        let queryCount = 0;

        pool.execute = async () => {
            queryCount++;
            return [[], []];
        };

        const result = await listAssignableStaff(
            { user_id: 1, role: "ADMINISTRATOR" },
            7
        );

        assert.deepEqual(result, []);
        assert.equal(queryCount, 1);
    } finally {
        pool.execute = originalExecute;
    }
});

test("warden cannot assign a complaint belonging to another hostel", async () => {
    const originalGetConnection = pool.getConnection;

    const state = {
        rollback: 0,
        commit: 0,
        release: 0,
        insertAttempted: false
    };

    try {
        pool.getConnection = async () => ({
            async beginTransaction() {},
            async commit() {
                state.commit++;
            },
            async rollback() {
                state.rollback++;
            },
            release() {
                state.release++;
            },
            async execute(sql) {
                const query = sql.replace(/\s+/g, " ").trim().toLowerCase();

                if (query.includes("select c.complaint_id")) {
                    return [[{
                        complaint_id: 21,
                        hostel_id: 99,
                        status: "SUBMITTED"
                    }], []];
                }

                if (query.includes("from warden_assignments")) {
                    return [[], []];
                }

                if (query.includes("insert into complaint_assignments")) {
                    state.insertAttempted = true;
                    throw new Error("Assignment must not be inserted");
                }

                if (query.startsWith("set @app_user_id")) {
                    return [{ affectedRows: 0 }, []];
                }

                throw new Error("Unexpected SQL in test: " + query);
            }
        });

        await assert.rejects(
            () => assignComplaint(
                { user_id: 10, role: "WARDEN" },
                21,
                { staff_id: 5 }
            ),
            error => error.statusCode === 403
        );

        assert.equal(state.rollback, 1);
        assert.equal(state.commit, 0);
        assert.equal(state.insertAttempted, false);
        assert.equal(state.release, 1);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("student semantic search uses exactly the active hostel ID", async () => {
    const originalExecute = pool.execute;
    const originalFetch = global.fetch;

    try {
        let capturedBody;

        pool.execute = async (sql, params) => {
            assert.match(sql, /student_room_history/);
            assert.deepEqual(params, [25]);

            return [[{ hostel_id: 12 }], []];
        };

        global.fetch = async (url, options) => {
            assert.match(url, /\/search$/);
            capturedBody = JSON.parse(options.body);

            return {
                ok: true,
                async json() {
                    return { matches: [] };
                }
            };
        };

        const result = await findSimilarComplaints(
            { user_id: 25 },
            "Water leakage in bathroom",
            5
        );

        assert.deepEqual(result.matches, []);
        assert.equal(capturedBody.hostel_id, 12);
        assert.equal(capturedBody.text, "Water leakage in bathroom");
        assert.equal(capturedBody.limit, 5);
    } finally {
        pool.execute = originalExecute;
        global.fetch = originalFetch;
    }
});

test("student semantic search rejects missing active hostel assignment", async () => {
    const originalExecute = pool.execute;
    const originalFetch = global.fetch;

    try {
        let fetchCalled = false;

        pool.execute = async () => [[], []];

        global.fetch = async () => {
            fetchCalled = true;
            throw new Error("Fetch must not be called");
        };

        await assert.rejects(
            () => findSimilarComplaints(
                { user_id: 25 },
                "Water leakage"
            ),
            /single active hostel assignment/
        );

        assert.equal(fetchCalled, false);
    } finally {
        pool.execute = originalExecute;
        global.fetch = originalFetch;
    }
});

test("student semantic search rejects multiple active hostel assignments", async () => {
    const originalExecute = pool.execute;
    const originalFetch = global.fetch;

    try {
        let fetchCalled = false;

        pool.execute = async () => [[
            { hostel_id: 12 },
            { hostel_id: 13 }
        ], []];

        global.fetch = async () => {
            fetchCalled = true;
            throw new Error("Fetch must not be called");
        };

        await assert.rejects(
            () => findSimilarComplaints(
                { user_id: 25 },
                "Water leakage"
            ),
            /single active hostel assignment/
        );

        assert.equal(fetchCalled, false);
    } finally {
        pool.execute = originalExecute;
        global.fetch = originalFetch;
    }
});

test("semantic search rejects invalid student identity before database access", async () => {
    const originalExecute = pool.execute;

    try {
        let queryCount = 0;

        pool.execute = async () => {
            queryCount++;
            return [[], []];
        };

        await assert.rejects(
            () => findSimilarComplaints(
                { user_id: 0 },
                "Water leakage"
            ),
            /Authenticated student identity required/
        );

        assert.equal(queryCount, 0);
    } finally {
        pool.execute = originalExecute;
    }
});

test("role middleware returns 401 when user is missing", () => {
    const middleware = allowRoles("STUDENT");

    const req = { user: null };
    let statusCode;
    let responseBody;
    let nextCalled = false;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
            return this;
        }
    };

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(statusCode, 401);
    assert.equal(responseBody.success, false);
    assert.equal(nextCalled, false);
});

test("role middleware returns 403 when role is not permitted", () => {
    const middleware = allowRoles("STUDENT");

    const req = {
        user: { user_id: 10, role: "MAINTENANCE_STAFF" }
    };

    let statusCode;
    let nextCalled = false;

    const res = {
        status(code) {
            statusCode = code;
            return this;
        },
        json() {
            return this;
        }
    };

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(statusCode, 403);
    assert.equal(nextCalled, false);
});

test("role middleware permits an authorized role", () => {
    const middleware = allowRoles("WARDEN", "ADMINISTRATOR");

    const req = {
        user: { user_id: 10, role: "WARDEN" }
    };

    let nextCalled = false;

    const res = {
        status() {
            return this;
        },
        json() {
            return this;
        }
    };

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
});

// PHASE6_ADDITIONAL_SECURITY_TESTS_V1
const jwtForSecurityTests = require("jsonwebtoken");
const authenticateTokenForSecurityTests = require("../src/middleware/auth.middleware");

test("warden cannot assign a complaint to staff assigned to a different hostel", async () => {
    const originalGetConnection = pool.getConnection;
    const state = { rollback: 0, commit: 0, release: 0, staffLookup: 0, insertAttempted: false };

    try {
        pool.getConnection = async () => ({
            async beginTransaction() {},
            async commit() { state.commit++; },
            async rollback() { state.rollback++; },
            release() { state.release++; },
            async execute(sql) {
                const query = sql.replace(/\s+/g, " ").trim().toLowerCase();

                if (query.includes("select c.complaint_id")) {
                    return [[{ complaint_id: 21, hostel_id: 7, status: "SUBMITTED" }], []];
                }
                if (query.includes("from warden_assignments")) {
                    return [[{ allowed: 1 }], []];
                }
                if (query.includes("from maintenance_staff_profiles")) {
                    state.staffLookup++;
                    return [[], []];
                }
                if (query.includes("insert into complaint_assignments")) {
                    state.insertAttempted = true;
                    throw new Error("Assignment must not be inserted");
                }
                if (query.startsWith("set @app_user_id")) {
                    return [{ affectedRows: 0 }, []];
                }
                throw new Error("Unexpected SQL: " + query);
            }
        });

        await assert.rejects(
            () => assignComplaint(
                { user_id: 10, role: "WARDEN" },
                21,
                { staff_id: 55 }
            ),
            error => error.statusCode === 400 &&
                error.message === "Staff member is not actively assigned to this hostel"
        );

        assert.equal(state.staffLookup, 1);
        assert.equal(state.rollback, 1);
        assert.equal(state.commit, 0);
        assert.equal(state.insertAttempted, false);
        assert.equal(state.release, 1);
    } finally {
        pool.getConnection = originalGetConnection;
    }
});

test("authentication middleware rejects a missing Bearer token", async () => {
    const originalExecute = pool.execute;
    let queryCount = 0;

    try {
        pool.execute = async () => {
            queryCount++;
            return [[], []];
        };

        const req = { headers: {} };
        let statusCode;
        let responseBody;
        let nextCalled = false;
        const res = {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        };

        await authenticateTokenForSecurityTests(req, res, () => { nextCalled = true; });

        assert.equal(statusCode, 401);
        assert.equal(responseBody.message, "Authentication token is required");
        assert.equal(nextCalled, false);
        assert.equal(queryCount, 0);
    } finally {
        pool.execute = originalExecute;
    }
});

test("authentication middleware rejects an invalid JWT", async () => {
    const originalExecute = pool.execute;
    const originalSecret = process.env.JWT_SECRET;
    let queryCount = 0;

    try {
        process.env.JWT_SECRET = "phase6-temporary-test-secret";
        pool.execute = async () => {
            queryCount++;
            return [[], []];
        };

        const req = {
            headers: { authorization: "Bearer definitely-not-a-valid-token" }
        };
        let statusCode;
        let responseBody;
        let nextCalled = false;
        const res = {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        };

        await authenticateTokenForSecurityTests(req, res, () => { nextCalled = true; });

        assert.equal(statusCode, 401);
        assert.equal(responseBody.message, "Invalid or expired authentication token");
        assert.equal(nextCalled, false);
        assert.equal(queryCount, 0);
    } finally {
        pool.execute = originalExecute;
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});

test("authentication middleware accepts a valid token for an active account", async () => {
    const originalExecute = pool.execute;
    const originalSecret = process.env.JWT_SECRET;
    const testSecret = "phase6-temporary-test-secret";

    try {
        process.env.JWT_SECRET = testSecret;
        const token = jwtForSecurityTests.sign({ sub: 42 }, testSecret, { expiresIn: "5m" });

        let capturedParams;
        pool.execute = async (sql, params) => {
            assert.match(sql, /FROM users u/);
            capturedParams = params;
            return [[{
                user_id: 42,
                full_name: "Security Test Student",
                email: "security-test@example.com",
                account_status: "ACTIVE",
                role_name: "STUDENT"
            }], []];
        };

        const req = { headers: { authorization: `Bearer ${token}` } };
        let nextCalled = false;
        const res = {
            status() { return this; },
            json() { return this; }
        };

        await authenticateTokenForSecurityTests(req, res, () => { nextCalled = true; });

        assert.equal(nextCalled, true);
        assert.deepEqual(capturedParams, [42]);
        assert.deepEqual(req.user, {
            user_id: 42,
            full_name: "Security Test Student",
            email: "security-test@example.com",
            role: "STUDENT"
        });
    } finally {
        pool.execute = originalExecute;
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});

test("authentication middleware rejects an inactive account", async () => {
    const originalExecute = pool.execute;
    const originalSecret = process.env.JWT_SECRET;

    try {
        const testSecret = "phase6-temporary-test-secret";
        process.env.JWT_SECRET = testSecret;
        const token = jwtForSecurityTests.sign({ sub: 43 }, testSecret, { expiresIn: "5m" });

        pool.execute = async () => [[{
            user_id: 43,
            full_name: "Inactive Test User",
            email: "inactive-test@example.com",
            account_status: "INACTIVE",
            role_name: "STUDENT"
        }], []];

        const req = { headers: { authorization: `Bearer ${token}` } };
        let statusCode;
        let responseBody;
        let nextCalled = false;
        const res = {
            status(code) { statusCode = code; return this; },
            json(body) { responseBody = body; return this; }
        };

        await authenticateTokenForSecurityTests(req, res, () => { nextCalled = true; });

        assert.equal(statusCode, 401);
        assert.equal(responseBody.message, "Account is inactive or unavailable");
        assert.equal(nextCalled, false);
        assert.equal(req.user, undefined);
    } finally {
        pool.execute = originalExecute;
        if (originalSecret === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = originalSecret;
    }
});
