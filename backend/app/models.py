from sqlalchemy import Column, Integer, Text
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False)  # pgvector type
