import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import ScoreRing from "../components/dashboard/ScoreRing";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FileText,
  ArrowLeft,
  LayoutDashboard,
  AlertTriangle,
} from "lucide-react";

function Section({ icon: Icon, label, color, children }) {
  return (
    <Card className="border-panel-border shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className={`text-xs font-medium uppercase tracking-wider ${color}`}>
            {label}
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function InterviewSummary() {
  const [user, setUser] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const { interviewId, transcript } = location.state || {};

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    if (!interviewId || !transcript || transcript.length < 2) {
      setError("No interview data available.");
      setLoading(false);
      return;
    }

    async function fetchReview() {
      try {
        const resp = await api.interviewReview(interviewId, transcript);
        if (resp.error) {
          setError(resp.error);
        } else {
          setReview(resp.review);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReview();
  }, [interviewId, transcript]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl w-full mx-auto px-6 py-8 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-16">
              <svg className="animate-spin h-8 w-8 text-[#1A1A1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-muted">Analyzing your interview performance...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-16">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Review results */}
          {!loading && review && (
            <>
              {/* Header + Score */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h1 className="text-lg font-semibold text-[#1A1A1A]">Interview Complete</h1>
                </div>
                <ScoreRing score={review.overall_score * 10} size={140} />
                {review.hiring_recommendation && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    review.hiring_recommendation === "strong_hire" ? "bg-emerald-100 text-emerald-700" :
                    review.hiring_recommendation === "hire" ? "bg-blue-100 text-blue-700" :
                    review.hiring_recommendation === "maybe" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {review.hiring_recommendation.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {/* Overall Assessment */}
              {review.overall_assessment && (
                <Section icon={FileText} label="Overall Assessment" color="text-muted">
                  <p className="text-sm text-[#1A1A1A] leading-relaxed">
                    {review.overall_assessment}
                  </p>
                </Section>
              )}

              {/* Strengths */}
              {review.strengths?.length > 0 && (
                <Section icon={ThumbsUp} label="Strengths" color="text-emerald-600">
                  <ul className="space-y-2">
                    {review.strengths.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500"
                      >
                        <span className="font-medium">{item.area}</span> — {item.detail}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Weaknesses */}
              {review.weaknesses?.length > 0 && (
                <Section icon={ThumbsDown} label="Areas to Improve" color="text-red-500">
                  <ul className="space-y-2">
                    {review.weaknesses.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-red-400"
                      >
                        <span className="font-medium">{item.area}</span> — {item.detail}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Recommendations */}
              {review.recommendations?.length > 0 && (
                <Section icon={Lightbulb} label="Recommendations" color="text-amber-600">
                  <ul className="space-y-2">
                    {review.recommendations.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
                      >
                        <span className="font-medium">{item.topic}</span> — {item.action}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Missed Opportunities */}
              {review.missed_opportunities?.length > 0 && (
                <Section icon={AlertTriangle} label="Missed Opportunities" color="text-purple-500">
                  <ul className="space-y-3">
                    {review.missed_opportunities.map((item, i) => (
                      <li key={i} className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-purple-400">
                        <span className="font-medium">{item.topic}</span>
                        <p className="text-xs text-muted mt-0.5">{item.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Hiring Rationale */}
              {review.hiring_rationale && (
                <Section icon={FileText} label="Hiring Rationale" color="text-muted">
                  <p className="text-sm text-[#1A1A1A] leading-relaxed">
                    {review.hiring_rationale}
                  </p>
                </Section>
              )}
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              onClick={() => navigate("/")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => navigate("/interview/session")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              New Interview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
