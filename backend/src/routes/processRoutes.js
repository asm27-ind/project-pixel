const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { executeDipAlgorithm } = require("../controllers/processController");

router.post("/execute", protect, executeDipAlgorithm);

module.exports = router;
