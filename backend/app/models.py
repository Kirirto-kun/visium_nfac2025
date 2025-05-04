from sqlalchemy import Column, Integer, Text, String, ForeignKey, DateTime, func, CheckConstraint, Boolean
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    is_private = Column(Boolean, default=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    width = Column(Integer, CheckConstraint("width > 0"))
    height = Column(Integer, CheckConstraint("height > 0"))
    size = Column(Integer, CheckConstraint("size > 0"))
    format = Column(String(10))
    vector_embedding = Column(Vector(512))
    likes_count = Column(Integer, CheckConstraint("likes_count >= 0"), default=0)

    __table_args__ = (
        CheckConstraint("width > 0", name="check_width_positive"),
        CheckConstraint("height > 0", name="check_height_positive"),
        CheckConstraint("size > 0", name="check_size_positive"),
        CheckConstraint("likes_count >= 0", name="check_likes_count_non_negative"),
    )

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_picture_url = Column(String(255))
    followers_count = Column(Integer, default=0, nullable=False)
    following_count = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        CheckConstraint(followers_count >= 0, name="check_followers_count_non_negative"),
        CheckConstraint(following_count >= 0, name="check_following_count_non_negative"),
    )

class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("follower_id <> following_id", name="check_follower_not_equal_following"),
    )

class Like(Base):
    __tablename__ = "likes"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False)
    parent_comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"))
    content = Column(Text, CheckConstraint("LENGTH(content) BETWEEN 1 AND 2000"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_edited = Column(Boolean, default=False)