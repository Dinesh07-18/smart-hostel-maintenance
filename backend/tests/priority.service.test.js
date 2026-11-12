const test = require("node:test");
const assert = require("node:assert/strict");
const {
    scoreWaitingTime,
    classifyPriority,
    calculatePriority
} = require("../src/services/priority-calculator");

test("maps severity and urgency to normalized 0-100 scores", () => {
    assert.deepEqual(
        ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map(value =>
            calculatePriority({ severity: value, urgency: value }).severity_score
        ),
        [25, 50, 75, 100]
    );
});

test("waiting-time score increases at documented boundaries", () => {
    assert.deepEqual([0, 23.99, 24, 47.99, 48, 71.99, 72, 95.99, 96, 500].map(scoreWaitingTime),
        [0, 0, 25, 25, 50, 50, 75, 75, 100, 100]);
});

test("classifies total score using explicit thresholds", () => {
    assert.deepEqual([0, 24.999, 25, 49.999, 50, 74.999, 75, 100].map(classifyPriority),
        ["LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH", "CRITICAL", "CRITICAL"]);
});

test("applies 50/30/20 weighted formula", () => {
    const result = calculatePriority({ severity: "HIGH", urgency: "MEDIUM", hoursWaiting: 48 });
    assert.deepEqual(result, {
        severity_score: 75,
        urgency_score: 50,
        waiting_time_score: 50,
        total_priority_score: 62.5,
        priority_level: "HIGH"
    });
});

test("waiting time can raise a complaint priority", () => {
    const atSubmission = calculatePriority({ severity: "MEDIUM", urgency: "LOW", hoursWaiting: 0 });
    const afterFourDays = calculatePriority({ severity: "MEDIUM", urgency: "LOW", hoursWaiting: 96 });
    assert.equal(atSubmission.total_priority_score, 32.5);
    assert.equal(afterFourDays.total_priority_score, 52.5);
    assert.equal(atSubmission.priority_level, "MEDIUM");
    assert.equal(afterFourDays.priority_level, "HIGH");
});

test("rejects invalid input and negative waiting time", () => {
    assert.throws(() => calculatePriority({ severity: "URGENT", urgency: "LOW" }), /Severity/);
    assert.throws(() => calculatePriority({ severity: "LOW", urgency: "LOW", hoursWaiting: -1 }), /non-negative/);
});
