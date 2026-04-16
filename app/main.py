from fastapi import FastAPI
from app.database import engine, Base
from .import models
from .routes import goals,auth,habits,chat
app = FastAPI()

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(habits.router)
app.include_router(chat.router)

#create database tables

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "AI LIFE COACH API is running!"}