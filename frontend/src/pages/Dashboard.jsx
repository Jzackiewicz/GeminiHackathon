import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import ProfileCard from "../components/ProfileCard";
import JobSearch from "../components/JobSearch";
import InterviewPanel from "../components/InterviewPanel";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
    api.getProfile().then(setProfile).catch(() => {});
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">InterviewAI</h1>
        <div className="flex items-center gap-4">
          {user && <span className="text-gray-400 text-sm">{user.email}</span>}
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white transition">
            Sign out
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfileCard profile={profile} onUpdate={setProfile} />
        <JobSearch />
        <InterviewPanel />
      </div>
    </div>
  );
}
