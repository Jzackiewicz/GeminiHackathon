import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Phone, Sparkles, Loader2, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/api";

const personalities = ["Professional", "Friendly", "Tough", "Casual"];
const interviewTypes = ["Technical", "Behavioral", "System Design", "Mixed"];
const voices = [
  { id: "nova", label: "Nova", provider: "openai" },
  { id: "alloy", label: "Alloy", provider: "openai" },
  { id: "echo", label: "Echo", provider: "openai" },
  { id: "fable", label: "Fable", provider: "openai" },
  { id: "onyx", label: "Onyx", provider: "openai" },
  { id: "shimmer", label: "Shimmer", provider: "openai" },
];

export default function InterviewSettings({ selectedJob }) {
  const [personality, setPersonality] = useState("Professional");
  const [type, setType] = useState("Technical");
  const [voice, setVoice] = useState("shimmer");
  const [jobContext, setJobContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [rationale, setRationale] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedJob && !jobContext) {
      const parts = [];
      if (selectedJob.title) parts.push(selectedJob.title);
      if (selectedJob.company) parts.push(`at ${selectedJob.company}`);
      const tags = selectedJob.tags || [];
      if (tags.length > 0) parts.push(`\nSkills: ${tags.join(", ")}`);
      if (selectedJob.description) parts.push(`\n${selectedJob.description}`);
      setJobContext(parts.join(" "));
    }
  }, [selectedJob]);

  async function previewVoice() {
    if (previewing) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    try {
      const blob = await api.voicePreview(voice);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPreviewing(false); URL.revokeObjectURL(url); };
      audio.play();
    } catch {
      setPreviewing(false);
    }
  }

  async function autoGenerate() {
    setGenerating(true);
    setRationale("");
    try {
      const resp = await api.autoConfigureInterview();
      const c = resp.config;
      if (c.personality && personalities.includes(c.personality)) setPersonality(c.personality);
      if (c.interview_type && interviewTypes.includes(c.interview_type)) setType(c.interview_type);
      if (c.rationale) setRationale(c.rationale);
    } catch {}
    setGenerating(false);
  }

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

        {/* Voice */}
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
            Voice
          </label>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {voices.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    voice === v.id
                      ? "bg-[#1A1A1A] text-white"
                      : "bg-background text-muted hover:bg-[#EAEAE5]"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <button
              onClick={previewVoice}
              disabled={previewing}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-background border border-panel-border hover:bg-[#EAEAE5] transition-all cursor-pointer disabled:opacity-50"
              title="Preview voice"
            >
              {previewing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-muted" />
              )}
            </button>
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

        {/* Rationale */}
        {rationale && (
          <p className="text-xs text-muted italic px-1">{rationale}</p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={autoGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Generating..." : "Generate"}
          </button>
          <button
            onClick={() => navigate("/interview/session", { state: { personality, interview_type: type, voice, job_context: jobContext, job_slug: selectedJob?.slug } })}
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
