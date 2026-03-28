import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, setToken } from "../api";

export default function GitHubCallback() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      navigate("/login");
      return;
    }
    api.githubCallback(code)
      .then((data) => {
        setToken(data.access_token);
        navigate("/");
      })
      .catch((err) => setError(err.message));
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <a href="/login" className="text-blue-400 hover:underline text-sm">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">Signing in with GitHub...</p>
    </div>
  );
}
