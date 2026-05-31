const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");

const uploadOriginalImage = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No image file uploaded." });
    }

    // Initialize a secure upload stream directly into Cloudinary's media cloud
      const uploadStream = cloudinary.uploader.upload_stream({ folder: "project-pixel/originals" },
        async (error, result) => {
        if (error) {
          console.error(error);
          return res
            .status(500)
            .json({ success: false, message: "Cloudinary streaming failed." });
        }

        // Save the image metadata and CDN link to MongoDB linked to the active user ID
        const newProject = await ImageProject.create({
          user: req.user._id,
          originalName: req.file.originalname,
          originalUrl: result.secure_url,
          category: "NONE",
          techniqueApplied: "NONE",
          metadata: {
            width: result.width,
            height: result.height,
            fileSizeInBytes: result.bytes,
          },
        });

        return res.status(201).json({
          success: true,
          message: "Image uploaded successfully to Cloud CDN",
          project: newProject,
        });
      },
    );

    // Write the raw binary file buffer chunks into the active upload stream
    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Upload thread crash." });
  }
};

module.exports = {
  uploadOriginalImage,
};
