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

  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(true);
  const logsEndRef = useRef(null);
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
    if (logsOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, logsOpen]);

  async function runScrape(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
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
              <div ref={logsEndRef} />
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
                </div>
              </CollapsibleSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
