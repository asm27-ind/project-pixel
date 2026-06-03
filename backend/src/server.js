// backend/src/server.js
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

// CORS middleware — handles preflights and allows localtunnel domains
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
  ];

  if (
    allowedOrigins.includes(origin) ||
    (origin && origin.includes("loca.lt"))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, bypass-tunnel-reminder",
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/api/v1", globalLimiter);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/images", imageRoutes);


// Health check
app.get("/", (req, res) => {
  res.status(200).json({ status: "online" });
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[App Gateway Online]: Port ${PORT}`));
