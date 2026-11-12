const test = require("node:test");
const assert = require("node:assert/strict");
const { pagination, positiveId } = require("../src/services/warden.service");
const { ComplaintError } = require("../src/services/complaint.service");

test("warden pagination defaults to page 1 and limit 10", () => {
    assert.deepEqual(pagination(), { page: 1, limit: 10, offset: 0 });
});

test("warden pagination calculates offset", () => {
    assert.deepEqual(pagination({ page: "3", limit: "20" }), {
        page: 3, limit: 20, offset: 40
    });
});

test("warden pagination rejects zero page", () => {
    assert.throws(() => pagination({ page: 0 }), ComplaintError);
});

test("warden pagination rejects limit above 50", () => {
    assert.throws(() => pagination({ limit: 51 }), ComplaintError);
});

test("warden pagination rejects unsafe offsets", () => {
    assert.throws(() => pagination({ page: Number.MAX_SAFE_INTEGER, limit: 50 }), ComplaintError);
});

test("positiveId accepts positive integer strings", () => {
    assert.equal(positiveId("12", "staff ID"), 12);
});

test("positiveId rejects zero and non-numeric IDs", () => {
    assert.throws(() => positiveId(0, "staff ID"), ComplaintError);
    assert.throws(() => positiveId("abc", "staff ID"), ComplaintError);
});

const { validateAssignmentData } = require("../src/services/warden.service");

test("assignment validation accepts an empty request body", () => {
    assert.deepEqual(validateAssignmentData(), {});
});

test("assignment validation accepts valid staff ID and remarks", () => {
    const data = { staff_id: 1, remarks: "Plumbing repair assigned" };
    assert.equal(validateAssignmentData(data), data);
});

test("assignment validation accepts missing and null remarks", () => {
    assert.deepEqual(validateAssignmentData({ staff_id: 1 }), { staff_id: 1 });
    assert.deepEqual(
        validateAssignmentData({ staff_id: 1, remarks: null }),
        { staff_id: 1, remarks: null }
    );
});

test("assignment validation rejects null, arrays and primitive request bodies", () => {
    for (const data of [null, [], "invalid", 123, true]) {
        assert.throws(() => validateAssignmentData(data), ComplaintError);
    }
});

test("assignment validation rejects non-string remarks", () => {
    for (const remarks of [123, true, [], {}]) {
        assert.throws(
            () => validateAssignmentData({ staff_id: 1, remarks }),
            ComplaintError
        );
    }
});

test("assignment validation accepts remarks of exactly 2000 characters", () => {
    const data = { staff_id: 1, remarks: "a".repeat(2000) };
    assert.equal(validateAssignmentData(data), data);
});

test("assignment validation rejects remarks longer than 2000 characters", () => {
    const data = { staff_id: 1, remarks: "a".repeat(2001) };
    assert.throws(() => validateAssignmentData(data), ComplaintError);
});

test("assignment validation rejects more than 2000 whitespace characters", () => {
    const data = { staff_id: 1, remarks: " ".repeat(2001) };
    assert.throws(() => validateAssignmentData(data), ComplaintError);
});
