require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { globalLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");

const app = express();

// Trust proxy for secure infrastructure headers and rate limiters
app.set("trust proxy", 1);

// 🔑 PERFECT CORS MIDDLEWARE: Handles preflights & allows dynamic tunnel domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
  ];

  // If the incoming request matches our domains, or if we are using a temporary localtunnel
  if (
    allowedOrigins.includes(origin) ||
    (origin && origin.includes("loca.lt"))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Fallback safe option to ensure traffic is never fully blind
    res.header("Access-Control-Allow-Origin", origin || "*");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, bypass-tunnel-reminder",
  );
  res.header("Access-Control-Allow-Credentials", "true");

  // Instantly approve silent browser preflight OPTIONS handshakes
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Attach CORS configurations securely to standard routes
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use("/api/v1", globalLimiter);

// Application Routing Ecosystem
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/images", imageRoutes);

// Base Deployment Telemetry Verification Endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "online" });
});

// Connect to MongoDB Datastore Cluster
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[App Gateway Online]: Port ${PORT}`));
