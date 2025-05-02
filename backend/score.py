import io
import base64
from PIL import Image
import torch
from transformers import CLIPProcessor, CLIPModel

model = None
processor = None

def init():
    global model, processor
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def run(raw_data):
    try:
        image_b64 = raw_data["image"][0]
        image_bytes = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)

        embedding = image_features[0].cpu().numpy().tolist()
        return {"embedding": embedding}

    except Exception as e:
        return {"error": str(e)}
