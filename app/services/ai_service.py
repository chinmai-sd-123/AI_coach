import os
from openai import OpenAI
from dotenv import load_dotenv
from app.core.config import settings
load_dotenv()

# remove OpenAI key conflict
os.environ.pop("OPENAI_API_KEY", None)

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    api_key=settings.GEMINI_API_KEY
)

model = "gemini-3.1-flash-lite-preview"   # stable model


def generate_response(user_message, goals, habits, logs=None):
    
    goals_text = "\n".join([g.title for g in goals]) if goals else "No goals set."
    habits_text = "\n".join([h.name for h in habits]) if habits else "No habits set."

    logs_text = ""
    if logs:
        logs_text = "\n".join([
            f"Habit {log.habit_id} on {log.date}: {'Done' if log.status else 'Missed'}"
            for log in logs[-5:]
        ])
    else:
        logs_text = "No recent activity."

    prompt = f"""
You are a smart AI life coach.

User Goals:
{goals_text}

User Habits:
{habits_text}

Recent Activity:
{logs_text}

User Message:
{user_message}

Give short, practical, personalized advice.
"""

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a smart life coach."},
                {"role": "user", "content": prompt}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"AI error: {str(e)}"
