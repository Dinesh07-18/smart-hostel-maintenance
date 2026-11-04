const test = require("node:test");
const assert = require("node:assert/strict");

const { listStudentComplaints } = require("../src/services/complaint-query.service");
const { ComplaintError } = require("../src/services/complaint.service");

test("rejects missing authenticated user", async () => {
    await assert.rejects(
        () => listStudentComplaints(null),
        error => error instanceof ComplaintError && error.statusCode === 401
    );
});

test("rejects page zero", async () => {
    await assert.rejects(
        () => listStudentComplaints({ user_id: 1 }, { page: 0 }),
        /page must be a positive integer/
    );
});

test("rejects negative page", async () => {
    await assert.rejects(
        () => listStudentComplaints({ user_id: 1 }, { page: -1 }),
        /page must be a positive integer/
    );
});

test("rejects limit zero", async () => {
    await assert.rejects(
        () => listStudentComplaints({ user_id: 1 }, { limit: 0 }),
        /limit must be an integer between 1 and 50/
    );
});

test("rejects limit above 50", async () => {
    await assert.rejects(
        () => listStudentComplaints({ user_id: 1 }, { limit: 51 }),
        /limit must be an integer between 1 and 50/
    );
});

test("rejects fractional page numbers", async () => {
    await assert.rejects(
        () => listStudentComplaints({ user_id: 1 }, { page: 1.5 }),
        /page must be a positive integer/
    );
});

test("rejects page values that produce an unsafe offset", async () => {
    await assert.rejects(
        () => listStudentComplaints(
            { user_id: 1 },
            { page: Number.MAX_SAFE_INTEGER, limit: 50 }
        ),
        /Requested page is too large/
    );
});
