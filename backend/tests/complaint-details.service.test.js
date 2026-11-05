const test = require("node:test");
const assert = require("node:assert/strict");

const {
    getStudentComplaintDetails
} = require("../src/services/complaint-details.service");

const {
    ComplaintError
} = require("../src/services/complaint.service");

test("rejects missing authenticated user", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails(null, 1),
        error => error instanceof ComplaintError && error.statusCode === 401
    );
});

test("rejects invalid user ID", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails({ user_id: 0 }, 1),
        error => error instanceof ComplaintError && error.statusCode === 401
    );
});

test("rejects complaint ID zero", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails({ user_id: 1 }, 0),
        /valid complaint ID is required/
    );
});

test("rejects negative complaint ID", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails({ user_id: 1 }, -5),
        /valid complaint ID is required/
    );
});

test("rejects non-numeric complaint ID", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails({ user_id: 1 }, "abc"),
        /valid complaint ID is required/
    );
});

test("rejects fractional complaint ID", async () => {
    await assert.rejects(
        () => getStudentComplaintDetails({ user_id: 1 }, 1.5),
        /valid complaint ID is required/
    );
});