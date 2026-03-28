import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

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

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-xl shadow-lg w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">InterviewAI</h1>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          required
        />
        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">
          {isRegister ? "Register" : "Sign In"}
        </button>
        <p className="text-center text-sm text-gray-400">
          {isRegister ? "Already have an account?" : "No account?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-blue-400 hover:underline">
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>
      </form>
    </div>
  );
}
