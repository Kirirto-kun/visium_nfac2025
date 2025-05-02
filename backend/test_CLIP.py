import requests
import base64
import os
from PIL import Image
from io import BytesIO

# Подавляем предупреждения
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Конфигурация Azure ML
API_KEY = "81jyK1RyKPbWaX7A9SVSxNGTaXHbGfBsP40mRzsCZSKdKXJ2ut49JQQJ99BEAAAAAAAAAAAAINFRAZML29Ik"
ENDPOINT_URL = "https://candydata-aurue.eastus.inference.ml.azure.com/score"
DEPLOYMENT_NAME = "facebook-dinov2-image-embeddi-3"

def prepare_image(image_url):
    """Оптимизированная загрузка изображения"""
    response = requests.get(image_url, stream=True)
    response.raise_for_status()
    return Image.open(response.raw).convert('RGB')

def get_embeddings_azure(image):
    """Получение эмбеддингов через Azure Endpoint"""
    try:
        # Конвертация в JPEG с оптимизацией
        with BytesIO() as buffer:
            image.save(buffer, format="JPEG", quality=85, optimize=True)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        payload = {
            "input_data": {
                "columns": ["image"],
                "data": [[img_base64]]
            }
        }

        response = requests.post(
            ENDPOINT_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}",
                "azureml-model-deployment": DEPLOYMENT_NAME
            },
            json=payload,
            timeout=15
        )

        response.raise_for_status()
        return response.json()[0]['image_features']
    
    except Exception as e:
        print(f"Ошибка: {e}")
        return None

def main():
    image_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/1200px-Cat03.jpg"
    
    try:
        img = prepare_image(image_url)
        embeddings = get_embeddings_azure(img)
        
        if embeddings:
            print("Успешно! Первые 5 значений:")
            print(embeddings[:5])
        else:
            print("Не удалось получить эмбеддинги")
            
    except Exception as e:
        print(f"Критическая ошибка: {e}")

if __name__ == "__main__":
    main()