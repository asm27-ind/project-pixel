const { spawn } = require("child_process");
const path = require("path");
const ImageProject = require("../models/ImageProject");

const executeDipAlgorithm = async (req, res) => {
  try {
    const { projectId, algorithm } = req.body;

    if (!projectId || !algorithm) {
      return res
        .status(400)
        .json({ success: false, message: "Missing parameters." });
    }

    const project = await ImageProject.findById(projectId);
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Image project not found." });
    }

    const scriptPath = path.join(__dirname, "../config/process_engine.py");

    const pythonProcess = spawn("python", [
      scriptPath,
      process.env.CLOUDINARY_CLOUD_NAME,
      process.env.CLOUDINARY_API_KEY,
      process.env.CLOUDINARY_API_SECRET,
    ]);

    const payload = JSON.stringify({
      imageUrl: project.originalUrl,
      algorithm: algorithm,
      projectId: project._id,
    });

    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();

    let outputBuffer = "";
    let errorBuffer = "";

    pythonProcess.stdout.on("data", (data) => {
      outputBuffer += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorBuffer += data.toString();
    });

    pythonProcess.on("close", async (code) => {
      if (code !== 0 || errorBuffer) {
        console.error(`[Python Error]: ${errorBuffer}`);
        return res
          .status(500)
          .json({ success: false, message: "Python execution failure." });
      }

      const result = JSON.parse(outputBuffer);
      if (!result.success) {
        return res.status(500).json({ success: false, message: result.error });
      }

      project.processedUrl = result.processedUrl;
      project.techniqueApplied = algorithm;
      project.metadata.processingTimeMs = result.processingTimeMs;

      if (
        [
          "CONTRAST_STRETCHING",
          "HISTOGRAM_EQUALIZATION",
          "CLAHE",
          "GAMMA_CORRECTION",
        ].includes(algorithm)
      ) {
        project.category = "ENHANCEMENT";
      } else if (
        [
          "MEDIAN_FILTER",
          "MEAN_FILTER",
          "WIENER_FILTER",
          "INVERSE_FILTER",
        ].includes(algorithm)
      ) {
        project.category = "RESTORATION";
      } else if (
        ["HUFFMAN_CODING", "ARITHMETIC_CODING", "LZW_COMPRESSION"].includes(
          algorithm,
        )
      ) {
        project.category = "ENCODING";
      }

      await project.save();

      return res.status(200).json({
        success: true,
        message: "Digital Image Processing transformation complete.",
        project,
      });
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal worker bridge error." });
  }
};

module.exports = { executeDipAlgorithm };
