import { Trophy, ThumbsUp, ThumbsDown, Lightbulb, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "./ScoreRing";

export default function InterviewAnalysis({ interview }) {
  const review = interview?.review;
  const hasAnalysis = !!review;

  // Map real review shape to display — scale 1-10 score to percentage
  const score = review?.overall_score != null ? review.overall_score * 10 : 0;
  const strengths = (review?.strengths || []).map((s) =>
    typeof s === "string" ? s : `${s.area}: ${s.detail}`
  );
  const weaknesses = (review?.weaknesses || []).map((w) =>
    typeof w === "string" ? w : `${w.area}: ${w.detail}`
  );
  const suggestions = review?.suggestions || [];
  const summary = review?.overall_assessment || "";
  const date = interview?.created_at
    ? new Date(interview.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Last Interview Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {hasAnalysis ? (
          <div className="flex flex-col h-full gap-4">
            {/* Top: Score + Lists side by side */}
            <div className="flex gap-5">
              {/* Score ring + date */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <ScoreRing score={score} size={112} />
                {date && <span className="text-[10px] text-muted">{date}</span>}
              </div>

              {/* Strengths + Weaknesses */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Strengths */}
                {strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs font-medium text-success uppercase tracking-wider">
                        Strengths
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {strengths.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {weaknesses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 text-danger" />
                      <span className="text-xs font-medium text-danger uppercase tracking-wider">
                        Improve
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {weaknesses.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-danger"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                    Suggestions
                  </span>
                </div>
                <ul className="space-y-1">
                  {suggestions.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
                    >
                      {typeof item === "string" ? item : item.detail || item.area || ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="bg-background rounded-lg p-3 border border-panel-border">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted" />
                  <span className="text-xs font-medium text-muted uppercase tracking-wider">
                    Summary
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <Trophy className="w-10 h-10 text-[#E8E8E3] mb-3" />
            <p className="text-sm text-muted text-center">
              Complete an interview to see your analysis
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
