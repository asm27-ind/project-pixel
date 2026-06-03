import sys, json, base64, io, time, traceback
import cv2
import numpy as np
import cloudinary
import cloudinary.uploader


def setup_cloudinary():
    cloudinary.config(cloud_name=sys.argv[1], api_key=sys.argv[2], api_secret=sys.argv[3], secure=True)


def decode_image(b64: str) -> np.ndarray:
    raw = base64.b64decode(b64 + "==")  # pad so it never fails on length
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image — unsupported format or corrupt data.")
    return img


def upload(img: np.ndarray, project_id: str) -> str:
    ok, enc = cv2.imencode(".png", img)
    if not ok:
        raise RuntimeError("cv2.imencode failed.")
    r = cloudinary.uploader.upload(
        io.BytesIO(enc.tobytes()),
        folder="project-pixel/processed",
        public_id=f"processed-{project_id}",
        resource_type="image", overwrite=True, invalidate=True,
    )
    url = r.get("secure_url")
    if not url:
        raise RuntimeError(f"No URL from Cloudinary: {r}")
    return url


# ── Algorithms ────────────────────────────────────────────────────────────────

def contrast_stretching(img):
    out = np.zeros_like(img, dtype=np.float32)
    for c in range(3):
        p = img[:,:,c].astype(np.float32)
        lo, hi = p.min(), p.max()
        out[:,:,c] = (p - lo) * 255.0 / (hi - lo) if hi > lo else p
    return np.clip(out, 0, 255).astype(np.uint8), None

def histogram_eq(img):
    y = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y[:,:,0] = cv2.equalizeHist(y[:,:,0])
    return cv2.cvtColor(y, cv2.COLOR_YCrCb2BGR), None

def clahe(img):
    y = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y[:,:,0] = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(y[:,:,0])
    return cv2.cvtColor(y, cv2.COLOR_YCrCb2BGR), None

def gamma(img):
    table = np.array([((i/255.0)**(1/0.4))*255 for i in range(256)], dtype=np.uint8)
    return cv2.LUT(img, table), None

def mean_filter(img):
    return cv2.blur(img, (5,5)), None

def median_filter(img):
    return cv2.medianBlur(img, 5), None

def freq_restore(img, mode="WIENER"):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    rows, cols = g.shape
    ds = np.fft.fftshift(np.fft.fft2(g))
    cx, cy = cols//2, rows//2
    X, Y = np.meshgrid(np.linspace(-cx, cols-cx-1, cols), np.linspace(-cy, rows-cy-1, rows))
    H = np.maximum(np.exp(-(X**2+Y**2)/(2*15.0**2)), 1e-6)
    out = ds/H if mode=="INVERSE" else ds*(np.conj(H)/(np.abs(H)**2+0.005))
    r = np.clip(np.abs(np.fft.ifft2(np.fft.ifftshift(out))), 0, 255).astype(np.uint8)
    return cv2.cvtColor(r, cv2.COLOR_GRAY2BGR), None

def entropy_size(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, c = np.unique(g, return_counts=True)
    p = c / g.size
    bits = -np.sum(p * np.log2(p + 1e-12))
    return img, int(np.ceil(bits * g.size / 8))

def lzw_size(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).flatten().tolist()
    d = {(v,): v for v in range(256)}
    sz, codes, seq = 256, [], ()
    for px in g:
        ext = seq + (px,)
        if ext in d: seq = ext
        else:
            codes.append(d[seq]); d[ext] = sz; sz += 1; seq = (px,)
    if seq: codes.append(d[seq])
    bw = max(8, int(np.ceil(np.log2(max(sz, 2)))))
    return img, int(np.ceil(len(codes) * bw / 8))


def high_boost_laplacian(img):
    A = 1.5
    out = np.zeros_like(img, dtype=np.float32)
    for c in range(3):
        p = img[:,:,c].astype(np.float32)
        lap = cv2.Laplacian(p, cv2.CV_32F)
        out[:,:,c] = A * p - lap
    return np.clip(out, 0, 255).astype(np.uint8), None

def otsu_segmentation(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR), None

def kmeans_segmentation(img):
    K = 4
    data = img.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, label, center = cv2.kmeans(data, K, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    center = np.uint8(center)
    res = center[label.flatten()]
    return res.reshape((img.shape)), None


DISPATCH = {
    "CONTRAST_STRETCHING":    contrast_stretching,
    "HISTOGRAM_EQUALIZATION": histogram_eq,
    "CLAHE":                  clahe,
    "GAMMA_CORRECTION":       gamma,
    "MEAN_FILTER":            mean_filter,
    "MEDIAN_FILTER":          median_filter,
    "INVERSE_FILTER":         lambda img: freq_restore(img, "INVERSE"),
    "WIENER_FILTER":          lambda img: freq_restore(img, "WIENER"),
    "HUFFMAN_CODING":         entropy_size,
    "ARITHMETIC_CODING":      entropy_size,
    "LZW_COMPRESSION":        lzw_size,
    "HIGH_BOOST_LAPLACIAN":   high_boost_laplacian,
    "OTSU_THRESHOLDING":      otsu_segmentation,
    "KMEANS_SEGMENTATION":    kmeans_segmentation,
}


def main():
    try:
        p = json.loads(sys.stdin.read().strip())
        b64, algo, pid = p["imageB64"], p["algorithm"], p["projectId"]

        if algo not in DISPATCH:
            raise ValueError(f"Unknown algorithm: {algo}")

        # Setup Cloudinary is kept for backwards compatibility but we do not use it
        try:
            setup_cloudinary()
        except Exception:
            pass
        
        img = decode_image(b64)

        t0 = time.perf_counter()
        result_img, compressed = DISPATCH[algo](img)
        ms = round((time.perf_counter() - t0) * 1000, 2)

        # Convert output image to base64 instead of performing network upload from Python
        ok, enc = cv2.imencode(".png", result_img)
        if not ok:
            raise RuntimeError("cv2.imencode failed.")
        processed_b64 = base64.b64encode(enc.tobytes()).decode()

        print(json.dumps({
            "success": True,
            "processedB64": processed_b64,
            "processingTimeMs": ms,
            "compressedSizeInBytes": compressed,
        }), flush=True)

    except Exception as e:
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()