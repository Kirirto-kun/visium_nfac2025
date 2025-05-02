from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, Image
import os
from dotenv import load_dotenv
from test_CLIP import prepare_image, get_embeddings_azure
from text_embeddings import TextEmbedder
from sqlalchemy.sql import text

app = FastAPI()
embedder = TextEmbedder()

load_dotenv()

# Получаем DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base.metadata.create_all(bind=engine)

class ImageCreate(BaseModel):
    image_url: str
    embedding: list[float]

@app.post("/images/")
def add_image_with_url(image_url: str):
    try:
        img = prepare_image(image_url)
        embedding = get_embeddings_azure(img)

        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")

        if len(embedding) != 384:
            print(f"Warning: Embedding length is {len(embedding)}, expected 384.")

        db = SessionLocal()
        try:
            new_image = Image(image_url=image_url, embedding=embedding)
            db.add(new_image)
            db.commit()
            db.refresh(new_image)
            return {"id": new_image.id, "message": "Image added successfully"}
        finally:
            db.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")

@app.post("/search/")
def search_images(query: str):
    try:
        query_embedding = embedder.get_embedding(query)

        db = SessionLocal()
        try:
            sql_query = text(
                """
                SELECT image_url, embedding <=> :query_embedding AS distance
                FROM images
                ORDER BY distance ASC
                LIMIT 1
                """
            )
            result = db.execute(sql_query, {"query_embedding": query_embedding}).fetchone()

            if result:
                return {"image_url": result["image_url"], "distance": result["distance"]}
            else:
                raise HTTPException(status_code=404, detail="No similar images found")
        finally:
            db.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching for images: {e}")
