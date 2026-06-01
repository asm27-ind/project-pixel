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

# --- ENHANCEMENT SUITE ---

def apply_contrast_stretching(img):
    img_min = np.min(img)
    img_max = np.max(img)
    if img_max == img_min: 
        return img
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

def apply_gamma_correction(img, gamma=0.4):
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(img, table)

# --- RESTORATION SUITE ---

def apply_mean_filter(img, kernel_size=5):
    return cv2.blur(img, (kernel_size, kernel_size))

def apply_median_filter(img, kernel_size=5):
    return cv2.medianBlur(img, kernel_size)

def apply_frequency_restoration(img, mode='WIENER', K=0.005):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    dft = np.fft.fft2(gray)
    dft_shift = np.fft.fftshift(dft)
    
    rows, cols = gray.shape
    crow, ccol = rows // 2 , cols // 2
    
    x = np.linspace(-ccol, cols - ccol - 1, cols)
    y = np.linspace(-crow, rows - crow - 1, rows)
    X, Y = np.meshgrid(x, y)
    sigma = 15.0
    H = np.exp(-(X**2 + Y**2) / (2 * sigma**2))
    H[H == 0] = 0.00001
    
    if mode == 'INVERSE':
        dft_restored = dft_shift / H
    elif mode == 'WIENER':
        dft_restored = dft_shift * (np.conj(H) / (np.abs(H)**2 + K))
    else:
        dft_restored = dft_shift

    f_ishift = np.fft.ifftshift(dft_restored)
    img_back = np.fft.ifft2(f_ishift)
    img_back = np.abs(img_back)
    
    processed_gray = np.clip(img_back, 0, 255).astype(np.uint8)
    return cv2.cvtColor(processed_gray, cv2.COLOR_GRAY2BGR)

# --- ENCODING & COMPRESSION SUITE ---

def execute_entropy_compression(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    total_pixels = gray.size
    
    unique, counts = np.unique(gray, return_counts=True)
    probabilities = counts / total_pixels
    
    entropy = -np.sum(probabilities * np.log2(probabilities))
    compressed_size = int(np.ceil((entropy * total_pixels) / 8.0))
    return img, compressed_size

def execute_lzw_compression(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    flat_pixels = gray.flatten()
    
    dictionary = {str(i): i for i in range(256)}
    dict_size = 256
    string = ""
    compressed_codes = []
    
    for pixel in flat_pixels:
        string_plus_pixel = string + "," + str(pixel) if string else str(pixel)
        if string_plus_pixel in dictionary:
            string = string_plus_pixel
        else:
            compressed_codes.append(dictionary[string])
            dictionary[string_plus_pixel] = dict_size
            dict_size += 1
            string = str(pixel)
    if string:
        compressed_codes.append(dictionary[string])
        
    bit_width = int(np.ceil(np.log2(dict_size)))
    compressed_size = int(np.ceil((len(compressed_codes) * bit_width) / 8.0))
    return img, compressed_size

# --- MAIN CONTROLLER EXECUTIVE ROUTINE ---

def main():
    try:
        input_data = json.loads(sys.stdin.read())
        image_url = input_data.get('imageUrl')
        algorithm = input_data.get('algorithm')
        project_id = input_data.get('projectId')
        
        response = requests.get(image_url, stream=True)
        if response.status_code != 200:
            print(json.dumps({"success": False, "error": "Failed to fetch image from CDN source"}))
            return

        img_array = np.asarray(bytearray(response.content), dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        e1 = cv2.getTickCount()
        compressed_bytes_metric = None
        
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
        elif algorithm == 'HUFFMAN_CODING' or algorithm == 'ARITHMETIC_CODING':
            processed_img, compressed_bytes_metric = execute_entropy_compression(img)
        elif algorithm == 'LZW_COMPRESSION':
            processed_img, compressed_bytes_metric = execute_lzw_compression(img)
        else:
            processed_img = img
            
        e2 = cv2.getTickCount()
        time_ms = ((e2 - e1) / cv2.getTickFrequency()) * 1000
        
        output_url = upload_to_cloudinary(processed_img, project_id)
        
        result = {
            "success": True,
            "processedUrl": output_url,
            "processingTimeMs": round(time_ms, 2),
            "compressedSizeInBytes": compressed_bytes_metric
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == '__main__':
    main()