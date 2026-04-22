// services/api.js

// ✅ Environment variable instead of hardcoded LAN IP
// In Vite: import.meta.env.VITE_API_URL, in CRA: process.env.REACT_APP_API_URL
const BASE_URL = "http://10.36.94.188:8000";

// ✅ Centralized timeout — one place to adjust for all requests
const DEFAULT_TIMEOUT_MS = 8000;

// ─────────────────────────────────────────────
// Custom error class — preserves HTTP status code
// so callers can branch on 401 vs 404 vs 500
// ─────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status) {
    super(message);          // passes message to built-in Error
    this.name = "ApiError";  // makes console output readable
    this.status = status;    // ✅ caller can check err.status === 401
  }
}

// ─────────────────────────────────────────────
// Core request function
// ─────────────────────────────────────────────

async function request(path, { method = "GET", token, body } = {}) {
  // ✅ AbortController lets us cancel the fetch after a timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),   // abort() triggers an AbortError on the fetch
    DEFAULT_TIMEOUT_MS
  );
console.log("TOKEN SENT:", token);
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal, // ✅ links fetch to the abort controller
      headers: {
        ...(body  ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` }  : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    // ✅ Distinguish timeout from generic network failure
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out. Please try again.", 408);
    }
    throw new ApiError("Network error. Check your connection.", 0);
  } finally {
    // ✅ Always clear the timer — prevents memory leaks if request finishes fast
    clearTimeout(timeoutId);
  }

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText; // keep as plain text if not JSON
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.detail ?? `Request failed (${response.status})`;

    //  HANDLE AUTH FAILURE
  if (response.status === 401) {
    // optional: clear storage
    // logoutUser()
    console.warn("Token expired");
  }      

    // ✅ Throws ApiError with status code preserved
    throw new ApiError(message, response.status);
  }

  return data;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

// ✅ Accepts days as a parameter — no more magic number buried in the function
function getFutureDate(daysFromNow = 30) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

// ✅ Today's date in YYYY-MM-DD — used as default for habit logs
function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const signupUser = async (email, password) => {
  // ✅ Client-side guard: don't waste a round-trip on obviously bad input
  if (!email || !password) throw new ApiError("Email and password are required.", 400);
  return request("/signup", { method: "POST", body: { email, password } });
};

export const loginUser = async (email, password) => {
  if (!email || !password) throw new ApiError("Email and password are required.", 400);
  return request("/login", { method: "POST", body: { email, password } });
};

// ─────────────────────────────────────────────
// Goals
// ─────────────────────────────────────────────

export const getGoals = async (token) =>
  request("/goals/", { token });

// ✅ daysUntilDeadline is now a named, overridable parameter with a sensible default
export const createGoal = async (title, token, daysUntilDeadline = 30) => {
  if (!title?.trim()) throw new ApiError("Goal title cannot be empty.", 400);
  return request("/goals/", {
    method: "POST",
    token,
    body: { title, deadline: getFutureDate(daysUntilDeadline) },
  });
};

// ─────────────────────────────────────────────
// Habits
// ─────────────────────────────────────────────

export const getHabits = async (token) =>
  request("/habits/", { token });

export const createHabit = async (name, token) => {
  if (!name?.trim()) throw new ApiError("Habit name cannot be empty.", 400);
  return request("/habits/", { method: "POST", token, body: { name } });
};

// ✅ Consistent parameter order: (data..., token) — matches every other function
// ✅ date defaults to today — no more silent undefined being sent to the API
export const logHabit = async (habit_id, status, token, date = getTodayDate()) =>
  request("/habits/log", {
    method: "POST",
    token,
    body: { habit_id, date, status },
  });

// ✅ Streak is returned as a number — error propagates naturally to the caller
// Caller decides whether 0 means "real zero" or "failed" — not silently swallowed here
export const getHabitStreak = async (habit_id, token) => {
  const data = await request(`/habits/${habit_id}/streak`, { token });
  return data?.streak ?? 0;
};

export const getHabitLog = async (habit_id, token) =>
  request(`/habits/${habit_id}/logs`, { token });

// ─────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────

export const sendMessage = async (message, token) => {
  if (!message?.trim()) throw new ApiError("Message cannot be empty.", 400);
  return request("/chat/", { method: "POST", token, body: { message } });
};