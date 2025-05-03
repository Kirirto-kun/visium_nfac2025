from sqlalchemy import Column, Integer, Text, String, ForeignKey, DateTime, func, CheckConstraint
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(Text, nullable=False)
    embedding = Column(Vector(), nullable=False)  # pgvector type

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