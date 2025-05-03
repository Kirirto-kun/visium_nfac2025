from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from .models import Base, Image
import os
from dotenv import load_dotenv
from sqlalchemy.sql import text
from embeddings_image import ClipImageEmbedder
from embeddings_text import ClipTextEmbedder
app = FastAPI()

image_embedder = ClipImageEmbedder()
text_embedder = ClipTextEmbedder()

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
        embedding = image_embedder.get_embedding(image_url)
        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")

        if len(embedding) != 512:
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
async def search_images(
    query: str,
    min_similarity: float = Query(0, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100)
):
    try:
        query_embedding = text_embedder.get_text_embedding(query)
        
        if len(query_embedding) != 512:
            raise HTTPException(status_code=400, detail="Invalid embedding dimension")

        db = SessionLocal()
        try:
            embedding_str = ",".join(map(str, query_embedding))
            offset = (page - 1) * per_page

            sql_query = text("""
                WITH ranked_results AS (
                    SELECT 
                        image_url,
                        1 - (embedding <=> :embedding) AS similarity,
                        ROW_NUMBER() OVER (
                            ORDER BY (embedding <=> :embedding)
                        ) AS rank
                    FROM images
                    WHERE 1 - (embedding <=> :embedding) > :min_similarity
                )
                SELECT image_url, similarity
                FROM ranked_results
                WHERE rank BETWEEN :offset AND :offset + :limit
                ORDER BY rank
            """)
            
            results = db.execute(sql_query, {
                "embedding": f"[{embedding_str}]",
                "min_similarity": min_similarity,
                "offset": offset,
                "limit": per_page
            }).fetchall()

            if not results:
                raise HTTPException(status_code=404, detail="Изображения не найдены")

            return [
                {
                    "image_url": row.image_url,
                    "similarity": round(row.similarity, 4)
                } for row in results
            ]

        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Ошибка базы данных: {str(e)}")
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
