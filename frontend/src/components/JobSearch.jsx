import { useState } from "react";
import { api } from "../api";

export default function JobSearch() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function search(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const keywords = query.split(",").map((k) => k.trim()).filter(Boolean);
      const results = await api.searchJobs(keywords);
      setJobs(results);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectJob(id) {
    await api.selectJob(id);
    setSelectedId(id);
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Find Jobs</h2>
      <form onSubmit={search} className="flex gap-2">
        <input
          type="text"
          placeholder="Keywords (comma-separated)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {jobs.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {jobs.map((job) => (
            <li
              key={job.id}
              className={`p-3 rounded-lg cursor-pointer transition text-sm ${
                selectedId === job.id ? "bg-blue-600/20 border border-blue-500" : "bg-gray-800 hover:bg-gray-750"
              }`}
              onClick={() => selectJob(job.id)}
            >
              <p className="font-medium">{job.title}</p>
              {job.company && <p className="text-gray-400 text-xs">{job.company}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
