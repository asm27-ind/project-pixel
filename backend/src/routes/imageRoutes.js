const express = require("express");
const router = express.Router();
const {
  uploadOriginalImage,
  executeTransformation,
} = require("../controllers/imageController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { heavyProcessingLimiter } = require("../middleware/rateLimiter");

router.post("/upload", protect, upload.single("image"), uploadOriginalImage);
router.post(
  "/transform",
  protect,
  heavyProcessingLimiter,
  executeTransformation,
);

module.exports = router;
