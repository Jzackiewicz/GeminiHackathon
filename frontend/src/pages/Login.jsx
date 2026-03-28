import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";
import { Sparkles } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const fn = isRegister ? api.register : api.login;
      const data = await fn(email, password);
      setToken(data.access_token);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  async function loginWithGithub() {
    try {
      const { client_id } = await api.githubClientId();
      const redirect_uri = window.location.origin + "/auth/github/callback";
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent("repo read:user user:email")}`;
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-2xl shadow-card border border-panel-border w-full max-w-sm space-y-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">
            Interview<span className="text-accent">AI</span>
          </h1>
        </div>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-background border border-panel-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm transition"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg bg-background border border-panel-border focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm transition"
          required
        />
        <button type="submit" className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition text-sm cursor-pointer">
          {isRegister ? "Register" : "Sign In"}
        </button>

        <div className="flex items-center gap-3 text-muted text-sm">
          <hr className="flex-1 border-panel-border" />
          <span>or</span>
          <hr className="flex-1 border-panel-border" />
        </div>

        <button
          type="button"
          onClick={loginWithGithub}
          className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white border border-[#1A1A1A] rounded-lg font-medium transition flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          Sign in with GitHub
        </button>

        <p className="text-center text-sm text-muted">
          {isRegister ? "Already have an account?" : "No account?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-accent hover:underline cursor-pointer">
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}
