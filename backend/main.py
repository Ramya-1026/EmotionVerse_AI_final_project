import sys
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from llm import generate_response


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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    userId: str
    message: str


# -----------------------------
# MongoDB
# -----------------------------

client = MongoClient("mongodb://localhost:27017/")

db = client["emotionverse"]

emotion_collection = db["emotion_history"]


# -----------------------------
# Home
# -----------------------------

@app.get("/")
def home():
    return {
        "message": "EmotionVerse AI backend is running!"
    }


# -----------------------------
# Chat API
# -----------------------------

@app.post("/api/chat")
def chat(request: ChatRequest):

    userId = request.userId
    message = request.message

    # 1. Detect current emotion
    emotion, confidence = predict_emotion(message)

    # 2. Get previous emotion history
    previous_records = emotion_collection.find(
        {"userId": userId},
        {"_id": 0}
    ).sort("timestamp", -1).limit(5)

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
        "timestamp": timestamp
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

@app.get("/api/emotions/{user_id}")
def get_emotions(user_id: str):

    records = emotion_collection.find(
        {"userId": user_id},
        {"_id": 0}
    ).sort("timestamp", -1)

    return {
        "userId": user_id,
        "history": list(records)
    }