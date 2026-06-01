const axios = require("axios");
const sharp = require("sharp");
const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");

const stretching = async (img) => img.linear(1.4, -20);
const gammaAdjust = async (img) => img.gamma(2.2);
const lowPassMean = async (img) => img.blur(2);
const spatialMedian = async (img) => img.median(3);

const uploadOriginalImage = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file buffer received." });

    const cleanFileName = req.file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9]/g, "_");
    const customStorageId = `user_${req.user._id}_${cleanFileName}`;

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

    const project = await ImageProject.findOneAndUpdate(
      { user: req.user._id, originalName: req.file.originalname },
      {
        originalUrl: result.secure_url,
        processedUrl: null,
        techniqueApplied: "NONE",
        metadata: {
          width: result.width,
          height: result.height,
          fileSizeInBytes: result.bytes,
          cloudinaryPublicId: result.public_id,
        },
        createdAt: Date.now(),
      },
      { new: true, upsert: true },
    );

    return res.status(201).json({ success: true, project });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "CDN Ingestion block crash.",
        error: error.message,
      });
  }
};

const executeTransformation = async (req, res) => {
  try {
    const { projectId, algorithm } = req.body;
    const project = await ImageProject.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project context missing." });

    const startTime = performance.now();
    const download = await axios.get(project.originalUrl, {
      responseType: "arraybuffer",
    });
    const buffer = Buffer.from(download.data);

    let pipe = sharp(buffer);
    let mockCompress = null;

    if (algorithm === "CONTRAST_STRETCHING") pipe = await stretching(pipe);
    else if (algorithm === "GAMMA_CORRECTION") pipe = await gammaAdjust(pipe);
    else if (algorithm === "MEAN_FILTER") pipe = await lowPassMean(pipe);
    else if (algorithm === "MEDIAN_FILTER") pipe = await spatialMedian(pipe);
    else if (algorithm === "HISTOGRAM_EQUALIZATION" || algorithm === "CLAHE")
      pipe = pipe.greyscale().clahe({ width: 12, height: 12 });
    else if (algorithm === "INVERSE_FILTER" || algorithm === "WIENER_FILTER")
      pipe = pipe.negate();
    else if (
      ["LZW_COMPRESSION", "HUFFMAN_CODING", "ARITHMETIC_CODING"].includes(
        algorithm,
      )
    ) {
      mockCompress = Math.ceil((4.3 * buffer.length) / 8);
    }

    const outputBuffer = await pipe.png().toBuffer();
    const runtime = (performance.now() - startTime).toFixed(2);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "project-pixel/processed",
          public_id: `processed-${project._id}`,
        },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
      stream.end(outputBuffer);
    });

    project.processedUrl = result.secure_url;
    project.techniqueApplied = algorithm;
    project.metadata.processingTimeMs = parseFloat(runtime);
    if (mockCompress) project.metadata.compressedSizeInBytes = mockCompress;

    await project.save();
    return res.status(200).json({ success: true, project });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Pipeline calculation error.",
        error: error.message,
      });
  }
};

module.exports = { uploadOriginalImage, executeTransformation };
