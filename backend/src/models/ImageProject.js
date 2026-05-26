const mongoose = require("mongoose");

const ImageProjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  originalName: { type: String, required: true, trim: true },
  originalUrl: { type: String, required: true }, // Cloud storage link (Cloudinary/S3)
  processedUrl: { type: String, default: null },
  techniqueApplied: {
    type: String,
    enum: [
      "NONE",
      "HISTOGRAM_EQUALIZATION",
      "CONTRAST_STRETCHING",
      "HUFFMAN_ENCODING",
    ],
    default: "NONE",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ImageProject", ImageProjectSchema);
