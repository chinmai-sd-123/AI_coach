const BASE_URL = "http://10.28.203.188:8000";

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const rawText = await response.text();
  let data = null;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    if (typeof data === "string") {
      throw new Error(data);
    }

    throw new Error(data?.detail || "Request failed");
  }

  return data;
}

function defaultGoalDeadline() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

export const signupUser = async (email, password) =>
  request("/signup", {
    method: "POST",
    body: { email, password },
  });

export const loginUser = async (email, password) =>
  request("/login", {
    method: "POST",
    body: { email, password },
  });

export const getGoals = async (token) =>
  request("/goals/", {
    token,
  });

export const createGoal = async (title, token) =>
  request("/goals/", {
    method: "POST",
    token,
    body: {
      title,
      deadline: defaultGoalDeadline(),
    },
  });

export const getHabits = async (token) =>
  request("/habits/", {
    token,
  });

export const createHabit = async (name, token) =>
  request("/habits/", {
    method: "POST",
    token,
    body: { name },
  });

export const logHabit = async (habit_id, status, token) => {
  const today = new Date().toISOString().split("T")[0];

  return request("/habits/log", {
    method: "POST",
    token,
    body: {
      habit_id,
      date: today,
      status,
    },
  });
};

export const getHabitStreak = async (habit_id, token) => {
  const data = await request(`/habits/${habit_id}/streak`, {
    token,
  });

  return data?.streak ?? 0;
};

export const sendMessage = async (message, token) =>
  request("/chat/", {
    method: "POST",
    token,
    body: { message },
  });
