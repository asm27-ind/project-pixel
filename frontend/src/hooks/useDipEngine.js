import { useState } from "react";
import { uploadImage, applyTransform } from "../services/imageService";

export function useDipEngine() {
  const [project, setProject] = useState(null);
  const [activeAlgo, setActiveAlgo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const downloadImage = async (url, fallbackName = "processed-image.png") => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("[downloadImage Error]:", err);
      setErrorMsg("Could not route file download stream from cloud CDN nodes.");
    }
  };

  const processUpload = async (file) => {
    setUploading(true);
    setErrorMsg("");
    setStatusMsg("Streaming binary fragments to Cloud CDN...");
    try {
      const data = await uploadImage(file);
      if (data.success) {
        setProject(data.project);
        setActiveAlgo("");
        setStatusMsg("Asset logged successfully to MongoDB Atlas.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Inbound file routing failure.",
      );
    } finally {
      setUploading(false);
    }
  };
  const executeTransformation = async (algoName) => {
    if (!project) return;
    setProcessing(true);
    setActiveAlgo(algoName);
    setErrorMsg("");
    setStatusMsg(`Executing computational transformations for ${algoName}...`);
    try {
      const data = await applyTransform(project._id, algoName);
      if (data.success) {
        setProject(data.project);
        setStatusMsg("Processing complete. Workspace synchronized.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Processing engine execution thread failure.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const clearWorkspace = () => {
    setProject(null);
    setActiveAlgo("");
    setStatusMsg("");
    setErrorMsg("");
  };

  return {
    project,
    activeAlgo,
    uploading,
    processing,
    statusMsg,
    errorMsg,
    processUpload,
    executeTransformation,
    clearWorkspace,
    downloadImage,
  };
}
