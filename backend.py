import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from ultralytics import YOLO

# Initialize Flask
app = Flask(__name__)
CORS(app)

# Load YOLO-World Model
print("Loading YOLO-World Model...")
model = YOLO('yolov8s-world.pt')

# Define our trash classes
custom_classes = [
    "plastic bottle", 
    "aluminum can", 
    "crushed can", 
    "crumpled paper", 
]
model.set_classes(custom_classes)
print(f"Classes Set: {custom_classes}")

# ------------------------------------------------------
# ROUTE 1: Serve the Frontend (The UI)
# ------------------------------------------------------
@app.route('/')
def home():
    return render_template('index.html')

# ------------------------------------------------------
# ROUTE 2: The Detection API
# ------------------------------------------------------
@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.get_json()
        img_data = base64.b64decode(data['image'].split(',')[1]) # Remove header
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Run Inference
        results = model.predict(img, conf=0.15, iou=0.5, verbose=False)
        
        detections = []
        for box in results[0].boxes:
            coords = box.xyxyn[0].tolist() # Normalized [x1, y1, x2, y2]
            class_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = custom_classes[class_id]

            detections.append({
                'label': label,
                'confidence': conf,
                'box': coords 
            })

        return jsonify({'detections': detections})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'detections': []}) # Return empty on error to keep video flowing

if __name__ == '__main__':
    # host='0.0.0.0' lets you access it from your phone too!
    app.run(host='0.0.0.0', port=5000, debug=True)