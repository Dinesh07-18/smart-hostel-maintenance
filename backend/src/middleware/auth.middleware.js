const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function authenticateToken(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication token is required"
        });
    }

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is not configured");
        return res.status(500).json({
            success: false,
            message: "Authentication service is not configured"
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userId = Number(payload.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        const [rows] = await pool.execute(`
            SELECT u.user_id, u.full_name, u.email,
                   u.account_status, r.role_name
            FROM users u
            INNER JOIN roles r ON r.role_id = u.role_id
            WHERE u.user_id = ?
            LIMIT 1
        `, [userId]);

        if (!rows.length || rows[0].account_status !== "ACTIVE") {
            return res.status(401).json({
                success: false,
                message: "Account is inactive or unavailable"
            });
        }

        req.user = {
            user_id: rows[0].user_id,
            full_name: rows[0].full_name,
            email: rows[0].email,
            role: rows[0].role_name
        };

        next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token"
            });
        }

        console.error("Authentication error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Authentication failed"
        });
    }
}

module.exports = authenticateToken;
