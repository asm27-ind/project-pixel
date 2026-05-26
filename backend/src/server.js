const express = require("express");
const cors = require("cors");
require("dotenv").config();
const {
  standardLimiter,
  heavyProcessingLimiter,
} = require("./middleware/rateLimiter");

const app = express();

// Required setup for deployment environments (Render, Railway, Vercel) to capture real client IPs
app.set("trust proxy", 1);

// Security and Parsing Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" })); // Blocks massive JSON bodies early

// Mount global rate limiting
app.use(standardLimiter);

// System Health Route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date() });
});

// Dummy processing route to test rate limiter thresholds
app.post("/api/v1/image/process-test", heavyProcessingLimiter, (req, res) => {
  res
    .status(200)
    .json({ success: true, message: "Compute processing validated." });
});

// Prevent tests from hanging onto the network port indefinitely
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`[Server Engaged]: Running on port ${PORT}`),
  );
}

module.exports = app;
