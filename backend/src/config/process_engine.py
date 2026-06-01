import sys
import json
import cv2
import numpy as np
import requests

def upload_to_cloudinary(image_bytes, public_id):
    cloud_name = sys.argv[1]
    api_key = sys.argv[2]
    api_secret = sys.argv[3]
    
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    
    _, encoded_img = cv2.imencode('.png', image_bytes)
    img_bytes = encoded_img.tobytes()
    
    files = {'file': ('processed.png', img_bytes, 'image/png')}
    data = {
        'api_key': api_key,
        'public_id': f"project-pixel/processed/{public_id}"
    }
    
    response = requests.post(url, files=files, data=data, auth=(api_key, api_secret))
    return response.json().get('secure_url')

def apply_contrast_stretching(img):
    img_min = np.min(img)
    img_max = np.max(img)
    if img_max == img_min: return img
    stretched = (img - img_min) * (255.0 / (img_max - img_min))
    return np.clip(stretched, 0, 255).astype(np.uint8)

def apply_histogram_equalization(img):
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    ycrcb[:, :, 0] = cv2.equalizeHist(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

def apply_clahe(img, clip_limit=2.0, tile_grid_size=(8, 8)):
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    ycrcb[:, :, 0] = clahe.apply(ycrcb[:, :, 0])
    return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)

def apply_gamma_correction(img, gamma=0.5):
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(img, table)

# --- RESTORATION SUITE ALGORITHMS ---

def apply_mean_filter(img, kernel_size=5):
    # Convolves a normalized box filter uniformly across all spatial pixel layers
    return cv2.blur(img, (kernel_size, kernel_size))

def apply_median_filter(img, kernel_size=5):
    # Non-linear edge-preserving sort matrix operations to completely isolate salt-and-pepper artifacts
    return cv2.medianBlur(img, kernel_size)

def apply_frequency_restoration(img, mode='WIENER', K=0.01):
    # Convert image to grayscale as frequency domain filters evaluate luminance intensities
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Compute the 2D Fast Fourier Transform and shift the zero-frequency component to the matrix center
    dft = np.fft.fft2(gray)
    dft_shift = np.fft.fftshift(dft)
    
    rows, cols = gray.shape
    crow, ccol = rows // 2 , cols // 2
    
    # Model a mock Gaussian blurring degradation transfer function H(u,v)
    x = np.linspace(-ccol, cols - ccol - 1, cols)
    y = np.linspace(-crow, rows - crow - 1, rows)
    X, Y = np.meshgrid(x, y)
    sigma = 15.0
    H = np.exp(-(X**2 + Y**2) / (2 * sigma**2))
    
    # Avoid mathematical division-by-zero crashes
    H[H == 0] = 0.00001
    
    if mode == 'INVERSE':
        # Pure deconvolution: F_hat = G / H
        dft_restored = dft_shift / H
    elif mode == 'WIENER':
        # Parametric Wiener distribution matrix computation: F_hat = G * (H* / (|H|^2 + K))
        dft_restored = dft_shift * (np.conj(H) / (np.abs(H)**2 + K))
    else:
        dft_restored = dft_shift

    # Shift spectrum components back and calculate the Inverse Fast Fourier Transform to recover the spatial image
    f_ishift = np.fft.ifftshift(dft_restored)
    img_back = np.fft.ifft2(f_ishift)
    img_back = np.abs(img_back)
    
    # Normalize matrix intensities back to an 8-bit image array display standard
    processed_gray = np.clip(img_back, 0, 255).astype(np.uint8)
    return cv2.cvtColor(processed_gray, cv2.COLOR_GRAY2BGR)

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        
        image_url = input_data.get('imageUrl')
        algorithm = input_data.get('algorithm')
        project_id = input_data.get('projectId')
        
        response = requests.get(image_url, stream=True)
        if response.status_code != 200:
            print(json.dumps({"success": False, "error": "Failed to fetch image"}))
            return

        img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        e1 = cv2.getTickCount()
        
        # Mapping incoming request strings to corresponding structural suite functions
        if algorithm == 'CONTRAST_STRETCHING':
            processed_img = apply_contrast_stretching(img)
        elif algorithm == 'HISTOGRAM_EQUALIZATION':
            processed_img = apply_histogram_equalization(img)
        elif algorithm == 'CLAHE':
            processed_img = apply_clahe(img)
        elif algorithm == 'GAMMA_CORRECTION':
            processed_img = apply_gamma_correction(img, gamma=0.4)
        elif algorithm == 'MEAN_FILTER':
            processed_img = apply_mean_filter(img, kernel_size=5)
        elif algorithm == 'MEDIAN_FILTER':
            processed_img = apply_median_filter(img, kernel_size=5)
        elif algorithm == 'INVERSE_FILTER':
            processed_img = apply_frequency_restoration(img, mode='INVERSE')
        elif algorithm == 'WIENER_FILTER':
            processed_img = apply_frequency_restoration(img, mode='WIENER', K=0.005)
        else:
            processed_img = img
            
        e2 = cv2.getTickCount()
        time_ms = ((e2 - e1) / cv2.getTickFrequency()) * 1000
        
        output_url = upload_to_cloudinary(processed_img, project_id)
        
        result = {
            "success": True,
            "processedUrl": output_url,
            "processingTimeMs": round(time_ms, 2)
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()