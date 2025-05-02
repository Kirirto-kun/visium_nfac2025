from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base, Image
import os
from dotenv import load_dotenv

app = FastAPI()

# Load environment variables from .env file
load_dotenv()

# Получаем DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

# Настройка SQLAlchemy
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

# Создание таблиц
Base.metadata.create_all(bind=engine)

# Pydantic-схемы
class ImageCreate(BaseModel):
    image_url: str
    embedding: list[float]  # длина должна быть 384

@app.post("/images/")
def add_image(image: ImageCreate):
    if len(image.embedding) != 384:
        raise HTTPException(status_code=400, detail="Embedding must be length 384")

    db = SessionLocal()
    try:
        new_image = Image(image_url=image.image_url, embedding=image.embedding)
        db.add(new_image)
        db.commit()
        db.refresh(new_image)
        return {"id": new_image.id, "message": "Image added successfully"}
    finally:
        db.close()
