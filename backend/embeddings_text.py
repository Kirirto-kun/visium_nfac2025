import requests
import logging
from typing import List, Dict, Union
from dotenv import load_dotenv
import os
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ClipTextEmbedder:
    def __init__(self):
        self.endpoint = os.getenv("CLIP_ENDPOINT")
        self.api_key = os.getenv("CLIP_EMBADING_API")
        self.deployment = os.getenv("CLIP_DEPLOYMENT_NAME")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "azureml-model-deployment": self.deployment
        }

    def get_text_embeddings(self, texts: List[str]) -> List[Dict]:
        """Получает эмбеддинги для списка текстов"""
        try:
            payload = {
                "input_data": {
                    "columns": ["image", "text"],
                    "index": list(range(len(texts))),
                    "data": [["", text] for text in texts]
                }
            }

            response = requests.post(
                self.endpoint,
                headers=self.headers,
                json=payload,
                timeout=15
            )

            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"API Error: {str(e)}")
            raise

    def get_text_embedding(self, text: str) -> List[float]:
        """Получает эмбеддинг для одного текста"""
        results = self.get_text_embeddings([text])
        return results[0]['text_features']

    def batch_embed(self, items: List[Union[str, bytes]]) -> List[List[float]]:
        """Универсальный метод для текста и изображений"""
        embeddings = []
        for item in items:
            if isinstance(item, str) and item.startswith(("http://", "https://")):
                emb = self.get_image_embedding(item)
            elif isinstance(item, bytes):
                emb = self.get_image_embedding(item)
            else:
                emb = self.get_text_embedding(str(item))
            embeddings.append(emb)
        return embeddings

if __name__ == "__main__":
    embedder = ClipTextEmbedder()

    single_text = "рыжий кот на диване"
    embedding = embedder.get_text_embedding(single_text)
    print(f"Эмбеддинг для текста: {embedding[:5]}... (длина: {len(embedding)})")