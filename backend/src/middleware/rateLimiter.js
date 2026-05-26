const rateLimit = require('express-rate-limit')
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message:
      "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const heavyProcessingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // Allow only 5 heavy image conversions per minute per user
  message: {
    success: false,
    message:
      "Heavy processing capacity threshold reached. Please wait one minute.",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
module.exports = { standardLimiter, heavyProcessingLimiter };