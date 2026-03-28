import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ScoreCell({ score }) {
  const color =
    score >= 80
      ? "text-on-tertiary-container"
      : score >= 60
      ? "text-warning"
      : "text-error";
  return <span className={`text-xs font-bold ${color}`}>{score}</span>;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InterviewHistory({ history }) {
  const navigate = useNavigate();

  function handleRowClick(item) {
    navigate("/interview/summary", {
      state: { interviewId: item.id },
    });
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-on-surface-variant" />
            Interview History
          </CardTitle>
          <span className="text-xs text-on-surface-variant font-medium">{history.length} sessions</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0">
        {history.length > 0 ? (
          <div className="divide-y divide-surface-container-high">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleRowClick(item)}
                className="flex items-center justify-between gap-3 px-6 py-3 hover:bg-surface-container-low/50 transition-colors cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate">
                    {item.job_title || "General Interview"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.company && <span className="text-[11px] text-on-surface-variant truncate">{item.company}</span>}
                    {item.created_at && (
                      <span className="text-[11px] text-outline shrink-0">{formatDate(item.created_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.score != null && (
                    <ScoreCell score={item.score} />
                  )}
                  {item.review ? (
                    <Badge variant="success" className="text-[10px]">
                      Reviewed
                    </Badge>
                  ) : item.transcript?.length > 0 ? (
                    <Badge variant="secondary" className="text-[10px] bg-warning-light text-amber-700">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Started
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
              <History className="w-6 h-6 text-outline-variant" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">No interviews yet</p>
            <p className="text-xs text-on-surface-variant text-center max-w-[200px]">
              Start a session to build your history
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
