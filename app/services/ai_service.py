import os
import time
import logging
import hashlib
from collections import OrderedDict
from dotenv import load_dotenv
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)
load_dotenv()

MODEL           = "gemini-2.5-flash-lite"
MAX_RETRIES     = 2
BASE_BACKOFF    = 1.0
REQUEST_TIMEOUT = 4
WALL_CLOCK_LIMIT = 7
MAX_TOKENS      = 300

_CACHE_MAX_SIZE = 128




class _LRUCache:
    """Simple LRU cache with a fixed max size."""
    def __init__(self, max_size: int):
        self._store   = OrderedDict()
        self._max     = max_size

    def get(self, key: str):
        if key not in self._store:
            return None
        self._store.move_to_end(key)   # mark as recently used
        return self._store[key]

    def set(self, key: str, value: str):
        if key in self._store:
            self._store.move_to_end(key)
        self._store[key] = value
        if len(self._store) > self._max:
            self._store.popitem(last=False)  # evict least recently used

CACHE = _LRUCache(_CACHE_MAX_SIZE)


def _make_cache_key(user_message: str, goals, habits, logs) -> str:
    goals_part  = "|".join(g.title for g in goals)  if goals  else ""
    habits_part = "|".join(h.name  for h in habits) if habits else ""

    # ✅ Include date + habit_id + status — all three needed for correctness
    logs_part = "|".join(
        f"{log.date.strftime('%Y-%m-%d')}:{log.habit_id}:{log.status}"
        for log in logs[-3:]
    ) if logs else ""

    raw = f"{user_message.lower().strip()}::{goals_part}::{habits_part}::{logs_part}"
    return hashlib.md5(raw.encode()).hexdigest()


_INJECTION_PATTERNS = [
    "ignore previous", "ignore all", "system prompt",
    "act as", "jailbreak", "disregard", "new instructions", "you are now",
    
]
_INTENT_KEYWORDS = {
    "emotional": ["sad", "tired", "exhausted", "frustrated", "demotivated",
                  "lazy", "overwhelmed", "burnt out", "stressed", "anxious"],
    "habit":     ["habit", "streak", "routine", "tracking", "consistency", "log"],
    "goal":      ["goal", "plan", "target", "deadline", "achieve", "milestone"],
}


SYSTEM_PROMPT = """You are an empathetic, no-nonsense life coach..."""


class InputRejectedError(ValueError):
    """Raised when user input is rejected due to potential prompt injection."""
    pass


def sanitize_input(text: str) -> str:
    normalized = " ".join(text.lower().split())
    for pattern in _INJECTION_PATTERNS:
        if pattern in normalized:
            raise InputRejectedError(f"Blocked pattern: '{pattern}'")
    return text.strip()

def detect_intent(user_message: str) -> str:
    msg = user_message.lower()
    # Priority order: emotional → habit → goal → general
    for intent, keywords in _INTENT_KEYWORDS.items():
        words= set(msg.split())
        if any(word in words for word in keywords):
            return intent
    return "general"




def quick_reply(user_message: str):
    greetings = {"hi", "hello", "hey", "howdy", "hi there"}
    msg = user_message.lower().strip()
    if msg in greetings:
        return "Hi there! How can I help you today?"
    return None


def _get_client() -> OpenAI:
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is not configured.")
    return OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=settings.GEMINI_API_KEY,
    )

def _build_context_texts(goals, habits, logs, intent: str) -> tuple[str, str, str]:
    """
    Returns only the context slices relevant to the intent.
    Returns None for each section that should be omitted from the prompt entirely.
    ✅ Fix 2: None signals _build_prompt to skip the section, not render it blank.
    ✅ Fix 3: intents share context where it genuinely helps.
    """
    goals_text  = None
    habits_text = None
    logs_text   = None

    total_goals  = len(goals)  if goals  else 0
    total_habits = len(habits) if habits else 0

    if intent == "goal":
        # Goals are primary; habits give supporting context
        if goals:
            shown = goals[:3]
            suffix = f"\n- (and {total_goals - 3} more...)" if total_goals > 3 else ""
            goals_text = "\n".join(f"- {g.title}" for g in shown) + suffix  # ✅ Fix 4
        if habits:
            habits_text = "\n".join(f"- {h.name}" for h in habits[:2])

    elif intent == "habit":
        # Habits + recent logs are primary; include goal for alignment context
        if habits:
            shown = habits[:3]
            suffix = f"\n- (and {total_habits - 3} more...)" if total_habits > 3 else ""
            habits_text = "\n".join(f"- {h.name}" for h in shown) + suffix
        if logs:
            habit_map = {h.id: h.name for h in habits} if habits else {}
            logs_text = "\n".join(
                f"- {log.date.strftime('%Y-%m-%d')} | "
                f"{habit_map.get(log.habit_id, f'Habit #{log.habit_id}')}: "
                f"{'Done ✓' if log.status else 'Missed ✗'}"
                for log in logs[-3:]
            )
        if goals:
            goals_text = "\n".join(f"- {g.title}" for g in goals[:2])

    elif intent == "emotional":
        # Empathy first — but AI needs some habit data to personalize it
        if logs:
            habit_map = {h.id: h.name for h in habits} if habits else {}
            logs_text = "\n".join(
                f"- {log.date.strftime('%Y-%m-%d')} | "
                f"{habit_map.get(log.habit_id, f'Habit #{log.habit_id}')}: "
                f"{'Done ✓' if log.status else 'Missed ✗'}"
                for log in logs[-3:]
            )
        if habits:
            habits_text = "\n".join(f"- {h.name}" for h in habits[:2])

    else:  # general — send a light slice of everything
        if goals:
            goals_text  = "\n".join(f"- {g.title}" for g in goals[:2])
        if habits:
            habits_text = "\n".join(f"- {h.name}" for h in habits[:2])
        if logs:
            logs_text = "\n".join(
                f"- {log.date.strftime('%Y-%m-%d')}: "
                f"{'Done ✓' if log.status else 'Missed ✗'}"
                for log in logs[-2:]
            )

    return goals_text, habits_text, logs_text



def _build_prompt(user_message: str, goals_text, habits_text, logs_text, intent: str) -> str:
    """
    ✅ Fix 2: Only renders sections that have content.
    Skips blank sections entirely so the model sees a clean, focused prompt.
    """
    sections = []

    if goals_text:
        sections.append(f"**Goals:**\n{goals_text}")
    if habits_text:
        sections.append(f"**Active Habits:**\n{habits_text}")
    if logs_text:
        sections.append(f"**Recent Activity:**\n{logs_text}")

    context_block = "\n\n".join(sections) if sections else "_No context available._"

    # Intent-aware task instruction
    task_note = {
        "emotional": "The user may be venting or feeling low — lead with empathy before advice.",
        "habit":     "Focus on habit consistency and streaks. Reference the logs directly.",
        "goal":      "Focus on goal progress and next concrete steps.",
        "general":   "Give balanced, practical coaching based on available context.",
    }.get(intent, "")

    return f"""## User Context
{context_block}

---

## User Message
{user_message}

---

## Your Task
{task_note}
1. Identify if the message is: a question, a check-in, a vent, or off-topic
2. If unclear, ask ONE clarifying question instead of assuming
3. If clear, give short and specific advice tied to their actual context above
4. End with one actionable next step or a motivating one-liner when appropriate"""



def generate_response(user_message: str, goals, habits, logs=None) -> str:
    try:
        user_message = sanitize_input(user_message)
    except InputRejectedError:
        return "Sorry, I can't process that message."

    fast_reply = quick_reply(user_message)
    if fast_reply:
        return fast_reply
    
    intent = detect_intent(user_message)

    key = _make_cache_key(user_message, goals, habits, logs)
    cached = CACHE.get(key)
    if cached:
        logger.info("Cache hit  | intent=%-8s | key=%.12s...", intent, key)
        return cached
    logger.info("Cache miss | intent=%-8s | key=%.12s...", intent, key)
    
    try:
        client = _get_client()
    except ValueError as e:
        logger.error("AI client init failed: %s", e)
        return "The AI coach is not configured — Gemini API key is missing."

    goals_text, habits_text, logs_text = _build_context_texts(goals, habits, logs, intent)
    prompt     = _build_prompt(user_message, goals_text, habits_text, logs_text, intent)
    start_time = time.perf_counter()

    for attempt in range(MAX_RETRIES):
        elapsed = time.perf_counter() - start_time
        if elapsed > WALL_CLOCK_LIMIT:
            logger.warning("Wall clock limit hit after %.2fs", elapsed)
            return "Sorry, I'm taking longer than expected. Please try again."

        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                temperature=0.7,
                max_tokens=MAX_TOKENS,
                timeout=REQUEST_TIMEOUT,
            )
            result = response.choices[0].message.content.strip()

            if not result:
                return "Hmm, I couldn't come up with a response. Could you try rephrasing?"

            CACHE.set(key, result)  # ✅ only cache non-empty, valid responses
            logger.info(
                "AI response in %.2fs (attempt %d) | msg=%.30s...",
                time.perf_counter() - start_time, attempt + 1, user_message,
            )
            return result

        except Exception as e:
            wait = BASE_BACKOFF * (2 ** attempt)
            logger.warning("Attempt %d/%d failed: %s | retry in %.1fs",
                           attempt + 1, MAX_RETRIES, e, wait)
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)

    logger.error("All %d attempts exhausted | msg=%.80s", MAX_RETRIES, user_message)
    return "I'm having a moment — try again in a few seconds."