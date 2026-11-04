const test = require("node:test");
const assert = require("node:assert/strict");

const {
    createComplaint,
    ComplaintError
} = require("../src/services/complaint.service");

const validUser = { user_id: 1 };

const validData = {
    category_id: 1,
    title: "Water leakage",
    description: "Water is leaking from the bathroom ceiling.",
    severity: "HIGH",
    urgency: "HIGH"
};

async function expectComplaintError(user, data, expectedMessage, expectedStatus = 400) {
    await assert.rejects(
        () => createComplaint(user, data),
        (error) => {
            assert.ok(error instanceof ComplaintError);
            assert.equal(error.message, expectedMessage);
            assert.equal(error.statusCode, expectedStatus);
            return true;
        }
    );
}

test("rejects missing authenticated user", async () => {
    await expectComplaintError(
        null,
        validData,
        "Authenticated user identity is required",
        401
    );
});

test("rejects invalid user ID", async () => {
    await expectComplaintError(
        { user_id: 0 },
        validData,
        "Authenticated user identity is required",
        401
    );
});

test("rejects negative user ID", async () => {
    await expectComplaintError(
        { user_id: -1 },
        validData,
        "Authenticated user identity is required",
        401
    );
});

test("rejects invalid category ID", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, category_id: "invalid" },
        "A valid category_id is required"
    );
});

test("rejects missing title", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, title: "   " },
        "Title is required and must not exceed 150 characters"
    );
});

test("rejects title longer than 150 characters", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, title: "A".repeat(151) },
        "Title is required and must not exceed 150 characters"
    );
});

test("rejects empty description", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, description: "   " },
        "Description is required and must not exceed 5000 characters"
    );
});

test("rejects description longer than 5000 characters", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, description: "A".repeat(5001) },
        "Description is required and must not exceed 5000 characters"
    );
});

test("rejects invalid severity", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, severity: "URGENT" },
        "Invalid severity value"
    );
});

test("rejects invalid urgency", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, urgency: "IMMEDIATE" },
        "Invalid urgency value"
    );
});

test("rejects invalid room ID", async () => {
    await expectComplaintError(
        validUser,
        { ...validData, room_id: -5 },
        "room_id must be a positive integer or null"
    );
});
