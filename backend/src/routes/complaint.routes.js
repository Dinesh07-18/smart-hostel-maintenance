const express = require("express");
const pool = require("../config/database");

const {
    createComplaint,
    ComplaintError
} = require("../services/complaint.service");

const {
    listStudentComplaints
} = require("../services/complaint-query.service");

const router = express.Router();

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

module.exports = router;
