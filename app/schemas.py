from pydantic import BaseModel
from datetime import date
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str
    deadline: date

class GoalResponse(BaseModel):
    id: int
    title: str
    deadline: date

    class Config:
        from_attributes = True

class HabitCreate(BaseModel):
    name: str

class HabitResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class HabitLogCreate(BaseModel):
    habit_id: int
    date: date
    status: bool