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
  generateCareerSuggestions: () => request("/profile/career-suggestions/generate", { method: "POST" }),
  searchJobs: (keywords = [], remote = true) =>
    request("/jobs/search", { method: "POST", body: JSON.stringify({ keywords, remote }) }),
  listJobs: () => request("/jobs"),
  getSelectedJob: () => request("/jobs/selected"),
  selectJob: (job_offer_id) =>
    request("/jobs/select", { method: "POST", body: JSON.stringify({ job_offer_id }) }),
  fetchJobs: (params = {}) =>
    request("/jobs/fetch", { method: "POST", body: JSON.stringify(params) }),
  fetchJobsStatus: () => request("/jobs/fetch/status"),
  getJobDetail: (slug) => request(`/jobs/detail/${encodeURIComponent(slug)}`),
  getScoredJobs: (params = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", params.limit);
    return request(`/jobs/scored?${q.toString()}`);
  },
  vapiConfig: () => request("/interviews/vapi-config"),
  startInterview: (settings) =>
    request("/interviews/start", { method: "POST", body: JSON.stringify(settings) }),
  interviewChat: (id, messages) =>
    request(`/interviews/${id}/chat`, { method: "POST", body: JSON.stringify({ messages }) }),
  interviewComplete: (id, transcript) =>
    request(`/interviews/${id}/complete`, { method: "POST", body: JSON.stringify({ transcript }) }),
  interviewReview: (id, transcript) =>
    request(`/interviews/${id}/review`, { method: "POST", body: JSON.stringify({ transcript }) }),
  generateCV: (params = {}) =>
    request("/cv/generate", { method: "POST", body: JSON.stringify(params) }),
  cvStatus: (jobId) => request(`/cv/status/${jobId}`),
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
  debugJobsFetch: (params) =>
    request("/debug/jobs/fetch", { method: "POST", body: JSON.stringify(params) }),
  debugJobsFetchStatus: () => request("/debug/jobs/fetch/status"),
  debugJobsOffers: (params = {}) => {
    const q = new URLSearchParams();
    if (params.experience_level) q.set("experience_level", params.experience_level);
    if (params.skills) params.skills.forEach((s) => q.append("skill", s));
    if (params.workplace_type) q.set("workplace_type", params.workplace_type);
    if (params.limit) q.set("limit", params.limit);
    if (params.offset) q.set("offset", params.offset);
    return request(`/debug/jobs/offers?${q.toString()}`);
  },
  debugJobsScore: (params) =>
    request("/debug/jobs/score", { method: "POST", body: JSON.stringify(params) }),
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
