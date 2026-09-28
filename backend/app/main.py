# Use the OS certificate store so corporate TLS-inspecting proxies are trusted; must run before any HTTP client is created.
import truststore
truststore.inject_into_ssl()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.session import engine, SessionLocal
from app.models.base import Base
import app.models.session 
import app.models.user
from app.api.ws import router as ws_router
from app.api.rest import router as rest_router
from app.api.auth import router as auth_router
from app.core.security import get_password_hash

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Seed Admin User
db = SessionLocal()
from app.models.user import User
if not db.query(User).filter(User.email == "admin@boomerbot.com").first():
    admin = User(
        email="admin@boomerbot.com",
        hashed_password=get_password_hash("password123"),
        role="ADMIN"
    )
    db.add(admin)
    db.commit()
db.close()

app = FastAPI(title=settings.PROJECT_NAME)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ws_router)
app.include_router(rest_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to BoomerBot API"}
