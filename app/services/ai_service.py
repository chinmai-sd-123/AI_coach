import os
import time
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

SYSTEM_PROMPT = """You are an empathetic, no-nonsense life coach with expertise in habit psychology and goal achievement. Your personality is warm but direct — you celebrate wins, flag patterns, and push back gently when needed.

Core behavior rules:
- Always personalize advice using the user's actual goals, habits, and recent logs
- Be concise: 2–4 sentences max unless the user asks for more detail
- If the user is off-topic or vague, ask one focused clarifying question
- Never fabricate data or advice you're unsure about — admit uncertainty openly
- Detect emotional tone: if the user seems frustrated or demotivated, lead with empathy before advice
- If recent logs show missed habits, acknowledge it without judgment, then redirect forward"""


def build_prompt(user_message, goals_text, habits_text, logs_text):
    return f"""## User Context

**Goals:**
{goals_text}

**Active Habits:**
{habits_text}

**Last 5 Activity Logs:**
{logs_text}

---

## User Message
{user_message}

---

## Your Task
1. Identify if the message is: a question, a check-in, a vent, or off-topic
2. If unclear, ask ONE clarifying question instead of assuming
3. If clear, give short and specific advice tied to their actual goals/habits above
4. End with one actionable next step or a motivating one-liner when appropriate"""

def generate_response(user_message, goals, habits, logs=None):
    start_time = time.time()

    goals_text = "\n".join([f"- {g.title}" for g in goals]) if goals else "- No goals set."
    habits_text = "\n".join([f"- {h.name}" for h in habits]) if habits else "- No habits set."
    logs_text = (
        "\n".join([
            f"- {log.date} | Habit #{log.habit_id}: {'✅ Done' if log.status else '❌ Missed'}"
            for log in logs[-5:]
        ])
        if logs else "- No recent activity logged."
    )

    prompt = build_prompt(user_message, goals_text, habits_text, logs_text)

    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,       # adds natural variation without hallucination risk
                max_tokens=300,        # keeps responses concise
            )
            return response.choices[0].message.content

        except Exception as e:
            print(f"AI error (attempt {attempt + 1}): {str(e)}")
            if attempt < 2:
                time.sleep(2)
            else:
                return "I'm having a moment — try again in a few seconds!"