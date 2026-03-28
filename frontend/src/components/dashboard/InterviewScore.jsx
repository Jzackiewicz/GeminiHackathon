import { Trophy, ThumbsUp, ThumbsDown, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const mockScore = {
  overall: 72,
  good: [
    "Strong understanding of React component lifecycle",
    "Clear communication of system design trade-offs",
    "Good use of technical vocabulary",
  ],
  bad: [
    "Could improve on time complexity analysis",
    "Missed edge case in the coding question",
  ],
  summary:
    "Solid technical interview performance. Demonstrated strong React and frontend knowledge. Could improve on algorithmic thinking and edge case handling. Recommended to practice more LeetCode-style problems before the real interview.",
};

function ScoreRing({ score }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10B981" : score >= 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#E8E8E3" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

export default function InterviewScore() {
  const hasScore = true; // Toggle to false to show empty state

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted" />
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {hasScore ? (
          <>
            <ScoreRing score={mockScore.overall} />

            {/* Good */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsUp className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-success uppercase tracking-wider">
                  Strengths
                </span>
              </div>
              <ul className="space-y-1.5">
                {mockScore.good.map((item, i) => (
                  <li key={i} className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bad */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsDown className="w-3.5 h-3.5 text-danger" />
                <span className="text-xs font-medium text-danger uppercase tracking-wider">
                  Improve
                </span>
              </div>
              <ul className="space-y-1.5">
                {mockScore.bad.map((item, i) => (
                  <li key={i} className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-danger">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Summary */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  Summary
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {mockScore.summary}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-8">
            <Trophy className="w-10 h-10 text-[#E8E8E3] mb-3" />
            <p className="text-sm text-muted text-center">
              Complete an interview to see your score
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
