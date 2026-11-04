const express = require("express");
const pool = require("../config/database");

const router = express.Router();

router.get("/db", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT VERSION() AS mysql_version, DATABASE() AS database_name"
        );

        res.status(200).json({
            success: true,
            message: "Database connection is healthy",
            database: rows[0].database_name,
            version: rows[0].mysql_version
        });
    } catch (error) {
        console.error("Database health check failed:", error.message);

        res.status(503).json({
            success: false,
            message: "Database connection unavailable"
        });
    }
});

module.exports = router;
