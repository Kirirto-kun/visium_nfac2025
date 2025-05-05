from fastapi import FastAPI, HTTPException, Query, Depends, Body, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
from .models import Base, Image, Follow, User, Comment, Like
import os
from dotenv import load_dotenv
from sqlalchemy.sql import text
from embeddings_image import ClipImageEmbedder
from embeddings_text import ClipTextEmbedder
from .db import SessionLocal, engine
import logging
import sys
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import requests
from io import BytesIO
import traceback
from fastapi.middleware.cors import CORSMiddleware
from PIL import ImageDraw
import base64
import json
import tempfile
from fastapi.responses import StreamingResponse
from dalle_chat import edit_image

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to restrict origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

image_embedder = ClipImageEmbedder()
text_embedder = ClipTextEmbedder()

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

Base.metadata.create_all(bind=engine)

Base.metadata.create_all(bind=engine)

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

class ImageCreate(BaseModel):
    image_url: str
    embedding: list[float]

class FollowRequest(BaseModel):
    user_id: int

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 90

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/signup/")
async def signup(username: str = Body(...), email: str = Body(...), password: str = Body(...)):
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter((User.username == username) | (User.email == email)).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username or email already exists")

        hashed_password = get_password_hash(password)
        new_user = User(username=username, email=email, password_hash=hashed_password)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User created successfully"}
    finally:
        db.close()

@app.post("/token/")
async def login_for_access_token(payload: dict = Body(...)):
    try:
        username = payload.get("username")
        password = payload.get("password")

        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password are required")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user or not verify_password(password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid username or password")

            access_token = create_access_token(data={"sub": user.username})
            return {"access_token": access_token, "token_type": "bearer"}
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error logging in: {e}")

@app.get("/users/me/")
async def read_users_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/images/")
async def add_image_with_url(payload: dict = Body(...), token: str = Depends(oauth2_scheme)):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
        finally:
            db.close()

        image_url = payload.get("image_url")
        description = payload.get("description")
        is_ai_generated = bool(payload.get("is_ai_generated", False))
        if not image_url:
            raise HTTPException(status_code=400, detail="Image URL is required")

        embedding = image_embedder.get_embedding(image_url)
        if not embedding:
            raise HTTPException(status_code=500, detail="Failed to generate embedding")

        if len(embedding) != 512:
            print(f"Warning: Embedding length is {len(embedding)}, expected 512.")

        db = SessionLocal()
        try:
            new_image = Image(
                user_id=user.id,
                image_url=image_url,
                is_ai_generated=is_ai_generated,
                description=description,
                vector_embedding=embedding
            )
            db.add(new_image)
            db.commit()
            db.refresh(new_image)
            return {"id": new_image.id, "message": "Image added successfully"}
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {e}")

@app.post("/search/")
async def search_images(
    payload: dict = Body(...),
    min_similarity: float = Query(0, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100)
):
    try:
        query = payload.get("query")
        if not query:
            raise HTTPException(status_code=400, detail="Query is required")

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
                        id,
                        image_url,
                        description,
                        width,
                        height,
                        size,
                        format,
                        likes_count,
                        1 - (vector_embedding <=> :embedding) AS similarity,
                        ROW_NUMBER() OVER (
                            ORDER BY (vector_embedding <=> :embedding)
                        ) AS rank
                    FROM images
                    WHERE 1 - (vector_embedding <=> :embedding) > :min_similarity
                )
                SELECT id, image_url, description, width, height, size, format, likes_count, similarity
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
                raise HTTPException(status_code=404, detail="No images found")

            return [
                {
                    "id": row.id,
                    "image_url": row.image_url,
                    "description": row.description,
                    "likes_count": row.likes_count,
                    "similarity": round(row.similarity, 4)
                } for row in results
            ]

        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search-by-image/")
async def search_by_image(payload: dict = Body(...), min_similarity: float = Query(0, ge=0.0, le=1.0), page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=100)):
    try:
        image_url = payload.get("image_url")
        embedding = image_embedder.get_embedding(image_url)

        if len(embedding) != 512:
            raise HTTPException(status_code=400, detail="Invalid embedding dimension")

        db = SessionLocal()
        try:
            embedding_str = ",".join(map(str, embedding))
            offset = (page - 1) * per_page

            sql_query = text("""
                WITH ranked_results AS (
                    SELECT 
                        id,
                        image_url,
                        description,
                        width,
                        height,
                        size,
                        format,
                        likes_count,
                        1 - (vector_embedding <=> :embedding) AS similarity,
                        ROW_NUMBER() OVER (
                            ORDER BY (vector_embedding <=> :embedding)
                        ) AS rank
                    FROM images
                    WHERE 1 - (vector_embedding <=> :embedding) > :min_similarity
                )
                SELECT id, image_url, description, width, height, size, format, likes_count, similarity
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
                raise HTTPException(status_code=404, detail="No images found")

            return [
                {
                    "id": row.id,
                    "image_url": row.image_url,
                    "description": row.description,
                    "likes_count": row.likes_count,
                    "similarity": round(row.similarity, 4)
                } for row in results
            ]

        except SQLAlchemyError as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching by image: {e}")

@app.get("/get-images/")
async def get_non_private_images():
    try:
        db = SessionLocal()
        try:
            results = db.query(Image, User.username).join(User, Image.user_id == User.id).filter(Image.is_private == False).all()

            if not results:
                raise HTTPException(status_code=404, detail="No images found")

            return [
                {
                    "id": row.Image.id,
                    "username": row.username,
                    "image_url": row.Image.image_url,
                    "description": row.Image.description,
                    "likes_count": row.Image.likes_count
                } for row in results
            ]

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/get-my-images/")
async def get_my_images(token: str = Depends(oauth2_scheme)):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            results = db.query(Image).filter(Image.user_id == user.id).all()

            if not results:
                raise HTTPException(status_code=404, detail="No images found")

            return [
                {
                    "id": row.id,
                    "image_url": row.image_url,
                    "username": "My",
                    "description": row.description,
                    "is_ai_generated": row.is_ai_generated,
                    "likes_count": row.likes_count
                } for row in results
            ]

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user-images/")
async def get_user_images(payload: dict = Body(...)):
    try:
        username = payload.get("username")
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            images = db.query(Image).filter(Image.user_id == user.id).all()

            if not images:
                return []

            return [
                {
                    "id": image.id,
                    "image_url": image.image_url,
                    "username": username,
                    "description": image.description,
                    "is_ai_generated": image.is_ai_generated,
                    "created_at": image.created_at,
                    "likes_count": image.likes_count
                } for image in images
            ]

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user images: {e}")

@app.post("/comments/")
async def add_comment(
    payload: dict = Body(...),
    token: str = Depends(oauth2_scheme)
):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        image_id = payload.get("image_id")
        content = payload.get("content")
        parent_comment_id = payload.get("parent_comment_id")

        if not image_id or not content:
            raise HTTPException(status_code=400, detail="Image ID and content are required")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            new_comment = Comment(
                user_id=user.id,
                image_id=image_id,
                content=content,
                parent_comment_id=parent_comment_id
            )
            db.add(new_comment)
            db.commit()
            db.refresh(new_comment)
            return {"id": new_comment.id, "message": "Comment added successfully"}
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding comment: {e}")


@app.post("/comments/image/")
async def get_comments_for_image(payload: dict = Body(...)):
    try:
        image_id = payload.get("image_id")
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")

        db = SessionLocal()
        try:
            comments = db.query(Comment, User.username).join(User, Comment.user_id == User.id).filter(Comment.image_id == image_id).all()

            if not comments:
                return []

            return [
                {
                    "id": comment.Comment.id,
                    "username": comment.username,
                    "image_id": comment.Comment.image_id,
                    "parent_comment_id": comment.Comment.parent_comment_id,
                    "content": comment.Comment.content,
                    "created_at": comment.Comment.created_at,
                } for comment in comments
            ]

        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching comments: {e}")


@app.post("/likes/")
async def like_post(payload: dict = Body(...), token: str = Depends(oauth2_scheme)):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        image_id = payload.get("image_id")
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            existing_like = db.query(Like).filter(Like.user_id == user.id, Like.image_id == image_id).first()
            if existing_like:
                # Redirect to unlike_post logic
                db.delete(existing_like)

                image = db.query(Image).filter(Image.id == image_id).first()
                if image and image.likes_count > 0:
                    image.likes_count -= 1

                db.commit()
                return {"message": "Post unliked successfully"}

            new_like = Like(user_id=user.id, image_id=image_id)
            db.add(new_like)

            image = db.query(Image).filter(Image.id == image_id).first()
            if image:
                image.likes_count += 1

            db.commit()
            return {"message": "Post liked successfully"}
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error liking post: {e}")

@app.delete("/likes/")
async def unlike_post(payload: dict = Body(...), token: str = Depends(oauth2_scheme)):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        image_id = payload.get("image_id")
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            existing_like = db.query(Like).filter(Like.user_id == user.id, Like.image_id == image_id).first()
            if not existing_like:
                raise HTTPException(status_code=400, detail="You have not liked this post")

            db.delete(existing_like)

            image = db.query(Image).filter(Image.id == image_id).first()
            if image and image.likes_count > 0:
                image.likes_count -= 1

            db.commit()
            return {"message": "Post unliked successfully"}
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error unliking post: {e}")

@app.post("/generate-image/")
async def generate_image_with_dalle(payload: dict = Body(...), token: str = Depends(oauth2_scheme)):
    try:
        jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = jwt_payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        prompt = payload.get("prompt")
        size = "1024x1024"
        style = "vivid"
        quality = "standard"
        n = 1
        prommt_style = payload.get("style")
        prompt = prompt + " in style " + prommt_style
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        dalle_url = os.getenv("DALLE_URL")
        dalle_api_key = os.getenv("DALLE_API")

        if not dalle_url or not dalle_api_key:
            raise HTTPException(status_code=500, detail="DALL-E API configuration is missing")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {dalle_api_key}"
        }

        data = {
            "model": "dall-e-3",
            "prompt": prompt,
            "size": size,
            "style": style,
            "quality": quality,
            "n": n
        }

        response = requests.post(dalle_url, headers=headers, json=data)

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=f"DALL-E API error: {response.text}")
        response_data = response.json()
        if "data" in response_data and len(response_data["data"]) > 0:
            image_url = response_data["data"][0].get("url")
            if image_url:
                return {"url": image_url}
        return response.json()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating image: {e}")

@app.post("/image-info/")
async def get_image_info(payload: dict = Body(...)):
    try:
        image_id = payload.get("image_id")
        if not image_id:
            raise HTTPException(status_code=400, detail="Image ID is required")

        db = SessionLocal()
        try:
            image = db.query(Image).filter(Image.id == image_id).first()
            if not image:
                raise HTTPException(status_code=404, detail="Image not found")

            return {
                "id": image.id,
                "image_url": image.image_url,
                "description": image.description,
                "is_ai_generated": image.is_ai_generated,
                "likes_count": image.likes_count,
                "created_at": image.created_at
            }
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching image information: {e}")

@app.post("/edit-image/", response_class=StreamingResponse)
async def edit_image_endpoint(
    file: UploadFile = File(...),
    prompt: str = Body(...),
    token: str = Depends(oauth2_scheme)
):
    """
    Endpoint to edit an uploaded image using a text prompt via DALL-E edits API.
    Returns the edited image as PNG stream.
    """
    # Verify token
    jwt_payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    username: str = jwt_payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Read uploaded file
    content = await file.read()
    # Save to temporary file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    # Perform edit
    edited_img = edit_image(tmp_path, prompt)

    # Convert to PNG buffer
    buf = BytesIO()
    edited_img.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")


