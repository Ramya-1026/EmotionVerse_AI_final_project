import os
import sys
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from llm import generate_response

from auth import (
    register_user,
    login_user,
    logout_user,
    get_username_from_token,
    set_memory_pin,
    has_memory_pin,
    verify_memory_pin,
    set_password,
)

load_dotenv()


# -----------------------------
# Emotion model path
# -----------------------------

EMOTION_MODEL_PATH = Path(__file__).parent.parent / "emotion-model"
sys.path.append(str(EMOTION_MODEL_PATH))

from predict_emotion import predict_emotion


# -----------------------------
# FastAPI
# -----------------------------

app = FastAPI(title="EmotionVerse AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "[localhost](http://localhost:5173)",
        "[127.0.0.1](http://127.0.0.1:5173)",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    userId: str
    message: str


class AuthRequest(BaseModel):
    username: str
    password: str


class PinRequest(BaseModel):
    userId: str
    pin: str


class DeleteRequest(BaseModel):
    pin: str


class LockRequest(BaseModel):
    pin: str


class UnlockRequest(BaseModel):
    pin: str


class ResetRequest(BaseModel):
    username: str
    pin: str
    newPassword: str


# -----------------------------
# MongoDB
# -----------------------------

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(MONGO_URI)

db = client["emotionverse"]

emotion_collection = db["emotion_history"]


# -----------------------------
# Helpers
# -----------------------------

def serialize_record(record):
    """Convert a Mongo record into JSON-safe dict."""
    record["_id"] = str(record["_id"])
    return record


# -----------------------------
# Emotion correction layer
# -----------------------------

POSITIVE_HINTS = [
    "passed", "pass", "cleared", "topped", "won", "win",
    "selected", "placed", "got the job", "promotion",
    "congratulations", "achieved", "result", "exam", "grade",
    "distinction", "rank", "success", "achievement", "prize",
    "award", "celebrate", "celebration", "birthday", "wedding",
    "engaged", "date", "trip", "holiday", "vacation",
]

NEGATIVE_HINTS = [
    "failed", "fail", "lost", "broke up", "breakup", "rejected",
    "ignored", "alone", "lonely", "cry", "crying", "hurt",
    "scolded", "fight", "argued", "miss", "missing", "died",
    "funeral", "sick", "hospital", "divorce",
]

ANGRY_HINTS = [
    "angry", "furious", "hate", "unfair", "cheated", "betrayed",
    "rude", "annoyed", "irritated", "frustrated",
]

FEAR_HINTS = [
    "scared", "afraid", "terrified", "worried", "anxious",
    "nervous", "panic", "dread",
]


def correct_emotion(message, emotion, confidence):
    """Nudge obvious cases the classifier misses."""

    text = (message or "").lower()

    if confidence >= 0.75:
        return emotion, confidence

    def has(hints):
        return any(h in text for h in hints)

    if has(FEAR_HINTS):
        return "fear", max(confidence, 0.75)

    if has(ANGRY_HINTS):
        return "anger", max(confidence, 0.75)

    if has(NEGATIVE_HINTS):
        return "sadness", max(confidence, 0.75)

    if has(POSITIVE_HINTS):
        return "joy", max(confidence, 0.75)

    return emotion, confidence


# -----------------------------
# Memory PIN
# -----------------------------

def require_pin(userId: str, pin: str):
    """Raise if the PIN is missing or wrong."""

    if not has_memory_pin(userId):
        raise HTTPException(
            status_code=403,
            detail="No PIN set. Create one first."
        )

    if not verify_memory_pin(userId, pin):
        raise HTTPException(
            status_code=403,
            detail="Incorrect PIN."
        )


@app.get("/api/memory/pin/status/{user_id}")
def pin_status(user_id: str):
    return {"hasPin": has_memory_pin(user_id)}


@app.post("/api/memory/pin/set")
def create_pin(request: PinRequest):

    success, message = set_memory_pin(
        request.userId,
        request.pin
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


@app.post("/api/memory/pin/verify")
def check_pin(request: PinRequest):

    require_pin(request.userId, request.pin)

    return {"success": True}


# -----------------------------
# Home
# -----------------------------

@app.get("/")
def home():
    return {"message": "EmotionVerse AI backend is running!"}


# -----------------------------
# Auth
# -----------------------------

@app.post("/api/register")
def register(request: AuthRequest):

    success, message = register_user(
        request.username,
        request.password
    )

    return {"success": success, "message": message}


@app.post("/api/login")
def login(request: AuthRequest):

    success, result = login_user(
        request.username,
        request.password
    )

    if not success:
        return {"success": False, "message": result}

    return {
        "success": True,
        "token": result,
        "username": request.username.strip().lower()
    }


@app.post("/api/logout")
def logout(authorization: str = Header(default="")):

    token = authorization.replace("Bearer ", "").strip()

    logout_user(token)

    return {"success": True}


@app.get("/api/me")
def me(authorization: str = Header(default="")):

    token = authorization.replace("Bearer ", "").strip()

    username = get_username_from_token(token)

    if not username:
        return {"success": False, "username": None}

    return {"success": True, "username": username}


# -----------------------------
# Forgot password (PIN verified)
# -----------------------------

@app.post("/api/reset-password")
def reset_password(request: ResetRequest):

    username = request.username.strip().lower()

    if not has_memory_pin(username):
        raise HTTPException(
            status_code=403,
            detail="No PIN set on this account. Contact support."
        )

    if not verify_memory_pin(username, request.pin):
        raise HTTPException(status_code=403, detail="Incorrect PIN.")

    success, message = set_password(username, request.newPassword)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"success": True, "message": message}


# -----------------------------
# Chat API
# -----------------------------

@app.post("/api/chat")
def chat(request: ChatRequest):

    userId = request.userId
    message = request.message

    # 1. Detect current emotion
    emotion, confidence = predict_emotion(message)

    # 1b. Nudge obvious cases the classifier misses
    emotion, confidence = correct_emotion(
        message, emotion, confidence
    )

    # 2. Get previous emotion history
    previous_records = emotion_collection.find(
        {"userId": userId},
        {"_id": 0}
    ).sort("timestamp", -1).limit(15)

    history = list(previous_records)

    # 3. Generate chatbot response
    response = generate_response(
        message,
        emotion,
        history
    )

    # 4. Save conversation
    timestamp = datetime.now(timezone.utc)

    emotion_data = {
        "userId": userId,
        "message": message,
        "emotion": emotion,
        "confidence": confidence,
        "response": response,
        "timestamp": timestamp,
        "locked": False,
    }

    emotion_collection.insert_one(emotion_data)

    # 5. Return data to frontend
    return {
        "userId": userId,
        "message": message,
        "emotion": emotion,
        "confidence": confidence,
        "response": response,
        "timestamp": timestamp
    }


# -----------------------------
# History
# -----------------------------

@app.get("/api/emotions/{user_id}")
def get_emotions(user_id: str):

    records = emotion_collection.find(
        {"userId": user_id}
    ).sort("timestamp", -1)

    result = []

    for record in records:
        record = serialize_record(record)

        if record.get("locked"):
            # Locked content never leaves the server
            record["message"] = None
            record["response"] = None

        result.append(record)

    return {
        "userId": user_id,
        "history": result
    }


@app.delete("/api/emotions/{user_id}/{record_id}")
def delete_emotion(user_id: str, record_id: str, request: DeleteRequest):

    require_pin(user_id, request.pin)

    try:
        object_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record id")

    record = emotion_collection.find_one(
        {"_id": object_id, "userId": user_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    emotion_collection.delete_one({"_id": object_id})

    return {"success": True, "deleted": record_id}


@app.delete("/api/emotions/{user_id}")
def clear_unlocked(user_id: str):
    """Delete every unlocked memory for this user."""

    emotion_collection.delete_many({
        "userId": user_id,
        "locked": {"$ne": True},
    })

    return {"success": True}


# -----------------------------
# Lock / unlock
# -----------------------------

@app.patch("/api/emotions/{user_id}/{record_id}/lock")
def toggle_lock(user_id: str, record_id: str, request: LockRequest):

    require_pin(user_id, request.pin)

    try:
        object_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record id")

    record = emotion_collection.find_one(
        {"_id": object_id, "userId": user_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    new_state = not bool(record.get("locked"))

    emotion_collection.update_one(
        {"_id": object_id},
        {"$set": {"locked": new_state}}
    )

    return {"success": True, "locked": new_state}


@app.post("/api/emotions/{user_id}/{record_id}/unlock")
def unlock_emotion(user_id: str, record_id: str, request: UnlockRequest):
    """Return the real content of one locked memory, after PIN check."""

    require_pin(user_id, request.pin)

    try:
        object_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record id")

    record = emotion_collection.find_one(
        {"_id": object_id, "userId": user_id}
    )

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"success": True, "record": serialize_record(record)}
