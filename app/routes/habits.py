from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from app.utils.dependencies import get_current_user
from app.services.habit_service import calculate_streak
router = APIRouter(prefix="/habits", tags=["Habits"])


# DB connection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# CREATE HABIT
@router.post("/", response_model=schemas.HabitResponse)
def create_habit(
    habit: schemas.HabitCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    new_habit = models.Habit(
        name=habit.name,
        user_id=user_id
    )

    db.add(new_habit)
    db.commit()
    db.refresh(new_habit)

    return new_habit


# GET ALL HABITS
@router.get("/", response_model=list[schemas.HabitResponse])
def get_habits(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    habits = db.query(models.Habit).filter(models.Habit.user_id == user_id).all()
    return habits


# LOG HABIT (mark done/missed)
@router.post("/log")
def log_habit(
    log: schemas.HabitLogCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    habit = db.query(models.Habit).filter(
        models.Habit.id == log.habit_id,
        models.Habit.user_id == user_id
    ).first()

    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    new_log = models.HabitLog(
        habit_id=log.habit_id,
        date=log.date,
        status=log.status
    )

    db.add(new_log)
    db.commit()

    return {"message": "Habit logged successfully"}


# GET HABIT STREAK
@router.get("/{habit_id}/streak")
def get_habit_streak(
    habit_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    habit = db.query(models.Habit).filter(
        models.Habit.id == habit_id,
        models.Habit.user_id == user_id
    ).first()

    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    logs = db.query(models.HabitLog).filter(models.HabitLog.habit_id == habit_id).all()
    streak = calculate_streak(logs)

    return {"habit_id": habit_id, "streak": streak}