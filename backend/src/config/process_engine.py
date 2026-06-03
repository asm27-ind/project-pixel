#!/usr/bin/env python3
# backend/src/config/process_engine.py
#
# Receives image as base64 string inside the JSON payload from Node — no HTTP
# fetch needed. Processes it with OpenCV, uploads result to Cloudinary via SDK,
# and prints a JSON result to stdout for Node to parse.
#
# Stdin payload:
#   { "imageB64": "<base64>", "algorithm": "CLAHE", "projectId": "abc123" }
#
# Stdout result:
#   { "success": true, "processedUrl": "https://...", "processingTimeMs": 12.3,
#     "compressedSizeInBytes": null }
#
# Args: python3 process_engine.py <cloud_name> <api_key> <api_secret>
#
# pip install opencv-python numpy cloudinary

import sys
import json
import base64
import io
import time
import traceback

import cv2
import numpy as np
import cloudinary
import cloudinary.uploader


# ── Cloudinary ────────────────────────────────────────────────────────────────

def setup_cloudinary():
    if len(sys.argv) < 4:
        raise RuntimeError(
            "Missing Cloudinary credentials. "
            "Pass: python3 process_engine.py <cloud_name> <api_key> <api_secret>"
        )
    cloudinary.config(
        cloud_name=sys.argv[1],
        api_key=sys.argv[2],
        api_secret=sys.argv[3],
        secure=True,
    )


def upload_to_cloudinary(image_array: np.ndarray, project_id: str) -> str:
    ok, encoded = cv2.imencode(".png", image_array)
    if not ok:
        raise RuntimeError("cv2.imencode failed — cannot encode processed image.")

    result = cloudinary.uploader.upload(
        io.BytesIO(encoded.tobytes()),
        folder="project-pixel/processed",
        public_id=f"processed-{project_id}",
        resource_type="image",
        overwrite=True,
        invalidate=True,
    )

    url = result.get("secure_url")
    if not url:
        raise RuntimeError(f"Cloudinary returned no URL. Response: {result}")
    return url


# ── Image decode from base64 ──────────────────────────────────────────────────

def decode_image(b64_string: str) -> np.ndarray:
    try:
        raw_bytes = base64.b64decode(b64_string)
    except Exception as e:
        raise ValueError(f"base64 decode failed: {e}")

    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError(
            "cv2.imdecode returned None — the image data is corrupt or unsupported format."
        )
    return img


# ── Enhancement algorithms ────────────────────────────────────────────────────

def apply_contrast_stretching(img: np.ndarray) -> np.ndarray:
    """Per-channel min-max linear stretch to [0, 255]."""
    out = np.zeros_like(img, dtype=np.float32)
    for ch in range(img.shape[2]):
        plane = img[:, :, ch].astype(np.float32)
        lo, hi = plane.min(), plane.max()
        out[:, :, ch] = (plane - lo) * (255.0 / (hi - lo)) if hi > lo else plane
    return np.clip(out, 0, 255).astype(np.uint8)


def apply_histogram_equalization(img: np.ndarray) -> np.ndarray:
    """Equalise the Y (luminance) channel in YCrCb space — preserves colour."""
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)


def apply_clahe(img: np.ndarray, clip_limit: float = 2.0, tile: tuple = (8, 8)) -> np.ndarray:
    """Contrast Limited AHE on Y channel."""
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile)
    ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)


def apply_gamma_correction(img: np.ndarray, gamma: float = 0.4) -> np.ndarray:
    """Power-law transform via LUT. gamma<1 brightens, gamma>1 darkens."""
    inv_gamma = 1.0 / gamma
    table = np.array(
        [((i / 255.0) ** inv_gamma) * 255 for i in range(256)],
        dtype=np.uint8,
    )
    return cv2.LUT(img, table)


# ── Restoration algorithms ────────────────────────────────────────────────────

def apply_mean_filter(img: np.ndarray, k: int = 5) -> np.ndarray:
    """Box / averaging filter — reduces Gaussian noise."""
    return cv2.blur(img, (k, k))


def apply_median_filter(img: np.ndarray, k: int = 5) -> np.ndarray:
    """Median filter — removes salt-and-pepper noise while preserving edges."""
    return cv2.medianBlur(img, k)


def apply_frequency_restoration(
    img: np.ndarray, mode: str = "WIENER", K: float = 0.005
) -> np.ndarray:
    """
    Frequency-domain restoration using a Gaussian degradation model H.
      INVERSE: G = F / H           (unstable — noise amplification)
      WIENER:  G = F·H* / (|H|²+K) (regularised — noise controlled by K)
    Operates on grayscale Y channel, returns BGR.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    rows, cols = gray.shape

    dft_shift = np.fft.fftshift(np.fft.fft2(gray))

    cx, cy = cols // 2, rows // 2
    X, Y = np.meshgrid(
        np.linspace(-cx, cols - cx - 1, cols),
        np.linspace(-cy, rows - cy - 1, rows),
    )
    H = np.maximum(np.exp(-(X ** 2 + Y ** 2) / (2.0 * 15.0 ** 2)), 1e-6)

    if mode == "INVERSE":
        restored_shift = dft_shift / H
    else:  # WIENER
        restored_shift = dft_shift * (np.conj(H) / (np.abs(H) ** 2 + K))

    restored = np.abs(np.fft.ifft2(np.fft.ifftshift(restored_shift)))
    restored = np.clip(restored, 0, 255).astype(np.uint8)
    return cv2.cvtColor(restored, cv2.COLOR_GRAY2BGR)


# ── Encoding / compression algorithms ────────────────────────────────────────

def compute_entropy_size(img: np.ndarray):
    """
    Shannon-entropy estimate for Huffman / Arithmetic coding theoretical minimum.
    Returns (image_unchanged, compressed_bytes).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    total = gray.size
    _, counts = np.unique(gray, return_counts=True)
    probs = counts / total
    entropy = -np.sum(probs * np.log2(probs + 1e-12))
    compressed = int(np.ceil(entropy * total / 8.0))
    return img, compressed


def compute_lzw_size(img: np.ndarray):
    """
    LZW dictionary compression simulation on the grayscale pixel stream.
    Returns (image_unchanged, compressed_bytes).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    pixels = gray.flatten().tolist()

    dictionary = {(v,): v for v in range(256)}
    dict_size = 256
    codes = []
    seq = ()

    for px in pixels:
        ext = seq + (px,)
        if ext in dictionary:
            seq = ext
        else:
            codes.append(dictionary[seq])
            dictionary[ext] = dict_size
            dict_size += 1
            seq = (px,)
    if seq:
        codes.append(dictionary[seq])

    bit_width = max(8, int(np.ceil(np.log2(max(dict_size, 2)))))
    compressed = int(np.ceil(len(codes) * bit_width / 8.0))
    return img, compressed


# ── Dispatch table ────────────────────────────────────────────────────────────

ALGORITHMS = {
    "CONTRAST_STRETCHING":    lambda img: (apply_contrast_stretching(img), None),
    "HISTOGRAM_EQUALIZATION": lambda img: (apply_histogram_equalization(img), None),
    "CLAHE":                  lambda img: (apply_clahe(img), None),
    "GAMMA_CORRECTION":       lambda img: (apply_gamma_correction(img, gamma=0.4), None),
    "MEAN_FILTER":            lambda img: (apply_mean_filter(img, k=5), None),
    "MEDIAN_FILTER":          lambda img: (apply_median_filter(img, k=5), None),
    "INVERSE_FILTER":         lambda img: (apply_frequency_restoration(img, mode="INVERSE"), None),
    "WIENER_FILTER":          lambda img: (apply_frequency_restoration(img, mode="WIENER", K=0.005), None),
    "HUFFMAN_CODING":         lambda img: compute_entropy_size(img),
    "ARITHMETIC_CODING":      lambda img: compute_entropy_size(img),
    "LZW_COMPRESSION":        lambda img: compute_lzw_size(img),
}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    try:
        raw = sys.stdin.read().strip()
        if not raw:
            raise ValueError("stdin is empty — no JSON payload from Node.js.")

        payload = json.loads(raw)
        image_b64  = payload.get("imageB64")
        algorithm  = payload.get("algorithm")
        project_id = payload.get("projectId")

        if not image_b64:
            raise ValueError("Missing 'imageB64' in payload.")
        if not algorithm:
            raise ValueError("Missing 'algorithm' in payload.")
        if not project_id:
            raise ValueError("Missing 'projectId' in payload.")
        if algorithm not in ALGORITHMS:
            raise ValueError(
                f"Unknown algorithm '{algorithm}'. "
                f"Valid: {', '.join(ALGORITHMS.keys())}"
            )

        setup_cloudinary()

        img = decode_image(image_b64)

        t0 = time.perf_counter()
        processed_img, compressed_bytes = ALGORITHMS[algorithm](img)
        processing_ms = round((time.perf_counter() - t0) * 1000, 2)

        output_url = upload_to_cloudinary(processed_img, project_id)

        print(json.dumps({
            "success": True,
            "processedUrl": output_url,
            "processingTimeMs": processing_ms,
            "compressedSizeInBytes": compressed_bytes,
        }), flush=True)

    except Exception as exc:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(exc)}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()