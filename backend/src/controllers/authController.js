const redis = require("../config/redis");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Initialize Nodemailer SMTP Engine with Gmail
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", 
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
});

const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email missing." });
    }

    // Sanitize input to lowercase to prevent case-sensitive mismatch routing issues
    const sanitizedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // FIXED: Universal Upstash Redis command pairing to support all driver setups cleanly
    await redis.set(`otp:${sanitizedEmail}`, otp);
    await redis.expire(`otp:${sanitizedEmail}`, 300); // 5-minute lifecycle expiry window

    await transporter.sendMail({
      from: `"Pixel Lab System" <${process.env.GMAIL_USER}>`,
      to: sanitizedEmail,
      subject: "🔒 Your Pixel Lab Access Clearance Token",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; background-color: #0b1329; color: #ffffff; border-radius: 12px; max-width: 450px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #38bdf8; font-size: 20px; font-weight: 600; margin-top: 0; border-bottom: 1px solid #1e293b; padding-bottom: 12px;">Workspace Authorization</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin-top: 16px;">Input the secure verification token below on your login portal view to authenticate your active session:</p>
          <div style="background-color: #111827; padding: 18px; text-align: center; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; border-radius: 8px; margin: 24px 0; border: 1px solid #334155;">
            ${otp}
          </div>
          <p style="font-size: 11px; color: #64748b; margin-bottom: 0; text-align: center;">This security payload is highly volatile. Cache lifecycle auto-purge runs in 5 minutes.</p>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Security payload dispatched directly to your email inbox.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Nodemailer SMTP handshake or Redis cluster network connection failure.",
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Required parameters missing." });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const cachedOtpRaw = await redis.get(`otp:${sanitizedEmail}`);

    // FIXED: Enforce clear, explicit string transformations to bypass any database driver type-casting anomalies
    const cachedOtp = cachedOtpRaw ? cachedOtpRaw.toString().trim() : null;
    const cleanInputOtp = otp.toString().trim();

    if (!cachedOtp || cachedOtp !== cleanInputOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired security clearance token.",
      });
    }

    await redis.del(`otp:${sanitizedEmail}`);

    let user = await User.findOne({ email: sanitizedEmail });
    if (!user) {
      const displayName = sanitizedEmail.split("@")[0];
      user = await User.create({ email: sanitizedEmail, displayName });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Authentication microservice failure.",
      error: error.message,
    });
  }
};

module.exports = { requestOtp, verifyOtp };
