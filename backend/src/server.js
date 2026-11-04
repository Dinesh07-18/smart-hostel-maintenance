const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const healthRoutes = require("./routes/health.routes");
const complaintRoutes = require("./routes/complaint.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Smart Hostel Maintenance API is running",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/health", healthRoutes);
app.use("/api/complaints", complaintRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});

