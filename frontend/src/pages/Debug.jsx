import { useState, useEffect, useRef } from "react";
import { api } from "../api";

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2 bg-gray-800 text-left text-sm font-medium flex justify-between items-center hover:bg-gray-750 transition"
      >
        {title}
        <span className="text-gray-400">{open ? "▼" : "▶"}</span>
      </button>
      {open && <div className="p-4 bg-gray-900 text-sm">{children}</div>}
    </div>
  );
}

export default function Debug() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [repoFilter, setRepoFilter] = useState("");
  const [showPrivate, setShowPrivate] = useState(true);
  const [showPublic, setShowPublic] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(true);
  const logsContainerRef = useRef(null);

  useEffect(() => {
    api.getProfile()
      .then((p) => { if (p.github_username) setUsername(p.github_username); })
      .catch(() => {});
  }, []);

  // SSE log stream
  useEffect(() => {
    const evtSource = new EventSource("/api/debug/logs");
    evtSource.onmessage = (e) => {
      setLogs((prev) => {
        const next = [...prev, e.data];
        return next.length > 500 ? next.slice(-500) : next;
      });
    };
    return () => evtSource.close();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsOpen && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, logsOpen]);

  async function runAnalysis() {
    if (!result?.github_data) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const data = await api.debugAnalyze(result.github_data);
      if (data.error) {
        setError(data.error);
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function runScrape(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setAnalysis(null);
    setError("");
    setResult(null);
    try {
      const data = await api.debugScrape(username.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const gh = result?.github_data;
  const payload = result?.gemini_payload;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 -m-8 p-8"><div className="max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Debug Dashboard</h1>
        <a href="/" className="text-sm text-gray-400 hover:text-white transition">← Back to app</a>
      </header>

      <div className="space-y-6">
        {/* Live logs */}
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          <button
            onClick={() => setLogsOpen(!logsOpen)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-800 transition"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-semibold">Live Logs</h2>
              <span className="text-gray-500 text-xs">({logs.length} lines)</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                className="text-xs text-gray-500 hover:text-gray-300 transition"
              >
                Clear
              </button>
              <span className="text-gray-400">{logsOpen ? "▼" : "▶"}</span>
            </div>
          </button>
          {logsOpen && (
            <div
              ref={logsContainerRef}
              className="px-4 pb-4 max-h-64 overflow-y-auto font-mono text-xs"
            >
              {logs.length === 0 && <p className="text-gray-600 py-2">Waiting for logs...</p>}
              {logs.map((line, i) => (
                <div
                  key={i}
                  className={`py-0.5 ${
                    line.includes("ERROR") ? "text-red-400" :
                    line.includes("WARNING") ? "text-yellow-400" :
                    line.includes("debug:") ? "text-blue-400" :
                    "text-gray-400"
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GitHub Scraper */}
        <div className="bg-gray-900 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">GitHub Profile Scraper</h2>
          <form onSubmit={runScrape} className="flex gap-2">
            <input
              type="text"
              placeholder="GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Scraping..." : "Scrape"}
            </button>
          </form>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {gh && (
            <div className="space-y-3">
              {/* Profile summary */}
              <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{gh.name || gh.username}</p>
                  <p className="text-gray-400 text-xs">{gh.bio || "No bio"}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {gh.original_repos_count} original repos · {gh.followers} followers · since {gh.account_created?.slice(0, 4)}
                    {gh.company && ` · ${gh.company}`}
                    {gh.location && ` · ${gh.location}`}
                  </p>
                </div>
              </div>

              {/* Languages */}
              <CollapsibleSection title={`Languages (${Object.keys(gh.languages || {}).length})`} defaultOpen>
                <div className="space-y-1">
                  {Object.entries(gh.languages || {}).map(([lang, info]) => (
                    <div key={lang} className="flex items-center gap-2">
                      <div className="w-28 text-gray-300 truncate">{lang}</div>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 rounded-full h-2"
                          style={{ width: `${Math.min(info.percent, 100)}%` }}
                        />
                      </div>
                      <div className="w-14 text-right text-gray-400 text-xs">{info.percent}%</div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Topics */}
              {Object.keys(gh.topics || {}).length > 0 && (
                <CollapsibleSection title={`Topics (${Object.keys(gh.topics).length})`}>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(gh.topics).map(([topic, count]) => (
                      <span key={topic} className="px-2 py-1 bg-gray-800 rounded text-xs">
                        {topic} <span className="text-gray-500">×{count}</span>
                      </span>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Repos */}
              <CollapsibleSection title={`Repos detail (${(gh.repos || []).length})`}>
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Filter repos..."
                      value={repoFilter}
                      onChange={(e) => setRepoFilter(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
                    />
                    <label className="flex items-center gap-1 text-xs text-gray-400">
                      <input type="checkbox" checked={showPublic} onChange={() => setShowPublic(!showPublic)} className="rounded" />
                      Public
                    </label>
                    <label className="flex items-center gap-1 text-xs text-gray-400">
                      <input type="checkbox" checked={showPrivate} onChange={() => setShowPrivate(!showPrivate)} className="rounded" />
                      Private
                    </label>
                  </div>
                  {(gh.repos || [])
                    .filter((r) => {
                      if (r.private && !showPrivate) return false;
                      if (!r.private && !showPublic) return false;
                      if (repoFilter) {
                        const q = repoFilter.toLowerCase();
                        return (
                          r.name.toLowerCase().includes(q) ||
                          (r.description || "").toLowerCase().includes(q) ||
                          Object.keys(r.languages || {}).some((l) => l.toLowerCase().includes(q)) ||
                          (r.topics || []).some((t) => t.toLowerCase().includes(q))
                        );
                      }
                      return true;
                    })
                    .map((repo) => (
                    <div key={repo.name} className="p-3 bg-gray-800 rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-400">{repo.name}</span>
                          {repo.private && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">private</span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">★ {repo.stars} · ⑂ {repo.forks}</span>
                      </div>
                      {repo.description && <p className="text-gray-400 text-xs">{repo.description}</p>}
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(repo.languages || {}).map((l) => (
                          <span key={l} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">{l}</span>
                        ))}
                        {(repo.topics || []).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs text-green-400">{t}</span>
                        ))}
                      </div>
                      {repo.readme && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">README preview</summary>
                          <pre className="mt-1 text-xs text-gray-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{repo.readme}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Gemini payload */}
              <CollapsibleSection title={`Gemini prompt (~${payload?.estimated_tokens} tokens)`}>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">System prompt</p>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded">{payload?.system}</pre>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">User prompt (context + instructions)</p>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-gray-800 p-3 rounded max-h-96 overflow-y-auto">{payload?.user}</pre>
                  </div>
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {analyzing ? "Analyzing with Gemini..." : "Run Gemini Analysis"}
                  </button>
                </div>
              </CollapsibleSection>

              {/* Gemini analysis result */}
              {analysis && (
                <CollapsibleSection title="Gemini Analysis Result" defaultOpen>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">{analysis.experience_level}</span>
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">{analysis.primary_role}</span>
                      </div>
                      <p className="text-sm text-gray-300">{analysis.summary}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Technologies</p>
                      <div className="space-y-1">
                        {(analysis.technologies || []).map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-24 text-gray-300 truncate font-medium">{t.name}</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              t.proficiency === "expert" ? "bg-green-500/20 text-green-400" :
                              t.proficiency === "advanced" ? "bg-blue-500/20 text-blue-400" :
                              t.proficiency === "intermediate" ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-gray-700 text-gray-400"
                            }`}>{t.proficiency}</span>
                            <span className="text-gray-500">{t.category}</span>
                            {t.evidence && <span className="text-gray-600 truncate">— {t.evidence}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {analysis.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Strengths</p>
                        <ul className="list-disc list-inside text-xs text-gray-300 space-y-0.5">
                          {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}

                    {analysis.interests?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Interests</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.interests.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-800 rounded text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.notable_projects?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1 font-medium">Notable Projects</p>
                        <div className="space-y-2">
                          {analysis.notable_projects.map((p, i) => (
                            <div key={i} className="p-2 bg-gray-800 rounded">
                              <p className="text-xs font-medium text-blue-400">{p.name}</p>
                              {p.description && <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(p.technologies || []).map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 bg-gray-700 rounded text-xs">{t}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <CollapsibleSection title="Raw JSON">
                      <pre className="text-xs text-gray-400 whitespace-pre-wrap">{JSON.stringify(analysis, null, 2)}</pre>
                    </CollapsibleSection>
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}
        </div>

        {/* CV Generation via Stitch */}
        <StitchCV analysis={analysis} githubData={result?.github_data} />

        {/* VAPI Voice Test */}
        <VapiDebug analysis={analysis} githubData={result?.github_data} />

        {/* Interview History */}
        <InterviewHistory />
      </div>
    </div></div>
  );
}


function InterviewHistory() {
  const [interviews, setInterviews] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(null); // interview id being reviewed

  useEffect(() => {
    loadInterviews();
  }, []);

  async function loadInterviews() {
    setLoading(true);
    try {
      const data = await api.listInterviews();
      setInterviews(data);
    } catch {
      // not logged in or no interviews
    } finally {
      setLoading(false);
    }
  }

  async function reviewSaved(iv) {
    setReviewing(iv.id);
    try {
      const resp = await api.debugVapiReview({
        transcript: iv.transcript,
        job_title: iv.job_title || "",
        company: iv.company || "",
        requirements: iv.requirements || "",
      });
      if (resp.error) return;
      await api.updateInterviewReview(iv.id, resp.review, resp.review.overall_score);
      await loadInterviews();
      setExpanded(iv.id);
    } catch {
      // ignore
    } finally {
      setReviewing(null);
    }
  }

  if (loading) return null;
  if (interviews.length === 0) return null;

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Saved Interviews ({interviews.length})</h2>
        <button onClick={loadInterviews} className="text-xs text-gray-500 hover:text-gray-300 transition">Refresh</button>
      </div>

      <div className="space-y-2">
        {interviews.map((iv) => (
          <div key={iv.id} className="bg-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === iv.id ? null : iv.id)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-750 transition"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs ${iv.mode === "interview" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400"}`}>
                  {iv.mode === "interview" ? "Interview" : "Job Discovery"}
                </span>
                <span className="text-sm text-gray-300">{iv.job_title || "Untitled"}</span>
                {iv.company && <span className="text-xs text-gray-500">at {iv.company}</span>}
              </div>
              <div className="flex items-center gap-3">
                {iv.score != null && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    iv.score >= 7 ? "bg-green-500/20 text-green-400" :
                    iv.score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>{iv.score}/10</span>
                )}
                {!iv.review && (
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-400">No review</span>
                )}
                <span className="text-xs text-gray-500">{iv.created_at?.slice(0, 16)}</span>
                <span className="text-gray-400">{expanded === iv.id ? "▼" : "▶"}</span>
              </div>
            </button>

            {expanded === iv.id && (
              <div className="px-4 pb-4 space-y-3">
                {/* Transcript */}
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-xs text-gray-500 font-medium">Transcript</p>
                  {(iv.transcript || []).map((t, i) => (
                    <div key={i} className={`text-xs px-3 py-1.5 rounded ${t.role === "assistant" ? "bg-gray-700 text-gray-300" : "bg-blue-900/30 text-blue-300"}`}>
                      <span className="font-medium">{t.role === "assistant" ? "AI" : "You"}:</span> {t.text}
                    </div>
                  ))}
                </div>

                {/* Review button if no review yet */}
                {!iv.review && (
                  <button
                    onClick={(e) => { e.stopPropagation(); reviewSaved(iv); }}
                    disabled={reviewing === iv.id}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {reviewing === iv.id ? "Analyzing with Gemini..." : "Review this Interview"}
                  </button>
                )}

                {/* Review summary if available */}
                {iv.review && (
                  <div className="border border-purple-500/20 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        iv.review.overall_score >= 7 ? "bg-green-500/20 text-green-400" :
                        iv.review.overall_score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>{iv.review.overall_score}/10</span>
                      {iv.review.hiring_recommendation && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          iv.review.hiring_recommendation === "strong_hire" ? "bg-green-500/20 text-green-400" :
                          iv.review.hiring_recommendation === "hire" ? "bg-blue-500/20 text-blue-400" :
                          iv.review.hiring_recommendation === "maybe" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{iv.review.hiring_recommendation.replace("_", " ").toUpperCase()}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300">{iv.review.overall_assessment}</p>

                    {iv.review.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs text-green-400 font-medium mb-1">Strengths</p>
                        {iv.review.strengths.map((s, i) => (
                          <div key={i} className="text-xs text-gray-400">- <span className="text-green-300">{s.area}</span>: {s.detail}</div>
                        ))}
                      </div>
                    )}

                    {iv.review.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs text-red-400 font-medium mb-1">Areas for Improvement</p>
                        {iv.review.weaknesses.map((w, i) => (
                          <div key={i} className="text-xs text-gray-400">- <span className="text-red-300">{w.area}</span>: {w.detail}</div>
                        ))}
                      </div>
                    )}

                    {iv.review.missed_opportunities?.length > 0 && (
                      <div>
                        <p className="text-xs text-yellow-400 font-medium mb-1">Missed Opportunities</p>
                        {iv.review.missed_opportunities.map((m, i) => (
                          <div key={i} className="text-xs text-gray-400 mb-1">
                            - <span className="text-yellow-300">{m.topic}</span>: {m.suggestion}
                          </div>
                        ))}
                      </div>
                    )}

                    {iv.review.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs text-blue-400 font-medium mb-1">Recommendations</p>
                        {iv.review.recommendations.map((r, i) => (
                          <div key={i} className="text-xs text-gray-400">- <span className="text-blue-300">{r.topic}</span>: {r.action}</div>
                        ))}
                      </div>
                    )}

                    {iv.review.question_scores?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-1">Question Breakdown</p>
                        {iv.review.question_scores.map((q, i) => (
                          <div key={i} className="text-xs flex items-start gap-2 mb-1">
                            <span className={`px-1 py-0.5 rounded font-bold shrink-0 ${
                              q.score >= 7 ? "bg-green-500/20 text-green-400" :
                              q.score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>{q.score}/10</span>
                            <span className="text-gray-400"><span className="text-gray-300">{q.question}</span> — {q.feedback}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


function StitchCV({ analysis, githubData }) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [requirements, setRequirements] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [cvResult, setCvResult] = useState(null); // { html, screenshotUrl, elapsed }
  const [error, setError] = useState("");
  const [promptPreview, setPromptPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);

  // Auto-fill from analysis
  useEffect(() => {
    if (!analysis || autoFilled) return;
    if (analysis.primary_role) setJobTitle(analysis.primary_role);
    const topTechs = (analysis.technologies || [])
      .filter((t) => t.proficiency === "advanced" || t.proficiency === "expert")
      .map((t) => t.name)
      .join(", ");
    if (topTechs) setRequirements(topTechs);
    setAutoFilled(true);
  }, [analysis]);

  function getParams() {
    return {
      github_data: githubData || null,
      profile_analysis: analysis || null,
      job_title: jobTitle || null,
      company: company || null,
      requirements: requirements || null,
    };
  }

  async function previewPrompt() {
    try {
      const resp = await api.debugPreviewCVPrompt(getParams());
      if (resp.error) { setError(resp.error); return; }
      setPromptPreview(resp.prompt);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function startGeneration() {
    setError("");
    setCvResult(null);
    setGenerating(true);
    setElapsed(0);
    setShowPreview(false);

    // Start elapsed timer
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const resp = await api.debugGenerateCV(getParams());
      if (resp.error) {
        setError(resp.error);
        setGenerating(false);
        clearInterval(timerRef.current);
        return;
      }
      setJobId(resp.job_id);

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.debugCVStatus(resp.job_id);
          if (status.status === "done") {
            setCvResult({ html: status.html, screenshotUrl: status.screenshotUrl, elapsed: status.elapsed });
            setGenerating(false);
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          } else if (status.status === "error") {
            setError(status.error || "Generation failed");
            setGenerating(false);
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          }
        } catch (err) {
          setError(err.message);
          setGenerating(false);
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
        }
      }, 3000);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
      clearInterval(timerRef.current);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  function downloadHTML() {
    if (!cvResult?.html) return;
    const blob = new Blob([cvResult.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = githubData?.name || githubData?.username || "developer";
    a.download = `cv-${name.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasData = !!(githubData || analysis);

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">CV Generation (Stitch)</h2>
        {cvResult && (
          <span className="text-xs text-gray-500">Generated in {cvResult.elapsed}s</span>
        )}
      </div>

      {!hasData && (
        <p className="text-gray-500 text-sm">Scrape a GitHub profile and run Gemini analysis first to populate CV data.</p>
      )}

      {hasData && !generating && !cvResult && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Generate a professional CV/portfolio using Google Stitch. Uses scraped GitHub data and Gemini analysis.
            Takes ~2 minutes.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Target job title (optional)"
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
            />
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Target company (optional)"
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
            />
            <input
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Key requirements to emphasize (optional)"
              className="col-span-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={previewPrompt}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
            >
              Preview Prompt
            </button>
            <button
              onClick={startGeneration}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition"
            >
              Generate CV
            </button>
          </div>

          {showPreview && promptPreview && (
            <CollapsibleSection title="Stitch Prompt Preview" defaultOpen>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">{promptPreview}</pre>
            </CollapsibleSection>
          )}
        </div>
      )}

      {generating && (
        <div className="text-center py-8 space-y-3">
          <div className="inline-flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm text-gray-300">Generating CV with Stitch...</span>
          </div>
          <p className="text-2xl font-mono text-indigo-400">{elapsed}s</p>
          <p className="text-xs text-gray-500">This typically takes 90-120 seconds</p>
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {cvResult && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={downloadHTML}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition"
            >
              Download HTML
            </button>
            <button
              onClick={() => {
                const win = window.open("", "_blank");
                win.document.write(cvResult.html);
                win.document.close();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
            >
              Open in New Tab
            </button>
            <button
              onClick={() => { setCvResult(null); setJobId(null); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
            >
              Generate Another
            </button>
          </div>

          {/* Inline preview */}
          <CollapsibleSection title={`CV Preview (${cvResult.html.length.toLocaleString()} chars)`} defaultOpen>
            <div className="bg-white rounded-lg overflow-hidden" style={{ height: "600px" }}>
              <iframe
                srcDoc={cvResult.html}
                title="CV Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts"
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Raw HTML">
            <pre className="text-xs text-gray-400 whitespace-pre-wrap max-h-96 overflow-y-auto">{cvResult.html}</pre>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}


function VapiDebug({ analysis, githubData }) {
  const [mode, setMode] = useState("interview");
  const [inputMode, setInputMode] = useState("text"); // "voice" or "text"
  const [userName, setUserName] = useState("Test User");
  const [technologies, setTechnologies] = useState("Python, JavaScript");
  const [summary, setSummary] = useState("Experienced developer");
  const [jobTitle, setJobTitle] = useState("Senior Backend Developer");
  const [company, setCompany] = useState("Test Corp");
  const [requirements, setRequirements] = useState("Python, FastAPI, PostgreSQL");
  const [difficulty, setDifficulty] = useState("medium");
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill from Gemini analysis
  useEffect(() => {
    if (!analysis || autoFilled) return;
    const name = githubData?.name || githubData?.username || userName;
    setUserName(name);
    const techs = (analysis.technologies || []).map((t) => t.name).join(", ");
    if (techs) setTechnologies(techs);
    if (analysis.summary) setSummary(analysis.summary);
    if (analysis.primary_role) setJobTitle(analysis.primary_role);
    // Build requirements from top proficiency techs
    const topTechs = (analysis.technologies || [])
      .filter((t) => t.proficiency === "advanced" || t.proficiency === "expert")
      .map((t) => t.name)
      .join(", ");
    if (topTechs) setRequirements(topTechs);
    setAutoFilled(true);
  }, [analysis, githubData]);

  const [assistantId, setAssistantId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [chatActive, setChatActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [saved, setSaved] = useState(false);
  const chatHistoryRef = useRef([]);
  const vapiRef = useRef(null);
  const transcriptContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript]);

  function getParams() {
    return {
      mode,
      user_name: userName,
      technologies: technologies.split(",").map((t) => t.trim()).filter(Boolean),
      summary,
      job_title: jobTitle,
      company: company || null,
      requirements: requirements || null,
      difficulty,
    };
  }

  async function startVoiceCall() {
    setError("");
    setTranscript([]);
    setReview(null);
    setSaved(false);
    setStatus("Creating assistant...");
    try {
      const { assistant_id, error: apiErr } = await api.debugVapiCreateAssistant(getParams());
      if (apiErr) { setError(apiErr); setStatus(""); return; }
      setAssistantId(assistant_id);
      setStatus("Connecting to VAPI...");

      const { public_key } = await api.debugVapiConfig();
      if (!public_key) { setError("VAPI_PUBLIC_KEY not set in backend .env"); setStatus(""); return; }

      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(public_key);
      vapiRef.current = vapi;

      vapi.on("call-start", () => { setCallActive(true); setStatus("Call active"); });
      vapi.on("call-end", () => { setCallActive(false); setSpeaking(false); setStatus("Call ended"); });
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => setSpeaking(false));
      vapi.on("message", (msg) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          setTranscript((prev) => [...prev, { role: msg.role, text: msg.transcript }]);
        }
      });
      vapi.on("error", (e) => setError(String(e.message || e)));

      vapi.start(assistant_id);
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  async function startTextChat() {
    setError("");
    setTranscript([]);
    setReview(null);
    setSaved(false);
    chatHistoryRef.current = [];
    setStatus("Creating assistant...");
    try {
      const { assistant_id, error: apiErr } = await api.debugVapiCreateAssistant(getParams());
      if (apiErr) { setError(apiErr); setStatus(""); return; }
      setAssistantId(assistant_id);
      setChatActive(true);
      setStatus("Chat active");

      // Send initial greeting to get first message
      chatHistoryRef.current = [{ role: "user", content: "hello" }];
      const resp = await api.debugVapiChat(assistant_id, chatHistoryRef.current);
      if (resp.error) { setError(resp.error); return; }
      for (const msg of resp.output || []) {
        if (msg.content) {
          chatHistoryRef.current.push({ role: "assistant", content: msg.content });
          setTranscript((prev) => [...prev, { role: "assistant", text: msg.content }]);
        }
      }
    } catch (err) {
      setError(err.message);
      setStatus("");
    }
  }

  async function sendTextMessage(e) {
    e.preventDefault();
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput("");
    setTranscript((prev) => [...prev, { role: "user", text: msg }]);

    if (callActive && vapiRef.current) {
      // Voice call — inject text
      vapiRef.current.send({
        type: "add-message",
        message: { role: "user", content: msg },
        triggerResponseEnabled: true,
      });
    } else if (chatActive && assistantId) {
      // Text chat mode — send full history
      setSending(true);
      chatHistoryRef.current.push({ role: "user", content: msg });
      try {
        const resp = await api.debugVapiChat(assistantId, chatHistoryRef.current);
        if (resp.error) { setError(resp.error); setSending(false); return; }
        for (const m of resp.output || []) {
          if (m.content) {
            chatHistoryRef.current.push({ role: "assistant", content: m.content });
            setTranscript((prev) => [...prev, { role: "assistant", text: m.content }]);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }

  async function reviewInterview() {
    setReviewing(true);
    setError("");
    try {
      const resp = await api.debugVapiReview({
        transcript,
        job_title: jobTitle,
        company,
        requirements,
        github_data: githubData || null,
        profile_analysis: analysis || null,
      });
      if (resp.error) { setError(resp.error); } else { setReview(resp.review); }
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  }

  async function saveInterview() {
    try {
      await api.saveInterview({
        mode,
        job_title: jobTitle,
        company,
        requirements,
        transcript,
        review: review || null,
        score: review?.overall_score || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  async function endSession() {
    vapiRef.current?.stop();
    vapiRef.current = null;
    if (assistantId) {
      await api.debugVapiDeleteAssistant(assistantId).catch(() => {});
      setAssistantId(null);
    }
    setCallActive(false);
    setChatActive(false);
    chatHistoryRef.current = [];
  }

  const isActive = callActive || chatActive;
  const isConnecting = status === "Creating assistant..." || status === "Connecting to VAPI...";

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">VAPI Test</h2>

      {!isActive && !isConnecting && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("interview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === "interview" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              Mock Interview
            </button>
            <button
              onClick={() => setMode("job_discovery")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === "job_discovery" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              Job Discovery
            </button>
          </div>

          {mode === "interview" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Difficulty:</span>
              {["easy", "medium", "hard", "faang"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    difficulty === d
                      ? d === "easy" ? "bg-green-600" : d === "medium" ? "bg-blue-600" : d === "hard" ? "bg-orange-600" : "bg-red-600"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  {d === "faang" ? "FAANG" : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Name"
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
            <input value={technologies} onChange={(e) => setTechnologies(e.target.value)} placeholder="Technologies (comma-separated)"
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
            <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Background summary"
              className="col-span-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
            {mode === "interview" && (
              <>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Job title"
                  className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company"
                  className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
                <input value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Requirements"
                  className="col-span-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-xs" />
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={startTextChat} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">
              Text Chat
            </button>
            <button onClick={startVoiceCall} className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition">
              Voice Call
            </button>
          </div>
        </div>
      )}

      {isConnecting && (
        <p className="text-gray-400 text-sm text-center py-4">{status}</p>
      )}

      {isActive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {callActive && <span className={`w-3 h-3 rounded-full ${speaking ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />}
              {chatActive && <span className="w-3 h-3 rounded-full bg-blue-500" />}
              <span className="text-sm text-gray-300">
                {callActive ? (speaking ? "Assistant speaking..." : "Listening...") : "Text chat"}
              </span>
            </div>
            <button onClick={endSession} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-medium transition">
              End
            </button>
          </div>

          {/* Transcript */}
          {transcript.length > 0 && (
            <div ref={transcriptContainerRef} className="space-y-1 max-h-64 overflow-y-auto">
              {transcript.map((t, i) => (
                <div key={i} className={`text-xs px-3 py-1.5 rounded ${t.role === "assistant" ? "bg-gray-800 text-gray-300" : "bg-blue-900/30 text-blue-300"}`}>
                  <span className="font-medium">{t.role === "assistant" ? "AI" : "You"}:</span> {t.text}
                </div>
              ))}
            </div>
          )}

          {/* Text input */}
          <form onSubmit={sendTextMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={callActive ? "Type to inject text into call..." : "Type a message..."}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={sending}
              ref={inputRef}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={sending || !textInput.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Review button — visible after session ends with transcript */}
      {!isActive && transcript.length > 2 && !review && (
        <button
          onClick={reviewInterview}
          disabled={reviewing}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {reviewing ? "Analyzing with Gemini..." : "Review Interview"}
        </button>
      )}

      {/* Review results */}
      {review && (
        <div className="space-y-4 border border-purple-500/30 rounded-xl p-4 bg-purple-950/20">
          {/* Header with score */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Interview Review</h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                review.overall_score >= 7 ? "bg-green-500/20 text-green-400" :
                review.overall_score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {review.overall_score}/10
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                review.hiring_recommendation === "strong_hire" ? "bg-green-500/20 text-green-400" :
                review.hiring_recommendation === "hire" ? "bg-blue-500/20 text-blue-400" :
                review.hiring_recommendation === "maybe" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {review.hiring_recommendation?.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-300">{review.overall_assessment}</p>
          {review.hiring_rationale && (
            <p className="text-xs text-gray-400 italic">{review.hiring_rationale}</p>
          )}

          {/* Strengths */}
          {review.strengths?.length > 0 && (
            <div>
              <p className="text-xs text-green-400 font-medium mb-1">Strengths</p>
              <div className="space-y-1">
                {review.strengths.map((s, i) => (
                  <div key={i} className="text-xs p-2 bg-green-500/10 rounded">
                    <span className="font-medium text-green-300">{s.area}</span>
                    <span className="text-gray-400"> — {s.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {review.weaknesses?.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-medium mb-1">Areas for Improvement</p>
              <div className="space-y-1">
                {review.weaknesses.map((w, i) => (
                  <div key={i} className="text-xs p-2 bg-red-500/10 rounded">
                    <span className="font-medium text-red-300">{w.area}</span>
                    <span className="text-gray-400"> — {w.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missed opportunities */}
          {review.missed_opportunities?.length > 0 && (
            <div>
              <p className="text-xs text-yellow-400 font-medium mb-1">Missed Opportunities</p>
              <div className="space-y-1">
                {review.missed_opportunities.map((m, i) => (
                  <div key={i} className="text-xs p-2 bg-yellow-500/10 rounded">
                    <span className="font-medium text-yellow-300">{m.topic}</span>
                    <p className="text-gray-400 mt-0.5">{m.evidence}</p>
                    <p className="text-yellow-200/70 mt-0.5 italic">{m.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {review.recommendations?.length > 0 && (
            <div>
              <p className="text-xs text-blue-400 font-medium mb-1">Recommendations</p>
              <div className="space-y-1">
                {review.recommendations.map((r, i) => (
                  <div key={i} className="text-xs p-2 bg-blue-500/10 rounded">
                    <span className="font-medium text-blue-300">{r.topic}</span>
                    <span className="text-gray-400"> — {r.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-question scores */}
          {review.question_scores?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Question Breakdown</p>
              <div className="space-y-1">
                {review.question_scores.map((q, i) => (
                  <div key={i} className="text-xs p-2 bg-gray-800 rounded flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      q.score >= 7 ? "bg-green-500/20 text-green-400" :
                      q.score >= 4 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{q.score}/10</span>
                    <div>
                      <p className="text-gray-300 font-medium">{q.question}</p>
                      <p className="text-gray-500">{q.feedback}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      {!isActive && transcript.length > 2 && !saved && (
        <button
          onClick={saveInterview}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
        >
          Save Interview
        </button>
      )}
      {saved && (
        <p className="text-green-400 text-xs text-center">Interview saved.</p>
      )}

      {status === "Call ended" && !isActive && !review && transcript.length <= 2 && (
        <p className="text-gray-500 text-xs text-center">Session ended. Configure and start a new one above.</p>
      )}
    </div>
  );
}

