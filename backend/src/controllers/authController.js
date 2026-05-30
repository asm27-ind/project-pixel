const redisClient = require("../config/redis");
const User = require("../models/User");
const { Resend } = require("resend");
const jwt = require("jsonwebtoken");

const resend = new Resend(process.env.RESEND_API_KEY);

const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `otp:${email.trim().toLowerCase()}`;
    await redisClient.setEx(redisKey, 300, otp);

    await resend.emails.send({
      from: "Project Pixel <onboarding@resend.dev>",
      to: email.trim(),
      subject: "🔑 Verification Code",
      html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Project Pixel Code:</h2>
              <h1 style="font-size: 32px; color: #2563eb;">${otp}</h1>
             </div>`,
    });

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payloads" });
    }

    const redisKey = `otp:${email.trim().toLowerCase()}`;
    const cachedOtp = await redisClient.get(redisKey);

    if (!cachedOtp || cachedOtp !== otp.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    await redisClient.del(redisKey);

    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      user = await User.create({
        email: email.trim().toLowerCase(),
        displayName: email.split("@")[0],
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, email: user.email, displayName: user.displayName },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  requestOtp,
  verifyOtp,
};
