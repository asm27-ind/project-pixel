const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const { standardLimiter } = require("./middleware/rateLimiter");

const app = express();

connectDB();

// This guarantees the rate limiter tracks the real user's IP, not the hosting proxy's IP
app.set("trust proxy", 1);

// Standard Defensive Structural Middlewares
app.use(cors({ origin: true, credentials: true })); 

app.use(express.json({ limit: "2mb" }));

// Apply our standard security firewall globally to all paths
app.use(standardLimiter);

// System Health Verification Routing Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date(),
    project: "Pixel DIP Virtual Laboratory Platform Engine",
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Pixel DIP Lab backend server is running on port ${PORT}`);
});

module.exports = app;
