from email.mime import text
import os
import time
import logging
from dotenv import load_dotenv
from openai import OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)
load_dotenv()
MODEL = "gemini-2.5-flash-lite"  # ✅ Valid model name
MAX_RETRIES = 2
BASE_BACKOFF = 1.0       # Exponential: 1s → 2s → 4s
REQUEST_TIMEOUT = 4      # Per-attempt API timeout (seconds)
WALL_CLOCK_LIMIT = 7     # Total budget across all attempts (seconds)
MAX_TOKENS = 300         # Enforces conciseness at the model level


_INJECTION_PATTERNS = [
    "ignore previous",
    "ignore all",
    "system prompt",
    "act as",
    "jailbreak",
    "disregard",
    "new instructions",
    "you are now",
]



SYSTEM_PROMPT = """You are an empathetic, no-nonsense life coach with expertise in habit psychology and goal achievement. Your personality is warm but direct: you celebrate wins, flag patterns, and push back gently when needed.

Core behavior rules:
- Always personalize advice using the user's actual goals, habits, and recent logs
- Be concise: 2-4 sentences max unless the user asks for more detail
- If the user is off-topic or vague, ask one focused clarifying question
- Never fabricate data or advice you're unsure about - admit uncertainty openly
- Detect emotional tone: if the user seems frustrated or demotivated, lead with empathy before advice
- If recent logs show missed habits, acknowledge it without judgment, then redirect forward"""

class InputRejectedError(ValueError):
    """raised when user input is rejected due to potential prompt injection or policy violation"""
    pass


def sanitize_input(text: str) -> str:
    normalized= " ".join(text.lower().split())
    for pattern in _INJECTION_PATTERNS:
        if pattern in normalized:
            raise InputRejectedError(
                f"Input rejected due to potential prompt injection: '{pattern}' detected."
            )
    return text.strip()

    

def _get_client() -> OpenAI:
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured.")
    return OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.GEMINI_API_KEY,
    )


def _build_context_texts(goals, habits, logs) -> tuple[str, str, str]:
    goals_text = "\n".join([f"- {g.title}" for g in goals]) if goals else "- No goals set."
    habits_text = "\n".join([f"- {h.name}" for h in habits]) if habits else "- No habits set."
    habit_map= {h.id: h.name for h in habits} if habits else {}

    logs_text = (
        "\n".join(
            f"- {log.date.strftime('%Y-%m-%d')} | "  # ✅ Explicit date format
            f"{habit_map.get(log.habit_id, f'Habit #{log.habit_id}')}: "
            f"{'Done ✓' if log.status else 'Missed ✗'}"
            for log in logs[-5:]
        )
        if logs
        else "- No recent activity logged."
    )
    return goals_text, habits_text, logs_text



def _build_prompt(user_message: str, goals_text: str, habits_text: str, logs_text: str) -> str:
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


def generate_response(user_message, goals, habits, logs=None) -> str:
    try:
        user_message = sanitize_input(user_message)
    except InputRejectedError:
        return "Sorry, I can't process that message. Please avoid using phrases that could be interpreted as trying to manipulate the system."
    
    try:
        client = _get_client()
    except ValueError as e:
        logger.error(f"AI client initialization failed: {str(e)}")
        return "The AI coach is not configured yet because the Gemini API key is missing."
    
    goals_text, habits_text, logs_text = _build_context_texts(goals, habits, logs) 
    prompt = _build_prompt(user_message, goals_text, habits_text, logs_text)

    start_time = time.perf_counter()

    for attempt in range(MAX_RETRIES):
        elapsed = time.perf_counter() - start_time
        if elapsed > WALL_CLOCK_LIMIT:
            logger.warning(f"AI response generation exceeded wall clock limit: {elapsed:.2f}s")
            return "Sorry, I'm taking longer than expected to respond. Please try again in a moment."
        
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=MAX_TOKENS,
                timeout=REQUEST_TIMEOUT
            )
            result = response.choices[0].message.content.strip()
            if not result or not result.strip():
                return "Hmm, I couldn't come up with a response. Could you try rephrasing your message?"
            
            logger.info(
                "AI response in %.2fs (attempt %d) | msg=%.30s...",
                time.perf_counter() - start_time, attempt + 1, user_message
            )
            return result.strip()
        
        except Exception as e:
            wait= BASE_BACKOFF * (2 ** attempt)  # Exponential backoff
            logger.warning(
    "AI attempt %d failed: %s | retry in %.1fs",
    attempt + 1, str(e), wait
)
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
    logger.error("All %d attempts exhausted | msg=%.80s", MAX_RETRIES, user_message)
    return "I'm having a moment — try again in a few seconds."