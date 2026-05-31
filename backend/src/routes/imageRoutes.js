const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadOriginalImage } = require("../controllers/imageController");

router.post("/upload", protect, upload.single("image"), uploadOriginalImage);

module.exports = router;
