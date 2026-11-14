const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const allowRoles = require("../middleware/role.middleware");

const {
    AdminError,
    listUsers,
    listHostels,
    listAvailableRooms,
    getUserById,
    updateUserStatus,
    createUser
} = require("../services/admin.service");

const router = express.Router();

// Every Administrator endpoint requires authentication and ADMINISTRATOR role.
router.use(authenticateToken);
router.use(allowRoles("ADMINISTRATOR"));

function handleError(res, error) {
    if (error instanceof AdminError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    console.error("Administrator API error:", error);

    return res.status(500).json({
        success: false,
        message: "An internal server error occurred"
    });
}

// GET /api/admin/users
router.get("/users", async (req, res) => {
    try {
        const result = await listUsers({
            page: req.query.page,
            limit: req.query.limit,
            role: req.query.role,
            status: req.query.status,
            search: req.query.search
        });

        return res.status(200).json({
            success: true,
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        return handleError(res, error);
    }
});

// GET /api/admin/hostels
router.get("/hostels", async (_req, res) => {
    try {
        const data = await listHostels();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return handleError(res, error);
    }
});

// GET /api/admin/hostels/:id/rooms — only rooms with available capacity.
router.get("/hostels/:id/rooms", async (req, res) => {
    try {
        const data = await listAvailableRooms(req.params.id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return handleError(res, error);
    }
});

// GET /api/admin/users/:id
router.get("/users/:id", async (req, res) => {
    try {
        const user = await getUserById(req.params.id);

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        return handleError(res, error);
    }
});

// PATCH /api/admin/users/:id/status
router.patch("/users/:id/status", async (req, res) => {
    try {
        const result = await updateUserStatus(
            req.user,
            req.params.id,
            req.body,
            req.ip
        );

        return res.status(200).json({
            success: true,
            message: result.changed
                ? "User account status updated successfully"
                : "User account already has the requested status",
            data: result
        });
    } catch (error) {
        return handleError(res, error);
    }
});


// POST /api/admin/users
router.post("/users", async (req, res) => {
    try {
        const result = await createUser(
            req.user,
            req.body,
            req.ip
        );

        return res.status(201).json({
            success: true,
            message: "User account created successfully",
            data: result
        });
    } catch (error) {
        return handleError(res, error);
    }
});
module.exports = router;
