import { useState } from "react";
import { api } from "../api";

export default function ProfileCard({ profile, onUpdate }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function connectGithub(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await api.connectGithub(username);
      onUpdate(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>

      {profile?.github_username ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">GitHub: <span className="text-white">{profile.github_username}</span></p>
          {profile.technologies?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.technologies.map((t) => (
                <span key={t} className="px-2 py-1 bg-gray-800 rounded text-xs">{t}</span>
              ))}
            </div>
          )}
          {profile.summary && <p className="text-sm text-gray-300">{profile.summary}</p>}
        </div>
      ) : (
        <form onSubmit={connectGithub} className="flex gap-2">
          <input
            type="text"
            placeholder="GitHub username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-sm"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "..." : "Connect"}
          </button>
        </form>
      )}
    </div>
  );
}
