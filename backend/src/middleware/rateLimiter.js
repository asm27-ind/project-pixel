const rateLimit = require("express-rate-limit");


const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window tracking
  max: 100, 
  message: {
    success: false,
    message:
      "Too many requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: "draft-8", 
  legacyHeaders: false,
});

// Strict threshold for heavy computational image transformations
const heavyProcessingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 5,
  message: {
    success: false,
    message:
      "Heavy processing capacity threshold reached. Please wait one minute.",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

module.exports = { standardLimiter, heavyProcessingLimiter };
