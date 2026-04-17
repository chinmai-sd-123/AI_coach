from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# âœ… CREATE GOAL
@router.post("/")
def create_goal(
    goal: schemas.GoalCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    new_goal = models.Goal(
        title=goal.title,
        deadline=goal.deadline,
        user_id=user_id   # âœ… VERY IMPORTANT
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    return new_goal


# âœ… GET USER GOALS
@router.get("/")
def get_goals(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    return db.query(models.Goal).filter(
        models.Goal.user_id == user_id   # âœ… FIX
    ).all()     
    return goals


# âœ… DELETE GOAL
@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user)
):
    goal = db.query(models.Goal).filter(
        models.Goal.id == goal_id,
        models.Goal.user_id == user_id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted"}
