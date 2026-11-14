const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/database");
const authenticateToken = require("../src/middleware/auth.middleware");

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("authentication accepts tokens from the configured issuer", async () => {
  const oldSecret = process.env.JWT_SECRET;
  const originalExecute = pool.execute;
  process.env.JWT_SECRET = "unit-test-secret-that-is-long-enough-for-hmac";
  pool.execute = async (_sql, params) => {
    assert.deepEqual(params, [5]);
    return [[{ user_id: 5, full_name: "Test User", email: "test@example.com", account_status: "ACTIVE", role_name: "STUDENT" }], []];
  };
  try {
    const token = jwt.sign({ sub: "5" }, process.env.JWT_SECRET, { issuer: "smart-hostel-maintenance", expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    let called = false;
    await authenticateToken(req, res, () => { called = true; });
    assert.equal(called, true);
    assert.equal(req.user.role, "STUDENT");
  } finally {
    pool.execute = originalExecute;
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  }
});

test("authentication rejects tokens from an unexpected issuer", async () => {
  const oldSecret = process.env.JWT_SECRET;
  const originalExecute = pool.execute;
  process.env.JWT_SECRET = "unit-test-secret-that-is-long-enough-for-hmac";
  let queryCalled = false;
  pool.execute = async () => { queryCalled = true; return [[], []]; };
  try {
    const token = jwt.sign({ sub: "5" }, process.env.JWT_SECRET, { issuer: "unexpected-issuer", expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    let nextCalled = false;
    await authenticateToken(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
    assert.equal(queryCalled, false);
  } finally {
    pool.execute = originalExecute;
    if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
  }
});
