// backend/src/controllers/processController.js

const { spawn } = require("child_process");
const path = require("path");
const axios = require("axios");
const ImageProject = require("../models/ImageProject");

const ALGORITHM_CATEGORY = {
  CONTRAST_STRETCHING: "ENHANCEMENT",
  HISTOGRAM_EQUALIZATION: "ENHANCEMENT",
  CLAHE: "ENHANCEMENT",
  GAMMA_CORRECTION: "ENHANCEMENT",
  MEAN_FILTER: "RESTORATION",
  MEDIAN_FILTER: "RESTORATION",
  WIENER_FILTER: "RESTORATION",
  INVERSE_FILTER: "RESTORATION",
  HUFFMAN_CODING: "ENCODING",
  ARITHMETIC_CODING: "ENCODING",
  LZW_COMPRESSION: "ENCODING",
};

const executeDipAlgorithm = async (req, res) => {
  try {
    const { projectId, algorithm } = req.body;

    // ── Validate inputs ─────────────────────────────────────────────────────
    if (!projectId || !algorithm) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: projectId and algorithm.",
      });
    }

    if (!ALGORITHM_CATEGORY[algorithm]) {
      return res.status(400).json({
        success: false,
        message: `Unknown algorithm "${algorithm}". Valid: ${Object.keys(ALGORITHM_CATEGORY).join(", ")}`,
      });
    }

    // ── Load project ────────────────────────────────────────────────────────
    const project = await ImageProject.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Image project not found. Upload an image first.",
      });
    }

    if (!project.originalUrl) {
      return res.status(400).json({
        success: false,
        message: "Project has no source image. Re-upload the image.",
      });
    }

    // ── Download image from Cloudinary → convert to base64 ─────────────────
    // Passing the buffer directly to Python via stdin avoids any networking
    // issues inside the Python process (auth headers, proxy, etc.)
    let imageB64;
    try {
      const response = await axios.get(project.originalUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
      });
      imageB64 = Buffer.from(response.data).toString("base64");
    } catch (fetchErr) {
      return res.status(502).json({
        success: false,
        message: "Failed to download source image from Cloudinary.",
        detail: fetchErr.message,
      });
    }

    // ── Spawn Python engine ─────────────────────────────────────────────────
    const scriptPath = path.join(__dirname, "../config/process_engine.py");

    const pythonProcess = spawn("python3", [
      scriptPath,
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_API_KEY,
      process.env.CLOUDINARY_API_SECRET,
    ]);

    // Send image as base64 inside JSON — Python decodes it without any HTTP call
    const payload = JSON.stringify({
      imageB64,
      algorithm,
      projectId: String(project._id),
    });

    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();

    let stdoutBuffer = "";
    let stderrBuffer = "";

    pythonProcess.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
    });
    pythonProcess.stderr.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
    });

    // ── Handle python not found ─────────────────────────────────────────────
    pythonProcess.on("error", (spawnErr) => {
      console.error("[Spawn Error]:", spawnErr.message);
      return res.status(500).json({
        success: false,
        message:
          "Could not start Python. Ensure python3 is installed and in PATH.",
        detail: spawnErr.message,
      });
    });

    // ── Handle process exit ─────────────────────────────────────────────────
    pythonProcess.on("close", async (exitCode) => {
      if (stderrBuffer.trim()) {
        // Log warnings (e.g. cv2 deprecations) but don't fail on them
        console.warn("[Python stderr]:", stderrBuffer.trim());
      }

      if (exitCode !== 0) {
        console.error(`[Python Engine] Exited ${exitCode}:`, stderrBuffer);
        return res.status(500).json({
          success: false,
          message: "Python engine exited with an error.",
          detail: stderrBuffer || "No stderr captured.",
        });
      }

      // ── Parse JSON result from Python stdout ──────────────────────────────
      let result;
      try {
        result = JSON.parse(stdoutBuffer.trim());
      } catch {
        console.error("[Python Engine] Bad JSON output:", stdoutBuffer);
        return res.status(500).json({
          success: false,
          message: "Python engine returned malformed output.",
          raw: stdoutBuffer,
        });
      }

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.error || "Python engine reported failure.",
        });
      }

      // ── Save results to MongoDB ───────────────────────────────────────────
      project.processedUrl = result.processedUrl;
      project.techniqueApplied = algorithm;
      project.category = ALGORITHM_CATEGORY[algorithm];
      project.metadata.processingTimeMs = result.processingTimeMs ?? 0;

      if (result.compressedSizeInBytes != null) {
        project.metadata.compressedSizeInBytes = result.compressedSizeInBytes;
      }

      await project.save();

      return res.status(200).json({
        success: true,
        message: `${algorithm} applied successfully.`,
        project,
      });
    });
  } catch (error) {
    console.error("[processController] Unexpected error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      detail: error.message,
    });
  }
};

module.exports = { executeDipAlgorithm };
