const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

require("./config/redis");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");
const { standardLimiter } = require("./middleware/rateLimiter");

const app = express();

// Database Handshake
connectDB();

// Global Setup
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(standardLimiter);

// Endpoint Assignments
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/images", imageRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", project: "Pixel DIP Engine" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`[Server Engaged]: Running on port ${PORT}`),
);

module.exports = app;
