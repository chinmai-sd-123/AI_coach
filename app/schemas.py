# app/schemas.py

from datetime import date
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from enum import Enum

# ─────────────────────────────────────────────
# Shared base — UserCreate and UserLogin were identical
# ✅ Single base class eliminates duplication
# ─────────────────────────────────────────────

class UserBase(BaseModel):
    # ✅ EmailStr validates format (requires: pip install pydantic[email])
    # ✅ Field(max_length=...) prevents absurdly long inputs at schema level
    email: EmailStr = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)  # ✅ Enforce reasonable password length
    # ✅ min_length enforces a minimum password length without custom logic
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain a number")
        return v


class UserCreate(UserBase):
    pass  # Inherits email + password with all validation


class UserLogin(UserBase):
    pass  # Same fields, distinct semantic meaning — kept separate for clarity
class APIResponse(BaseModel):
    success: bool
    message: str | None = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr

    # ✅ Pydantic v2 style — replaces deprecated `class Config`
    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────
# Goals
# ─────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    deadline: date

    @field_validator("deadline", mode="before")
    @classmethod
    def deadline_must_be_future(cls, v):
        # ✅ Converts string → date if needed (mode="before" runs pre-coercion)
        if isinstance(v, str):
            v = date.fromisoformat(v)
        if v <= date.today():
            raise ValueError("Deadline must be a future date.")
        return v


class GoalResponse(BaseModel):
    id: int
    title: str
    deadline: date

    model_config = ConfigDict(from_attributes=True)  # ✅ v2 style


# ─────────────────────────────────────────────
# Habits
# ─────────────────────────────────────────────

class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class HabitResponse(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)  # ✅ v2 style


# ─────────────────────────────────────────────
# Habit Logs
# ─────────────────────────────────────────────

class HabitLogCreate(BaseModel):
    habit_id: int = Field(..., gt=0)  # ✅ habit_id must be a positive integer
    date: date
    status: bool

    @field_validator("date", mode="before")
    @classmethod
    def date_cannot_be_future(cls, v):
        # ✅ Prevents logging habits for dates that haven't happened yet
        if isinstance(v, str):
            v = date.fromisoformat(v)
        if v > date.today():
            raise ValueError("Cannot log a habit for a future date.")
        return v


class HabitLogResponse(BaseModel):
    # ✅ Was missing entirely — every resource needs a response schema
    id: int
    habit_id: int
    date: date
    status: bool

    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────
# Chat
# ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    # ✅ Field handles min/max length declaratively — no manual validator needed for that
    message: str = Field(..., min_length=1, max_length=300)

    @field_validator("message", mode="before")
    @classmethod  # ✅ Required in Pydantic v2 — validators must be classmethods
    def strip_and_validate_message(cls, v):
        if isinstance(v, str):
            v = v.strip()  # ✅ Strip BEFORE length check and BEFORE returning
        return v


class ChatResponse(APIResponse):
    # ✅ Bonus: gives your chat endpoint a typed response schema too
    reply: str


class MessageType(str, Enum):
    QUESTION = "question"
    CHECK_IN = "check-in"
    VENT = "vent"
    OFF_TOPIC = "off-topic"