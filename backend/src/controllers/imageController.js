const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");

const uploadOriginalImage = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file received." });

    const cleanName = req.file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const publicId = `user_${req.user._id}_${cleanName}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "project-pixel/original",
          resource_type: "auto",
          public_id: publicId,
          overwrite: true,
          invalidate: true,
        },
        (err, data) => (err ? reject(err) : resolve(data)),
      );
      stream.end(req.file.buffer);
    });

    const project = await ImageProject.findOneAndUpdate(
      { user: req.user._id, originalName: req.file.originalname },
      {
        user: req.user._id,
        originalName: req.file.originalname,
        originalUrl: result.secure_url,
        processedUrl: null,
        techniqueApplied: "NONE",
        metadata: {
          width: result.width,
          height: result.height,
          fileSizeInBytes: result.bytes,
          compressedSizeInBytes: null,
          processingTimeMs: 0,
          cloudinaryPublicId: result.public_id,
        },
        createdAt: Date.now(),
      },
      { returnDocument: 'after', upsert: true },
    );

    return res.status(201).json({ success: true, project });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Upload failed.",
        error: error.message,
      });
  }
};

module.exports = { uploadOriginalImage };
