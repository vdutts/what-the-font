import sys
import json
import base64
from io import BytesIO
from PIL import Image
import numpy as np
import onnxruntime as ort

def preprocess_image(image_data):
    """Preprocess image exactly like Storia-AI font-classify"""
    # Decode base64 image
    if ',' in image_data:
        image_data = image_data.split(',')[1]
    
    img_bytes = base64.b64decode(image_data)
    img = Image.open(BytesIO(img_bytes)).convert('RGB')
    
    # Resize with padding to 224x224 (ResNet50 input size)
    target_size = 224
    img.thumbnail((target_size, target_size), Image.Resampling.LANCZOS)
    
    # Create white background
    background = Image.new('RGB', (target_size, target_size), (255, 255, 255))
    offset = ((target_size - img.width) // 2, (target_size - img.height) // 2)
    background.paste(img, offset)
    
    # Convert to numpy array and normalize (ImageNet normalization)
    img_array = np.array(background).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_array = (img_array - mean) / std
    
    # Transpose to CHW format and add batch dimension
    img_array = np.transpose(img_array, (2, 0, 1))
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

def load_font_mappings():
    """Load font mappings from Storia-AI repository"""
    # This would be loaded from the google_fonts_mapping.tsv file
    # For now, return a sample mapping
    return {
        "0": {"family": "Roboto", "variant": "regular"},
        "1": {"family": "Open Sans", "variant": "regular"},
        # ... more mappings
    }

def main():
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())
    image_data = input_data['image']
    
    try:
        # Preprocess image
        img_array = preprocess_image(image_data)
        
        # Load ONNX model from HuggingFace
        model_url = "https://huggingface.co/storia/font-classify-onnx/resolve/main/model.onnx"
        session = ort.InferenceSession(model_url)
        
        # Run inference
        input_name = session.get_inputs()[0].name
        outputs = session.run(None, {input_name: img_array})
        
        # Get top 15 predictions
        logits = outputs[0][0]
        top_indices = np.argsort(logits)[-15:][::-1]
        
        # Load font mappings
        font_mappings = load_font_mappings()
        
        # Format results
        results = []
        for idx in top_indices:
            confidence = float(logits[idx])
            font_info = font_mappings.get(str(idx), {"family": "Unknown", "variant": "regular"})
            results.append({
                "family": font_info["family"],
                "variant": font_info["variant"],
                "confidence": confidence
            })
        
        print(json.dumps({"success": True, "fonts": results}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
