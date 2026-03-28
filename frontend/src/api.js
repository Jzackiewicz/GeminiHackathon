const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  register: (email, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  githubClientId: () => request("/auth/github/client-id"),
  githubCallback: (code) =>
    request("/auth/github/callback", { method: "POST", body: JSON.stringify({ code }) }),
  me: () => request("/auth/me"),
  getProfile: () => request("/profile"),
  connectGithub: (username) =>
    request("/profile/github", { method: "POST", body: JSON.stringify({ username }) }),
  searchJobs: (keywords = [], remote = true) =>
    request("/jobs/search", { method: "POST", body: JSON.stringify({ keywords, remote }) }),
  listJobs: () => request("/jobs"),
  selectJob: (job_offer_id) =>
    request("/jobs/select", { method: "POST", body: JSON.stringify({ job_offer_id }) }),
  startInterview: () => request("/interview/start", { method: "POST" }),
  listInterviews: () => request("/interviews"),
  debugScrape: (username) => request(`/debug/scrape/${encodeURIComponent(username)}`),
};
