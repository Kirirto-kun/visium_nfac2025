import os
from typing import List
from openai import AzureOpenAI
import logging
from dotenv import load_dotenv

load_dotenv()

class TextEmbedder:
    def __init__(self):
        self._validate_env()
        self.client = AzureOpenAI(
            api_version="2023-12-01-preview",
            azure_endpoint=os.getenv("AZURE_ENDPOINT_URL_TEXT"),
            api_key=os.getenv("TEXT_EMBADING_API")
        )
        self.deployment = os.getenv("AZURE_DEPLOYMENT_NAME_TEXT")

    def _validate_env(self):
        required_vars = [
            "TEXT_EMBADING_API",
            "AZURE_ENDPOINT_URL_TEXT",
            "AZURE_DEPLOYMENT_NAME_TEXT"
        ]
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            raise ValueError(f"Missing environment variables: {', '.join(missing)}")

    def get_embedding(self, text: str) -> List[float]:
        try:
            response = self.client.embeddings.create(
                input=text,
                model=self.deployment
            )
            return response.data[0].embedding
        except Exception as e:
            logging.error(f"Error details: {e}")
            raise

if __name__ == "__main__":
    try:
        embedder = TextEmbedder()
        embedding = embedder.get_embedding("тестовый текст")
        print(f"Успешно! Пример эмбеддинга: {embedding[:5]}")
    except Exception as e:
        print(f"Ошибка инициализации: {str(e)}")