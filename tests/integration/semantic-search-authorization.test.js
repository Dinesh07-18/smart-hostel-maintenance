const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const enabled = process.env.RUN_SEMANTIC_SEARCH_INTEGRATION === "1";
const BASE_URL = (process.env.API_BASE_URL || "http://127.0.0.1:5001").replace(/\/$/, "");

test("live semantic-search authorization boundaries", {
    skip: !enabled ? "Set RUN_SEMANTIC_SEARCH_INTEGRATION=1 to run against the live API" : false
}, async (t) => {
    const backendDir = path.resolve(__dirname, "../../backend");
    require(path.join(backendDir, "node_modules", "dotenv")).config({
        path: path.join(backendDir, ".env")
    });

    const password = process.env.DEMO_SEED_PASSWORD;
    assert.ok(password, "DEMO_SEED_PASSWORD must be configured in backend/.env");

    const roles = [
        { email: "student1@demo.hostel.test", role: "STUDENT" },
        { email: "staff1@demo.hostel.test", role: "MAINTENANCE_STAFF" },
        { email: "warden1@demo.hostel.test", role: "WARDEN" },
        { email: "admin@demo.hostel.test", role: "ADMINISTRATOR" }
    ];

    async function post(endpoint, body, token) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(body)
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`${endpoint} returned non-JSON response (HTTP ${response.status})`);
        }

        return { status: response.status, data };
    }

    await t.test("unauthenticated search is rejected", async () => {
        const result = await post("/api/search/complaints", {
            text: "bathroom water leakage",
            limit: 5
        });

        assert.equal(result.status, 401);
        assert.equal(result.data.success, false);
    });

    for (const account of roles) {
        await t.test(`${account.role}: authenticated scope cannot be forged`, async () => {
            const login = await post("/api/auth/login", {
                email: account.email,
                password
            });

            assert.equal(login.status, 200, `Login failed for ${account.role}`);
            assert.equal(login.data.success, true);
            assert.equal(login.data.user.role, account.role);
            assert.ok(login.data.token);

            const token = login.data.token;
            const query = {
                text: "bathroom water leakage",
                limit: 10
            };

            const baseline = await post("/api/search/complaints", query, token);

            assert.equal(baseline.status, 200, `${account.role} baseline search failed`);
            assert.equal(baseline.data.success, true);
            assert.ok(Array.isArray(baseline.data.data));
            assert.equal(baseline.data.count, baseline.data.data.length);

            const forged = await post("/api/search/complaints", {
                ...query,
                hostel_id: 999999,
                hostel_ids: [1, 2, 3, 999999],
                user_id: 999999,
                role: "ADMINISTRATOR"
            }, token);

            assert.equal(forged.status, 200, `${account.role} forged-field search failed`);
            assert.equal(forged.data.success, true);

            const identity = rows => rows
                .map(row => ({
                    complaint_id: row.complaint_id,
                    hostel_name: row.hostel_name
                }))
                .sort((a, b) => Number(a.complaint_id) - Number(b.complaint_id));

            assert.deepEqual(
                identity(forged.data.data),
                identity(baseline.data.data),
                "Forged request fields must not change the authenticated user's search scope"
            );

            if (account.role === "STUDENT") {
                for (const row of baseline.data.data) {
                    assert.equal(row.description, null,
                        "Student search results must not expose complaint descriptions");
                }
            }
        });
    }
});
