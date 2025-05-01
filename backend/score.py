import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import base64


model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def init():
    global clip_model, clip_processor
    clip_model = model
    clip_processor = processor

def run(raw_data):
    try:
        # raw_data ожидается в формате JSON с base64 изображением и текстом
        # {
        #     "image": "<base64>",
        #     "text": "кошка"
        # }
        image_data = base64.b64decode(raw_data["image"])
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        text = raw_data["text"]

        inputs = clip_processor(text=[text], images=image, return_tensors="pt", padding=True)
        outputs = clip_model(**inputs)
        logits_per_image = outputs.logits_per_image
        probs = logits_per_image.softmax(dim=1)

        return {
            "similarity_score": probs[0][0].item()
        }

    except Exception as e:
        return {"error": str(e)}
