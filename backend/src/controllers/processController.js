const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");
const cloudinary = require("../config/cloudinary");
const ImageProject = require("../models/ImageProject");

const CATEGORY = {
  CONTRAST_STRETCHING: "ENHANCEMENT",
  HISTOGRAM_EQUALIZATION: "ENHANCEMENT",
  CLAHE: "ENHANCEMENT",
  GAMMA_CORRECTION: "ENHANCEMENT",
  HIGH_BOOST_LAPLACIAN: "ENHANCEMENT",
  MEAN_FILTER: "RESTORATION",
  MEDIAN_FILTER: "RESTORATION",
  WIENER_FILTER: "RESTORATION",
  INVERSE_FILTER: "RESTORATION",
  HUFFMAN_CODING: "ENCODING",
  ARITHMETIC_CODING: "ENCODING",
  LZW_COMPRESSION: "ENCODING",
  OTSU_THRESHOLDING: "SEGMENTATION",
  KMEANS_SEGMENTATION: "SEGMENTATION",
};

const executeDipAlgorithm = async (req, res) => {
  try {
    const { projectId, algorithm } = req.body;

    if (!projectId || !algorithm)
      return res
        .status(400)
        .json({ success: false, message: "Missing projectId or algorithm." });

    if (!CATEGORY[algorithm])
      return res
        .status(400)
        .json({ success: false, message: `Unknown algorithm: ${algorithm}` });

    const project = await ImageProject.findById(projectId);
    if (!project)
      return res
        .status(404)
        .json({ success: false, message: "Project not found." });

    // Force Cloudinary to dynamically convert to PNG if it's stored in a format (like AVIF or WebP)
    // that OpenCV's basic build cannot natively decode.
    let imageUrl = project.originalUrl;
    const urlParts = imageUrl.split(".");
    if (urlParts.length > 1) {
      const ext = urlParts[urlParts.length - 1].toLowerCase().split("?")[0];
      if (ext !== "png" && ext !== "jpg" && ext !== "jpeg") {
        urlParts[urlParts.length - 1] = "png";
        imageUrl = urlParts.join(".");
      }
    }

    // Download image in Node (has all auth context) → pass as base64 to Python
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });
    const imageB64 = Buffer.from(response.data).toString("base64");

    const scriptPath = path.join(__dirname, "../config/process_engine.py");
    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    let responded = false;
    const sendResponse = (statusCode, data) => {
      if (responded) return;
      responded = true;
      res.status(statusCode).json(data);
    };

    const py = spawn(pythonCmd, [
      scriptPath,
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_API_KEY,
      process.env.CLOUDINARY_API_SECRET,
    ]);

    py.stdin.on("error", (e) => {
      console.error("[Node.js Process Guard] Python stdin write error:", e.message);
    });

    py.stdin.write(
      JSON.stringify({ imageB64, algorithm, projectId: String(project._id) }),
    );
    py.stdin.end();

    let out = "",
      err = "";
    py.stdout.on("data", (d) => {
      out += d.toString();
    });
    py.stderr.on("data", (d) => {
      err += d.toString();
    });

    py.on("error", (e) => {
      sendResponse(500, {
        success: false,
        message: `${pythonCmd} not found in PATH.`,
        detail: e.message,
      });
    });

    py.on("close", async (code) => {
      if (responded) return;
      if (err.trim()) console.warn("[Python stderr]:", err.trim());

      if (code !== 0) {
        return sendResponse(500, {
          success: false,
          message: "Python engine error.",
          detail: err,
        });
      }

      let result;
      try {
        result = JSON.parse(out.trim());
      } catch {
        return sendResponse(500, {
          success: false,
          message: "Bad output from Python.",
          raw: out,
        });
      }

      if (!result.success)
        return sendResponse(500, { success: false, message: result.error });

      const processedBuffer = Buffer.from(result.processedB64, "base64");
      let cloudinaryResult;
      try {
        cloudinaryResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "project-pixel/processed",
              public_id: `processed-${project._id}`,
              resource_type: "image",
              overwrite: true,
              invalidate: true,
            },
            (err, data) => (err ? reject(err) : resolve(data))
          );
          stream.end(processedBuffer);
        });
      } catch (uploadErr) {
        return sendResponse(500, {
          success: false,
          message: "Failed to upload processed image to Cloudinary.",
          detail: uploadErr.message,
        });
      }

      project.processedUrl = cloudinaryResult.secure_url;
      project.techniqueApplied = algorithm;
      project.category = CATEGORY[algorithm];
      project.metadata.processingTimeMs = result.processingTimeMs ?? 0;
      if (result.compressedSizeInBytes != null)
        project.metadata.compressedSizeInBytes = result.compressedSizeInBytes;

      await project.save();
      return sendResponse(200, {
        success: true,
        message: `${algorithm} applied.`,
        project,
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { executeDipAlgorithm };
