const mongoose = require("mongoose");

const ImageProjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  originalUrl: {
    type: String,
    required: true, // Cloudinary live storage link for raw input image
  },
  processedUrl: {
    type: String,
    default: null, // Cloudinary destination URL after Python computational finish
  },
  category: {
    type: String,
    required: true,
    enum: ["ENHANCEMENT", "RESTORATION", "ENCODING", "NONE"],
    default: "NONE",
  },
  techniqueApplied: {
    type: String,
    enum: [
      "NONE",
      // ENHANCEMENT SUITE
      "CONTRAST_STRETCHING",
      "HISTOGRAM_EQUALIZATION",
      "CLAHE",
      "GAMMA_CORRECTION",
      // RESTORATION SUITE
      "MEDIAN_FILTER",
      "MEAN_FILTER",
      "WIENER_FILTER",
      "INVERSE_FILTER",
      // ENCODING SUITE
      "HUFFMAN_CODING",
      "ARITHMETIC_CODING",
      "LZW_COMPRESSION",
    ],
    default: "NONE",
  },
  metadata: {
    width: { type: Number },
    height: { type: Number },
    fileSizeInBytes: { type: Number },
    compressedSizeInBytes: { type: Number, default: null }, // Track actual LZW/Huffman byte reduction
    processingTimeMs: { type: Number, default: 0 }, // Performance benchmark metric to show off to interviewers
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("ImageProject", ImageProjectSchema);
