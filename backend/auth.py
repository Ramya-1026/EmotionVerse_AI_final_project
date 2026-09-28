from datetime import datetime, timezone
import secrets
import bcrypt

from pymongo import MongoClient


# -----------------------------
# MongoDB (same database as chat)
# -----------------------------

client = MongoClient("mongodb://localhost:27017/")

db = client["emotionverse"]

users_collection = db["users"]
tokens_collection = db["auth_tokens"]


# -----------------------------
# Password helpers
# -----------------------------

def hash_password(password: str) -> str:
    """Hash a plain password with bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Check a plain password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed.encode("utf-8")
        )
    except Exception:
        return False


# -----------------------------
# Register
# -----------------------------

def register_user(username: str, password: str):
    """
    Create a new user.

    Returns (success: bool, message: str)
    """

    username = username.strip()

    if not username or not password:
        return False, "Username and password are required."

    if len(username) < 3:
        return False, "Username must be at least 3 characters."

    if len(password) < 4:
        return False, "Password must be at least 4 characters."

    # Usernames are case-insensitive (stored lowercase)
    clean = username.lower()

    existing = users_collection.find_one({"username": clean})

    if existing:
        return False, "Username already exists. Please choose another."

    users_collection.insert_one({
        "username": clean,
        "password": hash_password(password),
        "createdAt": datetime.now(timezone.utc),
    })

    return True, "Account created successfully."


# -----------------------------
# Login
# -----------------------------

def login_user(username: str, password: str):
    """
    Verify credentials and issue a token.

    Returns (success: bool, token_or_message: str)
    """

    username = username.strip()

    if not username or not password:
        return False, "Username and password are required."

    clean = username.lower()

    user = users_collection.find_one({"username": clean})

    if not user:
        return False, "Invalid username or password."

    if not verify_password(password, user.get("password", "")):
        return False, "Invalid username or password."

    # Simple random token (stored in Mongo)
    token = secrets.token_hex(24)

    tokens_collection.insert_one({
        "token": token,
        "username": clean,
        "createdAt": datetime.now(timezone.utc),
    })

    return True, token


# -----------------------------
# Token -> username lookup
# -----------------------------

def get_username_from_token(token: str):
    """
    Return the username linked to a token, or None if invalid.
    """

    if not token:
        return None

    record = tokens_collection.find_one({"token": token})

    if not record:
        return None

    return record.get("username")


# -----------------------------
# Logout
# -----------------------------

def logout_user(token: str):
    """Remove a token (user logs out)."""
    if token:
        tokens_collection.delete_one({"token": token})
# -----------------------------
# Memory PIN (privacy lock)
# -----------------------------

def set_memory_pin(username: str, pin: str):
    """
    Create or replace the user's memory PIN.

    Returns (success: bool, message: str)
    """

    pin = (pin or "").strip()

    if not pin:
        return False, "PIN cannot be empty."

    if len(pin) < 4:
        return False, "PIN must be at least 4 digits."

    if not pin.isdigit():
        return False, "PIN must contain only digits."

    users_collection.update_one(
        {"username": username.lower()},
        {"$set": {"memoryPin": hash_password(pin)}}
    )

    return True, "PIN saved."


def has_memory_pin(username: str) -> bool:
    """True if the user already has a PIN set."""

    user = users_collection.find_one(
        {"username": username.lower()},
        {"memoryPin": 1}
    )

    return bool(user and user.get("memoryPin"))


def verify_memory_pin(username: str, pin: str) -> bool:
    """Check a PIN against the stored hash."""

    user = users_collection.find_one(
        {"username": username.lower()},
        {"memoryPin": 1}
    )

    if not user or not user.get("memoryPin"):
        return False

    return verify_password(pin, user["memoryPin"])
