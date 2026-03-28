import { Trophy, ThumbsUp, ThumbsDown, Lightbulb, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "./ScoreRing";

export default function InterviewAnalysis({ interview }) {
  const review = interview?.review;
  const hasAnalysis = !!review;

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
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          Last Interview Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {hasAnalysis ? (
          <div className="flex flex-col h-full gap-4">
            <div className="flex gap-5">
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <ScoreRing score={score} size={112} />
                {date && <span className="text-[10px] text-on-surface-variant font-medium">{date}</span>}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-on-tertiary-container" />
                      <span className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-wider">
                        Strengths
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {strengths.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-tertiary-fixed-dim"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {weaknesses.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 text-error" />
                      <span className="text-[10px] font-bold text-error uppercase tracking-wider">
                        Improve
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {weaknesses.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-error"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-warning" />
                  <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                    Suggestions
                  </span>
                </div>
                <ul className="space-y-1">
                  {suggestions.map((item, i) => (
                    <li
                      key={i}
                      className="text-xs text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-warning"
                    >
                      {typeof item === "string" ? item : item.detail || item.area || ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary && (
              <div className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-on-surface-variant" />
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Summary
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  {summary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
              <Trophy className="w-6 h-6 text-outline-variant" />
            </div>
            <p className="text-sm font-semibold text-on-surface mb-1">No analysis yet</p>
            <p className="text-xs text-on-surface-variant text-center max-w-[200px]">
              Complete an interview to see your performance breakdown
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
