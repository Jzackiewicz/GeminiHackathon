import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import ScoreRing from "../components/dashboard/ScoreRing";
import { Card, CardContent } from "@/components/ui/card";
import { mockLastAnalysis } from "@/data/mockData";
import {
  Trophy,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  FileText,
  ArrowLeft,
  LayoutDashboard,
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
  const navigate = useNavigate();
  const analysis = mockLastAnalysis;

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl w-full mx-auto px-6 py-8 space-y-6">
          {/* Header + Score */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h1 className="text-lg font-semibold text-[#1A1A1A]">Interview Complete</h1>
            </div>
            <ScoreRing score={analysis.overall} size={140} />
            <p className="text-xs text-muted">
              {new Date(analysis.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Strengths */}
          <Section icon={ThumbsUp} label="Strengths" color="text-emerald-600">
            <ul className="space-y-2">
              {analysis.good.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Areas to Improve */}
          <Section icon={ThumbsDown} label="Areas to Improve" color="text-red-500">
            <ul className="space-y-2">
              {analysis.bad.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-red-400"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Suggestions */}
          <Section icon={Lightbulb} label="Suggestions" color="text-amber-600">
            <ul className="space-y-2">
              {analysis.suggestions.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Section>

          {/* Summary */}
          <Section icon={FileText} label="Summary" color="text-muted">
            <p className="text-sm text-[#1A1A1A] leading-relaxed">
              {analysis.summary}
            </p>
          </Section>

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-2 pb-4">
            <button
              onClick={() => navigate("/interview")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Interview
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
