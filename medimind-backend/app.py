from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from auth.routes import router as auth_router
from prescription.routes import router as prescription_router
from scheduler.reminder_scheduler import start_scheduler, stop_scheduler, get_scheduler_status
import os
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    print("[APP] Starting MediMind Backend API...")
    start_scheduler()
    yield
    # Shutdown
    print("[APP] Shutting down...")
    stop_scheduler()


app = FastAPI(
    title="MediMind Backend API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
# Strip whitespace from origins
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(prescription_router, prefix="/api", tags=["Prescriptions"])

@app.get("/")
async def root():
    return {
        "message": "MediMind Backend API is running",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/auth",
            "prescriptions": "/api",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    try:
        from db.mongo import sync_client
        sync_client.admin.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    scheduler_status = get_scheduler_status()
    
    return {
        "status": "healthy",
        "database": db_status,
        "scheduler": scheduler_status
    }
