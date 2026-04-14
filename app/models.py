from sqlalchemy import Column, Integer, String, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

#user table

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)

    goals = relationship("Goal", back_populates="user")
    habits = relationship("Habit", back_populates="user")

#goal table

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    deadline = Column(Date)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="goals")

#habit table

class Habit(Base):
    __tablename__ = "habits"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit")

class HabitLog(Base):
    __tablename__ = "habit_logs"
    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"))
    date = Column(Date)
    status = Column(Boolean) 

    habit = relationship("Habit", back_populates="logs")