import warnings
# Suppress PyTorch pin_memory warning
warnings.filterwarnings("ignore", message="'pin_memory' argument is set as true but no accelerator is found*")
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
    # Removed: print(f"Extracted text: {text[:200]}...")
    return text


# === OPENROUTER LLM PRESCRIPTION PARSER ===
def call_openrouter_llm(text: str):
    prompt = (
        "You are an expert medical prescription parsing engine with 20+ years of experience in\n"
        "clinical pharmacy, medical terminology, and medication-instruction interpretation.\n\n"
        "Your task is to extract **structured JSON data** from a prescription text or extracted OCR text.\n\n"
        "--------------------------------------------\n"
        "### REQUIRED OUTPUT FORMAT (STRICT)\n"
        "Return ONLY a JSON array. No markdown, no comments.\n\n"
        "Each medicine must be formatted as:\n"
        "{{\n"
        "  \"medicine_name\": \"...\",\n"
        "  \"dosage\": \"...\",\n"
        "  \"quantity\": \"...\",\n"
        "  \"frequency\": \"...\",\n"
        "  \"timings\": [\"morning\", \"afternoon\", \"evening\", \"night\"]\n"
        "}}\n"
        "--------------------------------------------\n\n"
        "### FIELD RULES (MANDATORY)\n"
        "1. If ANY FIELD is missing or unclear → use string \"N/A\".\n"
        "2. \"timings\" must ALWAYS be an ARRAY containing ONLY:\n"
        "   [\"morning\", \"afternoon\", \"evening\", \"night\"]\n"
        "3. If timing cannot be inferred → default to [\"morning\"].\n"
        "4. DO NOT leave any field null, empty, or undefined.\n\n"
        "--------------------------------------------\n"
        "### FREQUENCY INTERPRETATION LOGIC\n"
        "Use these rules to infer correct frequency:\n\n"
        "- \"t.i.d.\" or \"tid\" or \"three times a day\" → \"thrice a day\"\n"
        "- \"b.i.d.\" or \"bid\" or \"two times a day\" → \"twice a day\"\n"
        "- \"q.i.d.\" or \"qid\" → \"four times a day\"\n"
        "- \"q.d.\" or \"qd\" → \"once a day\"\n"
        "- \"a.c.\" (before meals):\n"
        "    - assume timing = [\"morning\", \"afternoon\", \"evening\"]\n"
        "- \"p.c.\" (after meals):\n"
        "    - assume timing = [\"morning\", \"afternoon\", \"evening\"]\n\n"
        "If unclear:\n"
        "- thrice a day → [\"morning\", \"afternoon\", \"evening\"]\n"
        "- twice a day → [\"morning\", \"evening\"]\n"
        "- once a day → [\"morning\"]\n\n"
        "--------------------------------------------\n"
        "### WEB KNOWLEDGE RULE (VERY IMPORTANT)\n"
        "If the prescription text is missing information such as:\n"
        "- standard dosage form\n"
        "- standard quantity\n"
        "- default adult dosage\n"
        "- common usage frequency\n"
        "- common schedule for that medicine\n\n"
        "You MUST:\n"
        "1. Use authoritative medical knowledge you already have access to  \n"
        "   (e.g., widely accepted standard dosing schedules found on the web).\n"
        "2. Use your web-learned knowledge to fill in any N/A fields wherever possible, especially for medical safety and completeness.\n"
        "3. Only use 'N/A' if you are absolutely unable to infer the value from any authoritative or web-learned source.\n"
        "4. BUT NEVER hallucinate details that contradict the prescription.\n"
        "5. If the drug is unknown or ambiguous → set unclear fields to \"N/A\".\n\n"
        "Example:\n"
        "If the prescription says only “Paracetamol” but dose missing →  \n"
        "search your internal medical knowledge (web-learned data) and infer typical values:\n"
        "- dosage: \"500mg\" (if commonly standard)\n"
        "- frequency: \"thrice a day\"\n"
        "- timings: [\"morning\", \"afternoon\", \"evening\"]\n\n"
        "If inference cannot be done safely → use \"N/A\".\n\n"
        "--------------------------------------------\n"
        "### PARSING RULES FOR PRESCRIPTION FORMAT\n"
        "You must identify correctly:\n"
        "- superscription (Rx)\n"
        "- inscription (medicine list)\n"
        "- subscription (preparation instructions)\n"
        "- signa (sig: dosage instructions)\n\n"
        "Focus ONLY on medication data. Ignore doctor name, date, patient details.\n\n"
        "--------------------------------------------\n"
        "### FINAL INSTRUCTIONS\n"
        "- Output MUST be valid JSON.\n"
        "- Every medicine must be a separate object.\n"
        "- Never add explanations or text outside JSON.\n\n"
        "--------------------------------------------\n\n"
        f"Prescription text:\n{text}\n"
    )

    if not client:
        raise HTTPException(status_code=500, detail="OpenRouter API not initialized")

    try:
        # Removed: print("[UPLOAD] Calling OpenRouter for structured extraction...")
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
        # Removed: print(f"[UPLOAD] OpenRouter response: {reply[:200]}...")
        return reply
    except Exception as e:
        # Removed: print(f"[OPENROUTER] Error: {e}")
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
        # Removed: print(f"Cleaned JSON: {cleaned_json}")

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
            # Removed: print(f"Cleaned medicines: {medicines}")
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
                # Removed: print(f"[SCHEDULE] Created schedule for {medicine_name} with timings: {timings}")

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
