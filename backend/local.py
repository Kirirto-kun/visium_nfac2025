import requests
import base64
import json
from PIL import Image
from io import BytesIO
import torch
from transformers import AutoImageProcessor, AutoModel

# Конфигурация Azure ML
API_KEY = "81jyK1RyKPbWaX7A9SVSxNGTaXHbGfBsP40mRzsCZSKdKXJ2ut49JQQJ99BEAAAAAAAAAAAAINFRAZML29Ik"
ENDPOINT_URL = "https://candydata-aurue.eastus.inference.ml.azure.com/score"
DEPLOYMENT_NAME = "facebook-dinov2-image-embeddi-3"

# Инициализация модели DINOv2 для локальной обработки (опционально)
processor = AutoImageProcessor.from_pretrained('facebook/dinov2-base')
model = AutoModel.from_pretrained('facebook/dinov2-base')

def prepare_image(image_url, max_size=1024):
    """Загрузка и предобработка изображения"""
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))
    
    # Ресайз изображения
    img.thumbnail((max_size, max_size))
    
    # Конвертация в RGB
    if img.mode != 'RGB':
        img = img.convert('RGB')
        
    return img

def get_embeddings_azure(image):
    try:
        buffered = BytesIO()
        image.save(buffered, format="JPEG", quality=85)
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        payload = {
            "input_data": {
                "columns": ["image"],
                "data": [[img_base64]]
            },
            "params": {}
        }

        response = requests.post(
            ENDPOINT_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
                "azureml-model-deployment": DEPLOYMENT_NAME
            },
            json=payload,
            timeout=30
        )

        # Отладочный вывод
        print(f"HTTP Status: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Response Content (first 500 chars): {response.text[:500]}")

        response.raise_for_status()
        
        # Обработка разных форматов ответа
        result = response.json()
        
        if isinstance(result, dict):
            return result.get('embeddings', result.get('output', []))
        elif isinstance(result, list):
            return result[0] if len(result) > 0 else []
        else:
            return []

    except Exception as e:
        print(f"Azure Error Details: {str(e)}")
        return None

def get_embeddings_local(image):
    """Локальное вычисление эмбеддингов"""
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

def main():
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg"
    
    try:
        # Загрузка и подготовка изображения
        img = prepare_image(image_url)
        
        # Вариант 1: Использование Azure Endpoint
        azure_embeddings = get_embeddings_azure(img)
        
        # Вариант 2: Локальный расчет
        # local_embeddings = get_embeddings_local(img)
        
        print("Azure Embeddings:", azure_embeddings[:5] if azure_embeddings else "None")
        # print("Local Embeddings:", local_embeddings[:5])
        
    except Exception as e:
        print(f"Main Error: {str(e)}")

if __name__ == "__main__":
    main()