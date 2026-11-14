const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");
const { searchComplaints } = require("../services/vector.service");
const rateLimit = require("../middleware/rate-limit.middleware");

const router = express.Router();
router.use(authenticateToken);
router.use(allowRoles("STUDENT", "MAINTENANCE_STAFF", "WARDEN", "ADMINISTRATOR"));

// POST /api/search/complaints — semantic search scoped by authenticated role.
router.post("/complaints", rateLimit({ windowMs: 60 * 1000, max: 30, message: "Too many semantic searches. Try again shortly." }), async (req, res) => {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const requestedLimit = req.body?.limit === undefined ? 5 : Number(req.body.limit);
    if (text.length < 3 || text.length > 5150) {
        return res.status(400).json({ success: false, message: "Search text must contain between 3 and 5150 characters" });
    }
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 10) {
        return res.status(400).json({ success: false, message: "limit must be an integer between 1 and 10" });
    }
    try {
        const data = await searchComplaints(req.user, text, requestedLimit);
        return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        const status = Number.isInteger(error.statusCode) ? error.statusCode : 503;
        if (status >= 500) console.error("Semantic complaint search failed:", error.message);
        return res.status(status).json({
            success: false,
            message: status === 403 ? error.message : "Semantic search is temporarily unavailable"
        });
    }
});
module.exports = router;
