const test = require("node:test");
const assert = require("node:assert/strict");
const pool = require("../src/config/database");
const { submitFeedback, FeedbackError } = require("../src/services/feedback.service");

function mockConnection({ status = "RESOLVED", owned = true, duplicate = false } = {}) {
  const calls = [];
  const original = pool.getConnection;
  pool.getConnection = async () => ({
    beginTransaction: async () => calls.push("begin"),
    execute: async (sql, params = []) => {
      const normalized = sql.replace(/\s+/g, " ").trim();
      calls.push({ sql: normalized, params });
      if (normalized.includes("FROM student_profiles")) return [[{ student_id: 7 }], []];
      if (normalized.includes("FROM complaints")) return [owned ? [{ complaint_id: 12, status }] : [], []];
      if (normalized.includes("FROM feedback")) return [duplicate ? [{ feedback_id: 5 }] : [], []];
      if (normalized.includes("INSERT INTO feedback")) return [{ insertId: 88 }, []];
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
    commit: async () => calls.push("commit"),
    rollback: async () => calls.push("rollback"),
    release: () => calls.push("release"),
  });
  return { calls, restore: () => { pool.getConnection = original; } };
}

test("student can submit one rating for an owned resolved complaint", async () => {
  const mock = mockConnection();
  try {
    const result = await submitFeedback({ user_id: 3, role: "STUDENT" }, 12, 5, "Fixed quickly");
    assert.equal(result.feedback_id, 88);
    assert.equal(result.rating, 5);
    assert.ok(mock.calls.includes("commit"));
    assert.ok(!mock.calls.includes("rollback"));
  } finally { mock.restore(); }
});

test("feedback is rejected for unresolved complaints", async () => {
  const mock = mockConnection({ status: "IN_PROGRESS" });
  try {
    await assert.rejects(() => submitFeedback({ user_id: 3 }, 12, 4), error => error instanceof FeedbackError && error.statusCode === 409);
    assert.ok(mock.calls.includes("rollback"));
  } finally { mock.restore(); }
});

test("feedback is rejected for complaints not owned by the student", async () => {
  const mock = mockConnection({ owned: false });
  try {
    await assert.rejects(() => submitFeedback({ user_id: 3 }, 12, 4), error => error instanceof FeedbackError && error.statusCode === 404);
  } finally { mock.restore(); }
});

test("feedback cannot be submitted twice for one complaint", async () => {
  const mock = mockConnection({ duplicate: true });
  try {
    await assert.rejects(() => submitFeedback({ user_id: 3 }, 12, 4), error => error instanceof FeedbackError && error.statusCode === 409);
  } finally { mock.restore(); }
});

test("invalid feedback ratings are rejected before database access", async () => {
  const original = pool.getConnection;
  let called = false;
  pool.getConnection = async () => { called = true; throw new Error("database should not be called"); };
  try {
    await assert.rejects(() => submitFeedback({ user_id: 3 }, 12, 6), FeedbackError);
    assert.equal(called, false);
  } finally { pool.getConnection = original; }
});
