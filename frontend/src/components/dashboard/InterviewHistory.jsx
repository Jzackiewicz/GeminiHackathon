import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ScoreCell({ score }) {
  const color =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
      ? "text-amber-600"
      : "text-red-500";
  return <span className={`text-xs font-semibold ${color}`}>{score}</span>;
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
    <Card className="border-panel-border shadow-card h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-muted" />
            Interview History
          </CardTitle>
          <span className="text-xs text-muted">{history.length} sessions</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0">
        {history.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-panel-border">
                <th className="text-[10px] font-medium text-muted uppercase tracking-wider text-left px-5 py-2">Date</th>
                <th className="text-[10px] font-medium text-muted uppercase tracking-wider text-left px-2 py-2">Job</th>
                <th className="text-[10px] font-medium text-muted uppercase tracking-wider text-left px-2 py-2">Company</th>
                <th className="text-[10px] font-medium text-muted uppercase tracking-wider text-center px-2 py-2">Score</th>
                <th className="text-[10px] font-medium text-muted uppercase tracking-wider text-right px-5 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="border-b border-panel-border last:border-0 hover:bg-background transition-colors cursor-pointer"
                >
                  <td className="text-xs text-[#1A1A1A] px-5 py-2.5">
                    {item.created_at ? formatDate(item.created_at) : "—"}
                  </td>
                  <td className="text-xs text-[#1A1A1A] px-2 py-2.5 max-w-[150px] truncate">
                    {item.job_title || "General"}
                  </td>
                  <td className="text-xs text-muted px-2 py-2.5 max-w-[120px] truncate">
                    {item.company || "—"}
                  </td>
                  <td className="text-center px-2 py-2.5">
                    {item.score != null ? (
                      <ScoreCell score={item.score} />
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                  <td className="text-right px-5 py-2.5">
                    {item.review ? (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">
                        Reviewed
                      </Badge>
                    ) : item.transcript?.length > 0 ? (
                      <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        Started
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <History className="w-10 h-10 text-[#E8E8E3] mb-3" />
            <p className="text-sm text-muted text-center">
              No interviews yet
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
