const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { standardLimiter } = require("./middleware/rateLimiter");

const app = express();

// Required configuration when deploying to free tiers like Render/Railway
app.set("trust proxy", 1);

// Standard defensive middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// Apply rate limiter firewall to all routes
app.use(standardLimiter);

// System Health Verification Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Start the local development server immediately
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`[Server Engaged]: Running on port ${PORT}`),
);

module.exports = app;
