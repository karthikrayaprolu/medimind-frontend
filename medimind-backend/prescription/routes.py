import os
import easyocr
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from bson import ObjectId
from dotenv import load_dotenv
from pydantic import BaseModel
from openai import OpenAI

from db.mongo import sync_prescriptions, sync_schedules, sync_users

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-120b")

# Initialize OpenAI client with OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

router = APIRouter()

# OCR reader (loads once)
reader = easyocr.Reader(["en"])

# ==== PYDANTIC MODELS ====
class MedicineSchedule(BaseModel):
    prescription_id: str
    medicine_name: str
    dosage: str
    frequency: str
    timings: List[str]
    enabled: bool = True

class ScheduleToggle(BaseModel):
    schedule_id: str
    enabled: bool

# ==== HELPERS ====
def serialize_doc(doc):
    """Convert ObjectId to str for JSON response"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def extract_text_from_image(image_path: str) -> str:
    """Extract text from image using EasyOCR"""
    results = reader.readtext(image_path, detail=0)
    text = " ".join(results)
    return text

def call_openrouter_llm(text: str):
    """Call OpenRouter API for structured extraction using OpenAI client"""
    prompt = f"""
    You are a medical prescription parser.
    Extract structured data from the prescription text below.
    Required fields:
    - medicine_name
    - dosage (how many tablets/capsules per time)
    - quantity (total prescribed)
    - frequency (times per day or instructions like 'after food')
    - timings (morning, afternoon, evening, night)

    Prescription text:
    {text}

    Return output as strict JSON list of objects.
    Example:
    [
      {{
        "medicine_name": "Paracetamol",
        "dosage": "1 tablet",
        "quantity": "10",
        "frequency": "2 times a day",
        "timings": ["morning", "night"]
      }}
    ]
    """

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.1,
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "MediMind Prescription Parser",
            }
        )
        
        reply = response.choices[0].message.content
        return reply
            
    except Exception as e:
        print(f"LLM Error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM processing failed: {str(e)}")

# ==== ROUTES ====

@router.post("/upload-prescription")
async def upload_prescription(file: UploadFile = File(...), user_id: str = Form(...)):
    """Upload prescription and create medicine schedule"""
    try:
        # Verify user exists
        user = sync_users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Save uploaded file temporarily
        file_location = f"temp_{file.filename}"
        with open(file_location, "wb") as f:
            f.write(await file.read())

        # OCR
        print(f"Extracting text from image: {file_location}")
        text = extract_text_from_image(file_location)
        print(f"Extracted text: {text[:200]}...")

        # LLM Extraction
        print("Calling LLM for structured extraction...")
        structured_json = call_openrouter_llm(text)
        print(f"LLM response: {structured_json}")

        # Save prescription
        prescription_doc = {
            "user_id": user_id,
            "raw_text": text,
            "structured_data": structured_json,
            "created_at": datetime.utcnow()
        }
        prescription_id = sync_prescriptions.insert_one(prescription_doc).inserted_id

        # Parse and create schedules
        try:
            medicines = json.loads(structured_json) if isinstance(structured_json, str) else structured_json
        except:
            medicines = [{"medicine_name": "Unknown", "dosage": "As prescribed", "frequency": "Daily", "timings": ["morning"]}]
        
        schedule_ids = []
        for medicine in medicines:
            if isinstance(medicine, dict):
                schedule_doc = {
                    "user_id": user_id,
                    "prescription_id": str(prescription_id),
                    "medicine_name": medicine.get("medicine_name", "Unknown Medicine"),
                    "dosage": medicine.get("dosage", "As prescribed"),
                    "frequency": medicine.get("frequency", "Daily"),
                    "timings": medicine.get("timings", ["morning"]),
                    "enabled": True,
                    "created_at": datetime.utcnow()
                }
                schedule_id = sync_schedules.insert_one(schedule_doc).inserted_id
                schedule_ids.append(str(schedule_id))

        # Clean up temp file
        try:
            os.remove(file_location)
        except:
            pass

        return JSONResponse({
            "success": True,
            "prescription_id": str(prescription_id),
            "schedule_ids": schedule_ids,
            "medicines": medicines,
            "message": "Prescription uploaded and schedules created successfully"
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in upload_prescription: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/schedules")
async def get_user_schedules(user_id: str):
    """Get all schedules for a user"""
    try:
        user_schedules = list(sync_schedules.find({"user_id": user_id}))
        return [serialize_doc(schedule) for schedule in user_schedules]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/prescriptions")
async def get_user_prescriptions(user_id: str):
    """Get all prescriptions for a user"""
    try:
        user_prescriptions = list(sync_prescriptions.find({"user_id": user_id}))
        return [serialize_doc(prescription) for prescription in user_prescriptions]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/toggle-schedule")
async def toggle_schedule(toggle_data: ScheduleToggle):
    """Enable or disable a specific schedule"""
    try:
        result = sync_schedules.update_one(
            {"_id": ObjectId(toggle_data.schedule_id)},
            {"$set": {"enabled": toggle_data.enabled}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        status = "enabled" if toggle_data.enabled else "disabled"
        return JSONResponse({
            "success": True,
            "message": f"Schedule {status} successfully"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/schedule/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete a specific schedule"""
    try:
        result = sync_schedules.delete_one({"_id": ObjectId(schedule_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Schedule not found")
        
        return JSONResponse({
            "success": True,
            "message": "Schedule deleted successfully"
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
