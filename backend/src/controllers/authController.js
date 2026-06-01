const redis = require("../config/redis");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email missing." });

    // Generate strict numerical 6-digit verification sequence
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store inside Upstash serverless Redis cluster with a strict 5-minute time-to-live cache boundary
    await redis.set(`otp:${email}`, otp, { ex: 300 });

    return res
      .status(200)
      .json({
        success: true,
        message: "Security payload dispatched to terminal cache.",
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Redis cluster routing failure.",
        error: error.message,
      });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cachedOtp = await redis.get(`otp:${email}`);

    if (!cachedOtp || cachedOtp !== otp) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid or expired security clearance token.",
        });
    }

    // Clean up cache row immediately upon positive verification pass
    await redis.del(`otp:${email}`);

    // JIT Provisioning Strategy: Automatically instantiate an account block if none exists
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
    }

    // Sign session authentication token payload
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res
      .status(200)
      .json({
        success: true,
        token,
        user: { id: user._id, email: user.email },
      });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Authentication microservice failure.",
        error: error.message,
      });
  }
};

module.exports = { requestOtp, verifyOtp };
