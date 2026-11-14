const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"
).replace(/\/+$/, "");

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function getUser() {
  if (typeof window === "undefined") return null;

  const user = window.localStorage.getItem("user");
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("user");
  window.location.assign(new URL("/", window.location.origin).href);
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      message: "Invalid response from server",
    };
  }
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return readJson(response);
}

export async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await readJson(response);

  if (response.status === 401 && typeof window !== "undefined") {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
  }

  return { response, result };
}

export { API_URL };
