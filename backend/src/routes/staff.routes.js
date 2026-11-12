const express = require("express");
const pool = require("../config/database");
const authenticateToken = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticateToken);
router.use(allowRoles("MAINTENANCE_STAFF"));

// GET /api/staff/complaints
router.get("/complaints", async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT
                c.complaint_id,
                c.title,
                c.description,
                c.severity,
                c.urgency,
                c.status,
                c.submitted_at,
                cc.category_name,
                h.hostel_name,
                r.room_number,
                ca.assigned_at
            FROM maintenance_staff_profiles msp
            JOIN complaint_assignments ca
                ON ca.staff_id = msp.staff_id
            JOIN complaints c
                ON c.complaint_id = ca.complaint_id
            JOIN complaint_categories cc
                ON cc.category_id = c.category_id
            JOIN hostels h
                ON h.hostel_id = c.hostel_id
            LEFT JOIN rooms r
                ON r.room_id = c.room_id
            WHERE msp.user_id = ?
              AND ca.assignment_status = 'ACTIVE'
              AND ca.unassigned_at IS NULL
            ORDER BY ca.assigned_at DESC
        `, [req.user.user_id]);

        return res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error("Staff complaint listing failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve assigned complaints"
        });
    }
});

// PATCH /api/staff/complaints/:id/status
router.patch("/complaints/:id/status", async (req, res) => {
    const complaintId = Number(req.params.id);
    const newStatus = req.body.status;

    if (!Number.isInteger(complaintId) || complaintId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid complaint ID"
        });
    }

    if (!["IN_PROGRESS", "RESOLVED"].includes(newStatus)) {
        return res.status(400).json({
            success: false,
            message: "Staff may set status to IN_PROGRESS or RESOLVED"
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(`
            SELECT c.status
            FROM maintenance_staff_profiles msp
            JOIN complaint_assignments ca
                ON ca.staff_id = msp.staff_id
            JOIN complaints c
                ON c.complaint_id = ca.complaint_id
            WHERE msp.user_id = ?
              AND c.complaint_id = ?
              AND ca.assignment_status = 'ACTIVE'
              AND ca.unassigned_at IS NULL
            FOR UPDATE
        `, [req.user.user_id, complaintId]);

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: "Complaint is not actively assigned to you"
            });
        }

        const currentStatus = rows[0].status;

        const validTransition =
            (currentStatus === "ASSIGNED" && newStatus === "IN_PROGRESS") ||
            (currentStatus === "IN_PROGRESS" && newStatus === "RESOLVED");

        if (!validTransition) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: `Cannot change complaint status from ${currentStatus} to ${newStatus}`
            });
        }

        // The trigger reads this variable on this same connection.
        await connection.execute(
            "SET @app_user_id = ?",
            [req.user.user_id]
        );

        await connection.execute(`
            UPDATE complaints
            SET status = ?,
                resolved_at = CASE
                    WHEN ? = 'RESOLVED' THEN NOW()
                    ELSE resolved_at
                END,
                updated_at = NOW()
            WHERE complaint_id = ?
        `, [newStatus, newStatus, complaintId]);

        if (newStatus === "RESOLVED") {
            await connection.execute(`
                UPDATE complaint_assignments
                SET assignment_status = 'COMPLETED',
                    unassigned_at = NOW()
                WHERE complaint_id = ?
                  AND assignment_status = 'ACTIVE'
                  AND unassigned_at IS NULL
            `, [complaintId]);
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Complaint status updated successfully",
            data: {
                complaint_id: complaintId,
                previous_status: currentStatus,
                status: newStatus
            }
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("Staff status update failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update complaint status"
        });
    } finally {
        if (connection) {
            try {
                await connection.execute("SET @app_user_id = NULL");
            } catch (error) {
                console.error("Failed to clear audit session variable:", error.message);
            }
            connection.release();
        }
    }
});

module.exports = router;
