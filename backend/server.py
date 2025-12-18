from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContent
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'pawnote_db')]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI(title="Pawnote API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class Pet(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    birth_date: str  # Format: YYYY-MM-DD
    pet_type: str = "dog"  # dog, cat, bird, other
    custom_pet_type: Optional[str] = None  # For "other" type: Rabbit, Turtle, etc.
    breed: Optional[str] = None
    weight: Optional[float] = None  # Weight in pounds (lb)
    gender: Optional[str] = None  # male or female
    photo: Optional[str] = None  # Base64 image
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PetCreate(BaseModel):
    name: str
    birth_date: str
    pet_type: str = "dog"
    custom_pet_type: Optional[str] = None
    breed: Optional[str] = None
    weight: Optional[float] = None
    gender: Optional[str] = None
    photo: Optional[str] = None

class PetUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[str] = None
    pet_type: Optional[str] = None
    custom_pet_type: Optional[str] = None
    breed: Optional[str] = None
    weight: Optional[float] = None
    gender: Optional[str] = None
    photo: Optional[str] = None

class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    completed: bool = False
    due_time: Optional[str] = None  # HH:MM format

class Checklist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    title: str
    category: str = "daily"  # daily, medication, feeding, vet
    items: List[ChecklistItem] = []
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChecklistCreate(BaseModel):
    pet_id: str
    title: str
    category: str = "daily"
    items: List[dict] = []
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None

class ChecklistUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    items: Optional[List[dict]] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None

class VetVisit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    visit_date: str
    vet_name: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    instructions: List[str] = []
    follow_up_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VetVisitCreate(BaseModel):
    pet_id: str
    visit_date: str
    vet_name: Optional[str] = None
    reason: str
    notes: Optional[str] = None
    instructions: List[str] = []
    follow_up_date: Optional[str] = None

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pet_id: str
    title: str
    description: Optional[str] = None
    reminder_time: str  # HH:MM format
    reminder_date: Optional[str] = None  # YYYY-MM-DD for one-time
    is_recurring: bool = True
    recurrence_days: List[int] = [0, 1, 2, 3, 4, 5, 6]  # 0=Sunday
    category: str = "general"  # medication, feeding, walk, general
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReminderCreate(BaseModel):
    pet_id: str
    title: str
    description: Optional[str] = None
    reminder_time: str
    reminder_date: Optional[str] = None
    is_recurring: bool = True
    recurrence_days: List[int] = [0, 1, 2, 3, 4, 5, 6]
    category: str = "general"

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # user or assistant
    content: str
    image: Optional[str] = None  # Base64 image data
    pet_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    session_id: str
    message: str
    image: Optional[str] = None  # Base64 image data for vision
    pet_id: Optional[str] = None

class AccessRequest(BaseModel):
    pet_name: str
    birth_date: str

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to Pawnote API", "version": "1.0.0"}

# Access (Simple Auth)
@api_router.post("/access")
async def access_dashboard(request: AccessRequest):
    """Simple access via pet name and birth date"""
    pet = await db.pets.find_one({
        "name": {"$regex": f"^{request.pet_name}$", "$options": "i"},
        "birth_date": request.birth_date
    })
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found. Please check the name and birth date.")
    return {"success": True, "pet": Pet(**pet).dict()}

# Pets CRUD
@api_router.post("/pets", response_model=Pet)
async def create_pet(pet: PetCreate):
    pet_obj = Pet(**pet.dict())
    await db.pets.insert_one(pet_obj.dict())
    return pet_obj

@api_router.get("/pets", response_model=List[Pet])
async def get_pets(name: Optional[str] = None):
    query = {}
    if name:
        query["name"] = {"$regex": f"^{name}$", "$options": "i"}
    pets = await db.pets.find(query).to_list(100)
    return [Pet(**pet) for pet in pets]

@api_router.get("/pets/{pet_id}", response_model=Pet)
async def get_pet(pet_id: str):
    pet = await db.pets.find_one({"id": pet_id})
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return Pet(**pet)

@api_router.put("/pets/{pet_id}", response_model=Pet)
async def update_pet(pet_id: str, pet_update: PetUpdate):
    existing = await db.pets.find_one({"id": pet_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Pet not found")
    
    update_data = {k: v for k, v in pet_update.dict().items() if v is not None}
    if update_data:
        await db.pets.update_one({"id": pet_id}, {"$set": update_data})
    
    updated = await db.pets.find_one({"id": pet_id})
    return Pet(**updated)

@api_router.delete("/pets/{pet_id}")
async def delete_pet(pet_id: str):
    result = await db.pets.delete_one({"id": pet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pet not found")
    # Also delete related data
    await db.checklists.delete_many({"pet_id": pet_id})
    await db.vet_visits.delete_many({"pet_id": pet_id})
    await db.reminders.delete_many({"pet_id": pet_id})
    return {"message": "Pet deleted successfully"}

# Checklists CRUD
@api_router.post("/checklists", response_model=Checklist)
async def create_checklist(checklist: ChecklistCreate):
    items = [ChecklistItem(**item) if isinstance(item, dict) else item for item in checklist.items]
    checklist_obj = Checklist(
        pet_id=checklist.pet_id,
        title=checklist.title,
        category=checklist.category,
        items=[item.dict() if hasattr(item, 'dict') else item for item in items],
        is_recurring=checklist.is_recurring,
        recurrence_pattern=checklist.recurrence_pattern
    )
    await db.checklists.insert_one(checklist_obj.dict())
    return checklist_obj

@api_router.get("/checklists", response_model=List[Checklist])
async def get_checklists(pet_id: Optional[str] = None, category: Optional[str] = None):
    query = {}
    if pet_id:
        query["pet_id"] = pet_id
    if category:
        query["category"] = category
    checklists = await db.checklists.find(query).to_list(100)
    return [Checklist(**cl) for cl in checklists]

@api_router.get("/checklists/{checklist_id}", response_model=Checklist)
async def get_checklist(checklist_id: str):
    checklist = await db.checklists.find_one({"id": checklist_id})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return Checklist(**checklist)

@api_router.put("/checklists/{checklist_id}", response_model=Checklist)
async def update_checklist(checklist_id: str, update: ChecklistUpdate):
    existing = await db.checklists.find_one({"id": checklist_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    if "items" in update_data:
        update_data["items"] = [
            ChecklistItem(**item).dict() if isinstance(item, dict) and "id" not in item else 
            (item if isinstance(item, dict) else item.dict())
            for item in update_data["items"]
        ]
    
    await db.checklists.update_one({"id": checklist_id}, {"$set": update_data})
    updated = await db.checklists.find_one({"id": checklist_id})
    return Checklist(**updated)

@api_router.patch("/checklists/{checklist_id}/items/{item_id}")
async def toggle_checklist_item(checklist_id: str, item_id: str, completed: bool):
    checklist = await db.checklists.find_one({"id": checklist_id})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    items = checklist.get("items", [])
    for item in items:
        if item.get("id") == item_id:
            item["completed"] = completed
            break
    
    await db.checklists.update_one(
        {"id": checklist_id}, 
        {"$set": {"items": items, "updated_at": datetime.utcnow()}}
    )
    return {"success": True}

@api_router.delete("/checklists/{checklist_id}")
async def delete_checklist(checklist_id: str):
    result = await db.checklists.delete_one({"id": checklist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return {"message": "Checklist deleted"}

# Vet Visits CRUD
@api_router.post("/vet-visits", response_model=VetVisit)
async def create_vet_visit(visit: VetVisitCreate):
    visit_obj = VetVisit(**visit.dict())
    await db.vet_visits.insert_one(visit_obj.dict())
    return visit_obj

@api_router.get("/vet-visits", response_model=List[VetVisit])
async def get_vet_visits(pet_id: Optional[str] = None):
    query = {}
    if pet_id:
        query["pet_id"] = pet_id
    visits = await db.vet_visits.find(query).sort("visit_date", -1).to_list(100)
    return [VetVisit(**v) for v in visits]

@api_router.get("/vet-visits/{visit_id}", response_model=VetVisit)
async def get_vet_visit(visit_id: str):
    visit = await db.vet_visits.find_one({"id": visit_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Vet visit not found")
    return VetVisit(**visit)

@api_router.put("/vet-visits/{visit_id}", response_model=VetVisit)
async def update_vet_visit(visit_id: str, update: VetVisitCreate):
    existing = await db.vet_visits.find_one({"id": visit_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Vet visit not found")
    
    update_data = update.dict()
    await db.vet_visits.update_one({"id": visit_id}, {"$set": update_data})
    updated = await db.vet_visits.find_one({"id": visit_id})
    return VetVisit(**updated)

@api_router.delete("/vet-visits/{visit_id}")
async def delete_vet_visit(visit_id: str):
    result = await db.vet_visits.delete_one({"id": visit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vet visit not found")
    return {"message": "Vet visit deleted"}

@api_router.post("/vet-visits/{visit_id}/to-checklist")
async def convert_vet_to_checklist(visit_id: str):
    """Convert vet instructions to a checklist"""
    visit = await db.vet_visits.find_one({"id": visit_id})
    if not visit:
        raise HTTPException(status_code=404, detail="Vet visit not found")
    
    visit_obj = VetVisit(**visit)
    if not visit_obj.instructions:
        raise HTTPException(status_code=400, detail="No instructions to convert")
    
    items = [
        ChecklistItem(text=instruction).dict()
        for instruction in visit_obj.instructions
    ]
    
    checklist = Checklist(
        pet_id=visit_obj.pet_id,
        title=f"Vet Instructions - {visit_obj.reason}",
        category="vet",
        items=items
    )
    await db.checklists.insert_one(checklist.dict())
    return checklist

# Reminders CRUD
@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder: ReminderCreate):
    reminder_obj = Reminder(**reminder.dict())
    await db.reminders.insert_one(reminder_obj.dict())
    return reminder_obj

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(pet_id: Optional[str] = None, is_active: bool = True):
    query = {"is_active": is_active}
    if pet_id:
        query["pet_id"] = pet_id
    reminders = await db.reminders.find(query).to_list(100)
    return [Reminder(**r) for r in reminders]

@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, update: ReminderCreate):
    existing = await db.reminders.find_one({"id": reminder_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    update_data = update.dict()
    await db.reminders.update_one({"id": reminder_id}, {"$set": update_data})
    updated = await db.reminders.find_one({"id": reminder_id})
    return Reminder(**updated)

@api_router.patch("/reminders/{reminder_id}/toggle")
async def toggle_reminder(reminder_id: str):
    reminder = await db.reminders.find_one({"id": reminder_id})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    new_status = not reminder.get("is_active", True)
    await db.reminders.update_one({"id": reminder_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    result = await db.reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}

# AI Chat
@api_router.post("/chat")
async def chat_with_ai(request: ChatRequest):
    """Chat with AI pet care assistant"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get pet info if provided
    pet_context = ""
    if request.pet_id:
        pet = await db.pets.find_one({"id": request.pet_id})
        if pet:
            pet_obj = Pet(**pet)
            # Build pet type string (use custom type for "other")
            pet_type_str = pet_obj.custom_pet_type if pet_obj.pet_type == "other" and pet_obj.custom_pet_type else pet_obj.pet_type
            # Build gender string
            gender_str = f" {pet_obj.gender}" if pet_obj.gender else ""
            pet_context = f"\n\nCurrent pet context: {pet_obj.name} is a{gender_str} {pet_type_str}"
            if pet_obj.breed:
                pet_context += f" ({pet_obj.breed})"
            pet_context += f", born on {pet_obj.birth_date}"
            if pet_obj.weight:
                pet_context += f", weighing {pet_obj.weight} lb"
            pet_context += "."
    
    # Get chat history
    history = await db.chat_messages.find(
        {"session_id": request.session_id}
    ).sort("created_at", 1).to_list(20)
    
    system_message = f"""You are Pawnote AI, a friendly and supportive pet care assistant. 
You help pet owners with:
- General pet care questions and tips
- Understanding vet instructions
- Daily care routines and best practices
- Answering "Is this normal?" type questions
- Providing age-appropriate care guidance

Important guidelines:
- Be warm, supportive, and conversational
- Never diagnose medical conditions - always recommend consulting a vet for health concerns
- Provide practical, actionable advice
- Consider the pet's species, breed, and age when giving advice
- Keep responses concise but helpful{pet_context}"""
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=request.session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Build conversation context
        for msg in history[-10:]:  # Last 10 messages for context
            if msg.get("role") == "user":
                await chat.send_message(UserMessage(text=msg.get("content", "")))
        
        # Send current message (with or without image)
        if request.image:
            # Extract base64 data if it includes data URI prefix
            image_data = request.image
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            
            # Create FileContent for the image
            image_file = FileContent(content_type="image/jpeg", file_content_base64=image_data)
            
            # Send image with optional text
            message_text = request.message.strip() if request.message else "What do you see in this image? Please provide any relevant pet care advice based on what you observe."
            user_message = UserMessage(text=message_text, file_contents=[image_file])
            response = await chat.send_message(user_message)
        else:
            user_message = UserMessage(text=request.message)
            response = await chat.send_message(user_message)
        
        # Save messages to database
        user_msg = ChatMessage(
            session_id=request.session_id,
            role="user",
            content=request.message or "[Image]",
            image=request.image,
            pet_id=request.pet_id
        )
        await db.chat_messages.insert_one(user_msg.dict())
        
        assistant_msg = ChatMessage(
            session_id=request.session_id,
            role="assistant",
            content=response,
            pet_id=request.pet_id
        )
        await db.chat_messages.insert_one(assistant_msg.dict())
        
        return {"response": response}
    except Exception as e:
        logging.error(f"AI Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    messages = await db.chat_messages.find(
        {"session_id": session_id}
    ).sort("created_at", 1).to_list(limit)
    return [{"role": m["role"], "content": m["content"], "created_at": m["created_at"]} for m in messages]

@api_router.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"message": "Chat history cleared"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
