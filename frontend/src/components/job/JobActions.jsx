import { useNavigate } from "react-router-dom";
import { Send, FileText, Mic, Lightbulb, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "@/components/dashboard/ScoreRing";
import { mockApplicationStatus, mockInterviewHistory, mockLastAnalysis } from "@/data/mockData";

const appStatusDisplay = {
  not_applied: null,
  applied: { label: "Applied", icon: Clock, color: "text-accent bg-accent/10" },
  interview: { label: "Interview Stage", icon: CheckCircle2, color: "text-amber-600 bg-amber-50" },
  offer: { label: "Offer Received", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-500 bg-red-50" },
};

export default function JobActions({ jobId }) {
  const navigate = useNavigate();
  const appStatus = mockApplicationStatus[jobId];
  const statusInfo = appStatus ? appStatusDisplay[appStatus.status] : null;
  const interviews = mockInterviewHistory.filter((i) => i.jobOfferId === jobId);
  const lastScore = interviews.length > 0 ? interviews[0].score : null;

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        {/* Application Status */}
        {statusInfo && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${statusInfo.color}`}>
            <statusInfo.icon className="w-4 h-4" />
            <span className="text-xs font-medium">{statusInfo.label}</span>
            {appStatus.date && (
              <span className="text-[10px] opacity-70 ml-auto">
                {new Date(appStatus.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {(!appStatus || appStatus.status === "not_applied") && (
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
              <Send className="w-4 h-4" />
              Apply
            </button>
          )}
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer">
            <FileText className="w-4 h-4" />
            Generate CV
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-panel-border" />

        {/* Last Interview Score */}
        <div>
          <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            Last Interview Score
          </h4>
          {lastScore !== null ? (
            <div className="flex items-center gap-4">
              <ScoreRing score={lastScore} size={64} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#1A1A1A] font-medium">
                  {interviews[0].type} · {interviews[0].personality}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {new Date(interviews[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-[10px] text-muted">{interviews.length} total session{interviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No interview simulations yet</p>
          )}
        </div>

        {/* Suggestions */}
        {lastScore !== null && (
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
              How to Improve
            </h4>
            <ul className="space-y-1.5">
              {mockLastAnalysis.suggestions.map((tip, i) => (
                <li
                  key={i}
                  className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-panel-border" />

        {/* Start Interview */}
        <button
          onClick={() => navigate("/interview")}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Start Interview Simulation
        </button>
      </CardContent>
    </Card>
  );
}
