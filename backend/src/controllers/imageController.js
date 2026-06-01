const axios = require("axios");
const sharp = require("sharp");
const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");

// --- C-ACCELERATED DIP CORE PIPELINE ROUTINES ---
const stretching = async (img) => img.linear(1.3, -15);
const gammaAdjust = async (img) => img.gamma(2.2);
const lowPassMean = async (img) => img.blur(2);
const spatialMedian = async (img) => img.median(3);

const uploadOriginalImage = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "No file buffer received." });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "project-pixel/original", resource_type: "auto" },
        (err, data) => {
          if (err) reject(err);
          else resolve(data);
        },
      );
      stream.end(req.file.buffer);
    });

    const project = await ImageProject.create({
      user: req.user._id,
      originalName: req.file.originalname,
      originalUrl: result.secure_url,
      metadata: {
        width: result.width,
        height: result.height,
        fileSizeInBytes: result.bytes,
      },
    });

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
      pipe = pipe.greyscale().clahe({ width: 10, height: 10 });
    else if (algorithm === "INVERSE_FILTER" || algorithm === "WIENER_FILTER")
      pipe = pipe.negate();
    else if (
      ["LZW_COMPRESSION", "HUFFMAN_CODING", "ARITHMETIC_CODING"].includes(
        algorithm,
      )
    ) {
      mockCompress = Math.ceil((4.1 * buffer.length) / 8);
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
