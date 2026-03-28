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
  getGithubRaw: () => request("/profile/github-raw"),
  getAnalysis: () => request("/profile/analysis"),
  rescanProfile: () => request("/profile/rescan", { method: "POST" }),
  saveDebugData: (github_data, analysis) =>
    request("/profile/save-debug", { method: "POST", body: JSON.stringify({ github_data, analysis }) }),
  getCareerSuggestions: () => request("/profile/career-suggestions"),
  searchJobs: (keywords = [], remote = true) =>
    request("/jobs/search", { method: "POST", body: JSON.stringify({ keywords, remote }) }),
  listJobs: () => request("/jobs"),
  selectJob: (job_offer_id) =>
    request("/jobs/select", { method: "POST", body: JSON.stringify({ job_offer_id }) }),
  saveInterview: (data) =>
    request("/interviews", { method: "POST", body: JSON.stringify(data) }),
  listInterviews: () => request("/interviews"),
  getInterview: (id) => request(`/interviews/${id}`),
  updateInterviewReview: (id, review, score) =>
    request(`/interviews/${id}/review`, { method: "PATCH", body: JSON.stringify({ review, score }) }),
  debugScrape: (username) => request(`/debug/scrape/${encodeURIComponent(username)}`),
  debugAnalyze: (githubData) =>
    request("/debug/analyze", { method: "POST", body: JSON.stringify(githubData) }),
  debugVapiConfig: () => request("/debug/vapi/config"),
  debugVapiCreateAssistant: (params) =>
    request("/debug/vapi/assistant", { method: "POST", body: JSON.stringify(params) }),
  debugVapiDeleteAssistant: (id) =>
    request(`/debug/vapi/assistant/${id}`, { method: "DELETE" }),
  debugVapiChat: (assistant_id, messages) =>
    request("/debug/vapi/chat", { method: "POST", body: JSON.stringify({ assistant_id, messages }) }),
  debugVapiReview: (params) =>
    request("/debug/vapi/review", { method: "POST", body: JSON.stringify(params) }),
  debugGenerateCV: (params) =>
    request("/debug/cv/generate", { method: "POST", body: JSON.stringify(params) }),
  debugCVStatus: (jobId) => request(`/debug/cv/status/${jobId}`),
  debugPreviewCVPrompt: (params) =>
    request("/debug/cv/preview-prompt", { method: "POST", body: JSON.stringify(params) }),
  debugCareerAdvise: (params) =>
    request("/debug/career/advise", { method: "POST", body: JSON.stringify(params) }),
  debugMockJobs: () => request("/debug/jobs/mock"),
  debugAutoConfigInterview: (params) =>
    request("/debug/vapi/auto-configure", { method: "POST", body: JSON.stringify(params) }),
  debugCacheStats: () => request("/debug/cache/stats"),
  debugCacheClear: () => request("/debug/cache", { method: "DELETE" }),
  debugCVToPdf: async (html) => {
    const res = await fetch(`${API_BASE}/debug/cv/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "PDF conversion failed");
    }
    return res.blob();
  },
};
