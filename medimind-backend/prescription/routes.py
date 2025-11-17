import os
import easyocr
import json
import re
from datetime import datetime
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from bson import ObjectId
from dotenv import load_dotenv
from pydantic import BaseModel
from openai import OpenAI

from db.mongo import sync_prescriptions, sync_schedules, sync_users

load_dotenv()

# Set OpenRouter API key and model from environment
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "tngtech/deepseek-r1t2-chimera:free")

# Initialize OpenAI client for OpenRouter
try:
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
    print("[INIT] OpenRouter API initialized")
    print(f"[INIT] Model: {OPENROUTER_MODEL}")
except Exception as e:
    print(f"[INIT] Failed to initialize OpenRouter client: {e}")
    client = None

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


# === OPENROUTER LLM PRESCRIPTION PARSER ===
def call_openrouter_llm(text: str):
    prompt = f"""
    You are an expert medical prescription parser.
    Extract structured data from the prescription text below.
    
    Required fields:
    - medicine_name: The medication name
    - dosage: Amount per dose (e.g., '500mg', '1 tablet')
    - quantity: Total prescribed (e.g., '10 tablets', '1 bottle')
    - frequency: How often (e.g., 'twice a day', 'thrice a day')
    - timings: MUST be an array with ONLY these values: 'morning', 'afternoon', 'evening', 'night'

    CRITICAL RULES:
    1. If any field is missing or unclear, use the string 'N/A' (not null)
    2. For timings, ONLY use: 'morning', 'afternoon', 'evening', 'night'
    3. If timing is unclear (like 'before food', 'after food'), try to infer reasonable times
    4. 'thrice a day' usually means ['morning', 'afternoon', 'evening']
    5. 'twice a day' usually means ['morning', 'evening']
    6. If you cannot determine timing, use ['morning']
    7. Return ONLY valid JSON, no markdown, no code blocks

    Prescription text:
    {text}

    Example output:
    [
      {{
        "medicine_name": "Metformin",
        "dosage": "250mg",
        "quantity": "N/A",
        "frequency": "thrice a day",
        "timings": ["morning", "afternoon", "evening"]
      }}
    ]
    """

    if not client:
        raise HTTPException(status_code=500, detail="OpenRouter API not initialized")

    try:
        print("[UPLOAD] Calling OpenRouter for structured extraction...")
        completion = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            extra_headers={
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "MediMind Prescription Parser",
            },
            extra_body={}
        )
        reply = completion.choices[0].message.content
        print(f"[UPLOAD] OpenRouter response: {reply[:200]}...")
        return reply
    except Exception as e:
        print(f"[OPENROUTER] Error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenRouter LLM processing failed: {str(e)}")

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
        print("[UPLOAD] Calling OpenRouter for structured extraction...")
        try:
            structured_json = call_openrouter_llm(text)
            print(f"[UPLOAD] OpenRouter response: {structured_json[:200]}...")
        except Exception as e:
            print(f"[OPENROUTER] LLM extraction failed: {e}")
            raise HTTPException(status_code=500, detail=f"OpenRouter LLM extraction failed: {e}")

        # Clean markdown code blocks if present
        cleaned_json = structured_json.strip()
        if cleaned_json.startswith("```json"):
            cleaned_json = cleaned_json[7:].strip()
        elif cleaned_json.startswith("```"):
            cleaned_json = cleaned_json[3:].strip()
        if cleaned_json.endswith("```"):
            cleaned_json = cleaned_json[:-3].strip()
        print(f"Cleaned JSON: {cleaned_json}")

        # Save prescription
        prescription_doc = {
            "user_id": user_id,
            "raw_text": text,
            "structured_data": cleaned_json,
            "created_at": datetime.utcnow()
        }
        prescription_id = sync_prescriptions.insert_one(prescription_doc).inserted_id

        # Parse and create schedules
        try:
            medicines = json.loads(cleaned_json) if isinstance(cleaned_json, str) else cleaned_json
            # Clean up null values and invalid timings
            valid_timings = ["morning", "afternoon", "evening", "night"]
            for medicine in medicines:
                if isinstance(medicine, dict):
                    # Convert null to "N/A"
                    for key in ["medicine_name", "dosage", "quantity", "frequency"]:
                        if medicine.get(key) is None:
                            medicine[key] = "N/A"
                    # Filter invalid timings
                    timings = medicine.get("timings", [])
                    if timings and isinstance(timings, list):
                        medicine["timings"] = [t for t in timings if t in valid_timings]
                        if not medicine["timings"]:
                            medicine["timings"] = ["morning"]
            print(f"Cleaned medicines: {medicines}")
        except Exception as e:
            print(f"[OPENROUTER] JSON parsing error: {e}")
            print(f"[OPENROUTER] Raw response: {cleaned_json}")
            medicines = [{"medicine_name": "Unknown", "dosage": "As prescribed", "frequency": "Daily", "timings": ["morning"]}]

        schedule_ids = []
        for medicine in medicines:
            if isinstance(medicine, dict):
                medicine_name = medicine.get("medicine_name", "N/A")
                timings = medicine.get("timings", [])
                if not medicine_name or medicine_name in ["N/A", "Unknown", "Unknown Medicine"]:
                    print(f"[SCHEDULE] Skipping - invalid medicine_name: {medicine_name}")
                    continue
                if not timings or timings == []:
                    print(f"[SCHEDULE] Skipping {medicine_name} - no valid timings")
                    continue
                schedule_doc = {
                    "user_id": user_id,
                    "prescription_id": str(prescription_id),
                    "medicine_name": medicine_name,
                    "dosage": medicine.get("dosage", "N/A"),
                    "frequency": medicine.get("frequency", "N/A"),
                    "timings": timings,
                    "enabled": True,
                    "created_at": datetime.utcnow(),
                    "last_reminder_sent": None
                }
                schedule_id = sync_schedules.insert_one(schedule_doc).inserted_id
                schedule_ids.append(str(schedule_id))
                print(f"[SCHEDULE] Created schedule for {medicine_name} with timings: {timings}")

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
