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

function ChipGroup({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const label = typeof item === "string" ? item : item.label;
        const val = typeof item === "string" ? item : item.id;
        const active = value === val;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-tight transition-all cursor-pointer ${
              active
                ? "bg-primary text-on-primary shadow-card"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Settings className="w-4 h-4 text-on-surface-variant" />
          Interview Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 flex-1 flex flex-col">
        {/* Personality */}
        <div>
          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5 block">
            Interviewer Personality
          </label>
          <ChipGroup items={personalities} value={personality} onChange={setPersonality} />
        </div>

        {/* Interview Type */}
        <div>
          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5 block">
            Interview Type
          </label>
          <ChipGroup items={interviewTypes} value={type} onChange={setType} />
        </div>

        {/* Voice */}
        <div>
          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2.5 block">
            Voice
          </label>
          <div className="flex items-center gap-2">
            <ChipGroup items={voices} value={voice} onChange={setVoice} />
            <button
              onClick={previewVoice}
              disabled={previewing}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-surface-container-high hover:bg-surface-container-highest transition-all cursor-pointer disabled:opacity-50"
              title="Preview voice"
            >
              {previewing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-tertiary-fixed-dim" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-on-surface-variant" />
              )}
            </button>
          </div>
        </div>

        {/* Job Offer / Project Context */}
        <div className="flex-1 flex flex-col">
          <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
            Job Context
          </label>
          <textarea
            value={jobContext}
            onChange={(e) => setJobContext(e.target.value)}
            placeholder="Paste a job description or describe the project..."
            className="w-full flex-1 min-h-[80px] px-4 py-3 rounded-xl bg-surface-container-high text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-outline/40 transition resize-none"
          />
        </div>

        {/* Rationale */}
        {rationale && (
          <div className="bg-tertiary-fixed-dim/10 rounded-xl px-3 py-2">
            <p className="text-xs text-on-surface-variant italic leading-relaxed">{rationale}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={autoGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-lowest text-on-surface text-sm font-bold font-headline rounded-full border border-outline-variant/20 hover:bg-surface-container hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 shadow-card"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generating ? "Generating..." : "Auto-Configure"}
          </button>
          <button
            onClick={() => navigate("/interview/session", { state: { personality, interview_type: type, voice, job_context: jobContext, job_slug: selectedJob?.slug } })}
            className="flex-[2] flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary text-sm font-bold font-headline rounded-full hover:bg-primary-container hover:shadow-ambient hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Start Interview
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
