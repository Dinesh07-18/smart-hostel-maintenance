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
