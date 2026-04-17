from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.utils.dependencies import get_current_user
from app import models
from app.services.ai_service import generate_response
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["AI Coach"])

class ChatRequest(BaseModel):
    message: str    

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/")
def chat(request: ChatRequest, 
         db: Session = Depends(get_db), 
         user_id: int = Depends(get_current_user)):
    
    # Fetch user's goals and habits
    goals = db.query(models.Goal).filter(models.Goal.user_id == user_id).all()
    habits = db.query(models.Habit).filter(models.Habit.user_id == user_id).all()
    logs = db.query(models.HabitLog).filter(
    models.HabitLog.habit_id.in_([h.id for h in habits])
).all()
    # Generate AI response
    ai_response = generate_response(request.message, goals, habits, logs)
    
    return {"response": ai_response}
