require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { globalLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const imageRoutes = require("./routes/imageRoutes");

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        process.env.FRONTEND_URL,
      ];
      if (
        !origin ||
        allowed.includes(origin) ||
        allowed.includes(origin + "/")
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS Access Denied"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use("/api/v1", globalLimiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/images", imageRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ status: "online" });
});

connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[App Gateway Online]: Port ${PORT}`));
