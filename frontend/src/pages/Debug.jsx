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
    <div className="max-w-5xl mx-auto px-4 py-8">
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

        {/* VAPI Voice Test */}
        <VapiDebug analysis={analysis} githubData={result?.github_data} />
      </div>
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
    };
  }

  async function startVoiceCall() {
    setError("");
    setTranscript([]);
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

      {status === "Call ended" && !isActive && (
        <p className="text-gray-500 text-xs text-center">Session ended. Configure and start a new one above.</p>
      )}
    </div>
  );
}
