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
    if img_max == img_min:
        return img
    stretched = (img - img_min) * (255.0 / (img_max - img_min))
    return np.clip(stretched, 0, 255).astype(np.uint8)

def apply_histogram_equalization(img):
    # Y = 0.299R + 0.587G + 0.114B
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
    # LUT for faster calculation: precompute the mapping for all pixel values [0, 255]
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    # Apply the mapping instantly across all pixels via hardware accelerated LUT indexing
    return cv2.LUT(img, table)

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
        
        # Mapping algorithmic operations matching the ImageProject dynamic tech enumerations
        if algorithm == 'CONTRAST_STRETCHING':
            processed_img = apply_contrast_stretching(img)
        elif algorithm == 'HISTOGRAM_EQUALIZATION':
            processed_img = apply_histogram_equalization(img)
        elif algorithm == 'CLAHE':
            processed_img = apply_clahe(img)
        elif algorithm == 'GAMMA_CORRECTION':
            processed_img = apply_gamma_correction(img, gamma=0.4) 
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