import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Phone, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const personalities = ["Professional", "Friendly", "Tough", "Casual"];
const interviewTypes = ["Technical", "Behavioral", "System Design", "Mixed"];

export default function InterviewSettings() {
  const [personality, setPersonality] = useState("Professional");
  const [type, setType] = useState("Technical");
  const [jobContext, setJobContext] = useState("");
  const navigate = useNavigate();

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted" />
          Interview Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Personality */}
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
            Personality of Interviewer
          </label>
          <div className="flex flex-wrap gap-1.5">
            {personalities.map((p) => (
              <button
                key={p}
                onClick={() => setPersonality(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  personality === p
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-background text-muted hover:bg-[#EAEAE5]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Interview Type */}
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
            Interview Type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {interviewTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  type === t
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-background text-muted hover:bg-[#EAEAE5]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Job Offer / Project Context */}
        <div className="flex-1 flex flex-col">
          <label className="text-xs font-medium text-muted uppercase tracking-wider mb-1.5 block">
            Job Offer / Project Context
          </label>
          <textarea
            value={jobContext}
            onChange={(e) => setJobContext(e.target.value)}
            placeholder="Paste a job description or describe the project..."
            className="w-full flex-1 min-h-[80px] px-3 py-2 rounded-lg bg-background border border-panel-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
          <button
            onClick={() => navigate("/interview/session")}
            className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Start Interview
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
