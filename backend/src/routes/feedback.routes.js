const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const {
    submitFeedback,
    listStudentFeedback,
    FeedbackError
} = require("../services/feedback.service");

const router = express.Router();

router.use(authenticateToken);
router.use(allowRoles("STUDENT"));

router.post("/", async (req, res) => {
    try {
        const result = await submitFeedback(
            req.user,
            req.body?.complaint_id,
            req.body?.rating,
            req.body?.comments
        );

        return res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            data: result
        });
    } catch (error) {
        if (error instanceof FeedbackError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Feedback submission failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to submit feedback"
        });
    }
});

router.get("/", async (req, res) => {
    try {
        const rows = await listStudentFeedback(req.user);
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        if (error instanceof FeedbackError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Feedback history retrieval failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve feedback history"
        });
    }
});

module.exports = router;