const express = require("express");
const router = express.Router();
const { uploadOriginalImage } = require("../controllers/imageController");
const { executeDipAlgorithm } = require("../controllers/processController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { heavyProcessingLimiter } = require("../middleware/rateLimiter");

router.post("/upload", protect, upload.single("image"), uploadOriginalImage);
router.post("/transform", protect, heavyProcessingLimiter, executeDipAlgorithm);

module.exports = router;
