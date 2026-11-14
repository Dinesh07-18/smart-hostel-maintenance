const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const rateLimit = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many login attempts. Try again in 15 minutes." }), async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
            console.error("JWT_SECRET is not configured");
            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured"
            });
        }

        const [rows] = await pool.execute(`
            SELECT u.user_id, u.full_name, u.email,
                   u.password_hash, u.account_status, r.role_name
            FROM users u
            INNER JOIN roles r ON r.role_id = u.role_id
            WHERE u.email = ?
            LIMIT 1
        `, [email.trim()]);

        if (!rows.length || rows[0].account_status !== "ACTIVE") {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { sub: String(user.user_id) },
            process.env.JWT_SECRET,
            { expiresIn: "8h", issuer: "smart-hostel-maintenance", algorithm: "HS256" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                role: user.role_name
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to process login"
        });
    }
});

module.exports = router;
