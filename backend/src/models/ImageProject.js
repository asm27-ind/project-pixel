const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

const ImageProjectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400,
    },
  },
  { timestamps: true },
);

ImageProjectSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.metadata && doc.metadata.cloudinaryPublicId) {
    try {
      await cloudinary.uploader.destroy(doc.metadata.cloudinaryPublicId);

      const processedId = `project-pixel/processed/processed-${doc._id}`;
      await cloudinary.uploader.destroy(processedId);

      console.log(
        `[Storage Purge Success]: Cleaned up asset slots for project: ${doc._id}`,
      );
    } catch (error) {
      console.error(
        `[Storage Purge Failure]: Failed to auto-delete from Cloudinary: ${error.message}`,
      );
    }
  }
});

module.exports = mongoose.model("ImageProject", ImageProjectSchema);
