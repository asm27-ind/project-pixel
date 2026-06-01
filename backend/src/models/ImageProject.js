const mongoose = require("mongoose");

const ImageProjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    originalName: { type: String, required: true },
    originalUrl: { type: String, required: true },
    processedUrl: { type: String, default: null },
    techniqueApplied: { type: String, default: "NONE" },
    metadata: {
      width: { type: Number },
      height: { type: Number },
      fileSizeInBytes: { type: Number },
      compressedSizeInBytes: { type: Number, default: null },
      processingTimeMs: { type: Number, default: 0 },
      cloudinaryPublicId: { type: String },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ImageProject", ImageProjectSchema);
