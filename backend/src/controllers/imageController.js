const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");


const uploadOriginalImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "No file buffer received. Attach an image with field name 'image'.",
      });
    }

    const cleanFileName = req.file.originalname
      .replace(/\.[^/.]+$/, "") // strip extension
      .replace(/[^a-zA-Z0-9]/g, "_"); // sanitise special characters

    const customStorageId = `user_${req.user._id}_${cleanFileName}`;

    // Stream the in-memory buffer directly to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "project-pixel/original",
          resource_type: "auto",
          public_id: customStorageId,
          overwrite: true,
          invalidate: true,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
      stream.end(req.file.buffer);
    });

    // Upsert the project document — one project per user+filename combination
    const project = await ImageProject.findOneAndUpdate(
      { user: req.user._id, originalName: req.file.originalname },
      {
        user: req.user._id,
        originalName: req.file.originalname,
        originalUrl: result.secure_url,
        processedUrl: null,
        techniqueApplied: "NONE",
        category: null,
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
      { new: true, upsert: true },
    );

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully.",
      project,
    });
  } catch (error) {
    console.error("[uploadOriginalImage]:", error.message);
    return res.status(500).json({
      success: false,
      message: "Image upload to Cloudinary failed.",
      error: error.message,
    });
  }
};

module.exports = { uploadOriginalImage };
