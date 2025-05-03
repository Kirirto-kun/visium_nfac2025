import os
import base64
import requests
from typing import List, Dict
from PIL import Image
from io import BytesIO
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClipImageEmbedder:
    def __init__(self):
        self.endpoint = os.getenv("CLIP_ENDPOINT")
        self.api_key = os.getenv("CLIP_EMBADING_API")
        self.deployment = os.getenv("CLIP_DEPLOYMENT_NAME")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "azureml-model-deployment": self.deployment
        }

    def _prepare_image_data(self, image_input: str) -> str:
        """Подготавливает изображение: URL или base64"""
        if image_input.startswith(("http://", "https://")):
            return image_input
        try:
            with open(image_input, "rb") as f:
                return base64.b64encode(f.read()).decode()
        except Exception as e:
            logger.error(f"Error loading image: {str(e)}")
            raise

    def get_embeddings(self, image_paths: List[str]) -> List[Dict]:
        """Получает эмбеддинги для списка изображений"""
        try:
            inputs = []
            for path in image_paths:
                img_data = self._prepare_image_data(path)
                inputs.append([img_data, ""])

            payload = {
                "input_data": {
                    "columns": ["image", "text"],
                    "index": list(range(len(image_paths))),
                    "data": inputs
                }
            }

            response = requests.post(
                self.endpoint,
                headers=self.headers,
                json=payload,
                timeout=30
            )

            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"API Error: {str(e)}")
            raise

    def get_embedding(self, image_path: str) -> List[float]:
        """Получает эмбеддинг для одного изображения"""
        results = self.get_embeddings([image_path])
        return results[0]['image_features']

if __name__ == "__main__":
    embedder = ClipImageEmbedder()
    url_image = "https://img.freepik.com/free-photo/cute-cat-relaxing-studio_23-2150692717.jpg"
    embedding = embedder.get_embedding(url_image)
    print(f"Embedding for URL image: {embedding[:5]}... (length: {len(embedding)})")