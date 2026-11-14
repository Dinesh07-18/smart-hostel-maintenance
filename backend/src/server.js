require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/health.routes");
const complaintRoutes = require("./routes/complaint.routes");
const authRoutes = require("./routes/auth.routes");
const staffRoutes = require("./routes/staff.routes");
const wardenRoutes = require("./routes/warden.routes");
const adminRoutes = require("./routes/admin.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const searchRoutes = require("./routes/search.routes");

const app = express();

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, "utf8") < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 bytes before the API starts.");
}

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",").map(value => value.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        // Permit non-browser clients (for example local scripts) without an Origin header.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Hostel Complaint Management API is running",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/warden", wardenRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/search", searchRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.message === "Origin is not allowed by CORS") {
        return res.status(403).json({ success: false, message: "Origin is not allowed" });
    }
    console.error("Unhandled API middleware error:", error.message);
    return res.status(500).json({ success: false, message: "An internal server error occurred" });
});

const PORT = Number(process.env.PORT || 5001);

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
