import { Trophy, ThumbsUp, ThumbsDown, Lightbulb, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "./ScoreRing";
import { mockLastAnalysis } from "@/data/mockData";

export default function InterviewAnalysis() {
  const analysis = mockLastAnalysis;
  const hasAnalysis = true;

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
                <ScoreRing score={analysis.overall} size={112} />
                <span className="text-[10px] text-muted">{analysis.date}</span>
              </div>

              {/* Strengths + Weaknesses */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Strengths */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ThumbsUp className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-medium text-success uppercase tracking-wider">
                      Strengths
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.good.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ThumbsDown className="w-3.5 h-3.5 text-danger" />
                    <span className="text-xs font-medium text-danger uppercase tracking-wider">
                      Improve
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.bad.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-danger"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                  Suggestions
                </span>
              </div>
              <ul className="space-y-1">
                {analysis.suggestions.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Summary */}
            <div className="bg-background rounded-lg p-3 border border-panel-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  Summary
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {analysis.summary}
              </p>
            </div>
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
