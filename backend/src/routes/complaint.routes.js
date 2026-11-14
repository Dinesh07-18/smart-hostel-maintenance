const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const pool = require("../config/database");
const allowRoles = require("../middleware/role.middleware");
const { findSimilarComplaints } = require("../services/vector.service");
const rateLimit = require("../middleware/rate-limit.middleware");

const {
    createComplaint,
    ComplaintError
} = require("../services/complaint.service");

const {
    listStudentComplaints
} = require("../services/complaint-query.service");

const router = express.Router();
const {
    getStudentComplaintDetails
} = require("../services/complaint-details.service");


// GET /api/complaints/categories
router.get("/categories", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT category_id, category_name, description
            FROM complaint_categories
            WHERE is_active = 1
            ORDER BY category_name ASC
        `);

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error("Failed to fetch complaint categories:", error.message);

        return res.status(503).json({
            success: false,
            message: "Unable to retrieve complaint categories"
        });
    }
});


router.use(authenticateToken);
router.use(allowRoles("STUDENT"));

// GET /api/complaints
router.get("/", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication is required"
            });
        }

        const result = await listStudentComplaints(req.user, {
            page: req.query.page,
            limit: req.query.limit
        });

        return res.status(200).json({
            success: true,
            data: result.complaints,
            pagination: result.pagination
        });
    } catch (error) {
        if (error instanceof ComplaintError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Failed to retrieve complaints:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaints"
        });
    }
});

// POST /api/complaints
// Authentication middleware will be integrated with Member B's implementation.


// GET /api/complaints/:id
router.get("/:id", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication is required"
            });
        }

        const complaint = await getStudentComplaintDetails(
            req.user,
            req.params.id
        );

        return res.status(200).json({
            success: true,
            data: complaint
        });
    } catch (error) {
        if (error instanceof ComplaintError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Failed to retrieve complaint details:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve complaint details"
        });
    }
});

router.post("/", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication is required"
            });
        }

        const complaint = await createComplaint(req.user, req.body);

        return res.status(201).json({
            success: true,
            message: "Complaint submitted successfully",
            data: complaint
        });
    } catch (error) {
        if (error instanceof ComplaintError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Complaint creation failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to create complaint"
        });
    }
});


router.post("/similar", rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many semantic searches. Try again shortly." }), async (req, res) => {
    try {
        const text = [
            typeof req.body.title === "string" ? req.body.title.trim() : "",
            typeof req.body.description === "string" ? req.body.description.trim() : ""
        ].filter(Boolean).join("\n");
        if (text.length < 3 || text.length > 5150) {
            return res.status(400).json({ success: false, message: "Provide complaint text between 3 and 5150 characters" });
        }
        const result = await findSimilarComplaints(req.user, text, 5);
        return res.status(200).json({ success: true, data: result.matches });
    } catch (error) {
        console.error("Similar complaint search failed:", error.message);
        return res.status(503).json({ success: false, message: "Similar complaint search is temporarily unavailable" });
    }
});

module.exports = router;
