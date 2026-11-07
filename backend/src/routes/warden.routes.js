const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const {
    listWardenComplaints,
    listAssignableStaff,
    assignComplaint
} = require("../services/warden.service");
const { ComplaintError } = require("../services/complaint.service");

const router = express.Router();

router.use(authenticateToken);
router.use(allowRoles("WARDEN", "ADMINISTRATOR"));

function handleError(res, error, fallbackMessage) {
    if (error instanceof ComplaintError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }
    console.error(fallbackMessage, error.message);
    return res.status(500).json({
        success: false,
        message: fallbackMessage
    });
}

// GET /api/warden/complaints
router.get("/complaints", async (req, res) => {
    try {
        const result = await listWardenComplaints(req.user, {
            page: req.query.page,
            limit: req.query.limit,
            status: req.query.status
        });
        return res.status(200).json({
            success: true,
            data: result.complaints,
            pagination: result.pagination
        });
    } catch (error) {
        return handleError(res, error, "Unable to retrieve hostel complaints");
    }
});

// GET /api/warden/staff?hostel_id=1
router.get("/staff", async (req, res) => {
    try {
        const data = await listAssignableStaff(req.user, req.query.hostel_id);
        return res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        return handleError(res, error, "Unable to retrieve maintenance staff");
    }
});

// POST /api/warden/complaints/:id/assign
router.post("/complaints/:id/assign", async (req, res) => {
    try {
        const data = await assignComplaint(req.user, req.params.id, req.body);
        return res.status(200).json({
            success: true,
            message: "Complaint assigned successfully",
            data
        });
    } catch (error) {
        return handleError(res, error, "Unable to assign complaint");
    }
});

module.exports = router;
