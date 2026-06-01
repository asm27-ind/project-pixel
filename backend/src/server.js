require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { globalLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/v1", globalLimiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/images", imageRoutes);

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`[App Gateway Online]: Listening securely on port ${PORT}`),
);
