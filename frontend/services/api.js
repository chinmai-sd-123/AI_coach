const BASE_URL= "http://10.49.96.188:8000"

export const signupUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  let data;

  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(text);
  }

  if (!res.ok) {
    throw new Error(data.detail || "Signup failed");
  }

  return data;
};


export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  let data;

  try {
    data = await res.json();  // try JSON
  } catch (err) {
    const text = await res.text();  // fallback
    throw new Error(text);
  }

  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }

  return data;
};

export const getGoals = async (token) => {
  const res = await fetch(`${BASE_URL}/goals/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let data;

  try {
    data = await res.json();
  } catch (err) {
    const text = await res.text();
    throw new Error(text);
  }

  if (!res.ok) {
    throw new Error(data.detail || "Failed to fetch goals");
  }

  return data;
};

export const createGoal = async (title, token) => {
  const res = await fetch(`${BASE_URL}/goals/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: title,  
      deadline: "2024-12-31",
      // âœ… VERY IMPORTANT
    }),
  });

  let data;

  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    throw new Error(text);
  }

  if (!res.ok) {
    console.log("FULL ERROR RESPONSE:", data);
    throw new Error(JSON.stringify(data));
  }

  return data;
};

export const getHabits = async (token) => {
  const res = await fetch(`${BASE_URL}/habits/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

export const createHabit = async (name, token) => {
  const res = await fetch(`${BASE_URL}/habits/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  return res.json();
};

export const logHabit = async (habit_id, status, token) => {
  const today = new Date().toISOString().split("T")[0];

  const res = await fetch(`${BASE_URL}/habits/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      habit_id,
      date: today,
      status,
    }),
  });

  return res.json();
};
