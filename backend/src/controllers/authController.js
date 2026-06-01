const redis = require("../config/redis");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email missing." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(`otp:${email}`, otp, { ex: 300 });
    console.log(
      `[OTP Cached to Redis]: ${otp} for ${email} (expires in 5 minutes)`,
    );

    await resend.emails.send({
      from: "Pixel Lab System <onboarding@resend.dev>",
      to: email,
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
        "Resend gateway routing or Redis cluster network connection failure.",
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const cachedOtp = await redis.get(`otp:${email}`);

    if (!cachedOtp || cachedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired security clearance token.",
      });
    }

    await redis.del(`otp:${email}`);

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email });
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
