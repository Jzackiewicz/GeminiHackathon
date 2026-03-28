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
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

function Section({ icon: Icon, label, color, children }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            color === "text-on-tertiary-container" ? "bg-tertiary-fixed-dim/20" :
            color === "text-error" ? "bg-error-container" :
            color === "text-warning" ? "bg-warning-light" :
            color === "text-secondary" ? "bg-secondary-container" :
            "bg-surface-container-high"
          }`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <span className="font-headline text-sm font-bold text-on-surface">
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

  const { interviewId, transcript: navTranscript } = location.state || {};

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    if (!interviewId) {
      setError("No interview data available.");
      setLoading(false);
      return;
    }

    async function loadReview() {
      try {
        const interview = await api.getInterview(interviewId);

        if (interview.review) {
          setReview(interview.review);
          setLoading(false);
          return;
        }

        const transcript = navTranscript?.length ? navTranscript : interview.transcript;
        if (!transcript || transcript.length === 0) {
          setError("No transcript recorded for this interview.");
          setLoading(false);
          return;
        }

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

    loadReview();
  }, [interviewId]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pt-16 bg-surface-container-low">
        <div className="max-w-2xl w-full mx-auto px-6 py-8 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-4 py-20">
              <div className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-card flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-sm text-on-surface-variant font-medium">Analyzing your performance...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="w-16 h-16 rounded-full bg-warning-light flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-warning" />
              </div>
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Review results */}
          {!loading && review && (
            <>
              {/* Header + Score */}
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-5">
                    <h1 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">Interview Complete</h1>
                    <ScoreRing score={review.overall_score * 10} size={160} />
                    {review.hiring_recommendation && (
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold font-headline ${
                        review.hiring_recommendation === "strong_hire" ? "bg-tertiary-fixed-dim/20 text-on-tertiary-container" :
                        review.hiring_recommendation === "hire" ? "bg-secondary-container text-on-secondary-container" :
                        review.hiring_recommendation === "maybe" ? "bg-warning-light text-amber-700" :
                        "bg-error-container text-on-error-container"
                      }`}>
                        {review.hiring_recommendation.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Overall Assessment */}
              {review.overall_assessment && (
                <Section icon={FileText} label="Overall Assessment" color="text-on-surface-variant">
                  <p className="text-sm text-on-surface leading-relaxed">
                    {review.overall_assessment}
                  </p>
                </Section>
              )}

              {/* Strengths */}
              {review.strengths?.length > 0 && (
                <Section icon={ThumbsUp} label="Strengths" color="text-on-tertiary-container">
                  <ul className="space-y-2.5">
                    {review.strengths.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-on-surface leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-tertiary-fixed-dim"
                      >
                        <span className="font-semibold">{item.area}</span> — {item.detail}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Weaknesses */}
              {review.weaknesses?.length > 0 && (
                <Section icon={ThumbsDown} label="Areas to Improve" color="text-error">
                  <ul className="space-y-2.5">
                    {review.weaknesses.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-on-surface leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-error"
                      >
                        <span className="font-semibold">{item.area}</span> — {item.detail}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Recommendations */}
              {review.recommendations?.length > 0 && (
                <Section icon={Lightbulb} label="Recommendations" color="text-warning">
                  <ul className="space-y-2.5">
                    {review.recommendations.map((item, i) => (
                      <li
                        key={i}
                        className="text-sm text-on-surface leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-warning"
                      >
                        <span className="font-semibold">{item.topic}</span> — {item.action}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Missed Opportunities */}
              {review.missed_opportunities?.length > 0 && (
                <Section icon={AlertTriangle} label="Missed Opportunities" color="text-secondary">
                  <ul className="space-y-3">
                    {review.missed_opportunities.map((item, i) => (
                      <li key={i} className="text-sm text-on-surface leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-secondary">
                        <span className="font-semibold">{item.topic}</span>
                        <p className="text-xs text-on-surface-variant mt-0.5">{item.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Hiring Rationale */}
              {review.hiring_rationale && (
                <Section icon={FileText} label="Hiring Rationale" color="text-on-surface-variant">
                  <p className="text-sm text-on-surface leading-relaxed">
                    {review.hiring_rationale}
                  </p>
                </Section>
              )}
            </>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-surface-container-lowest text-on-surface text-sm font-bold font-headline rounded-full border border-outline-variant/20 hover:bg-surface-container hover:-translate-y-0.5 transition-all cursor-pointer shadow-card"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => navigate("/interview/session")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary text-sm font-bold font-headline rounded-full hover:bg-primary-container hover:shadow-ambient hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
