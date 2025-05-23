import requests
import base64
import os
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

# Подавляем предупреждения
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Load environment variables from .env file
load_dotenv()

# Azure ML Configuration
API_KEY = os.getenv("IMAGE_EMBADING_API")
ENDPOINT_URL = os.getenv("AZURE_ENDPOINT_URL_IMAGE")
DEPLOYMENT_NAME = os.getenv("AZURE_DEPLOYMENT_NAME_IMAGE")

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
    image_url = "https://upload.wikimedia.org/wikipedia/commons/1/18/Dog_Breeds.jpg"
    
    try:
        img = prepare_image(image_url)
        embeddings = get_embeddings_azure(img)
        
        if embeddings:
            print("Успешно! Первые 5 значений:")
            print(embeddings[:10])
            print(f"Размер эмбеддинга: {len(embeddings)}")
        else:
            print("Не удалось получить эмбеддинги")
            
    except Exception as e:
        print(f"Критическая ошибка: {e}")

if __name__ == "__main__":
    main()