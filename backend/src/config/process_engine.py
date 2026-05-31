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
        
        if algorithm == 'CONTRAST_STRETCHING':
            processed_img = apply_contrast_stretching(img)
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