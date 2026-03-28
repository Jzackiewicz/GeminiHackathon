import { Target, Check, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "@/components/dashboard/ScoreRing";

const statusConfig = {
  match: {
    icon: Check,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    dotColor: "bg-emerald-500",
    label: "Match",
  },
  partial: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    dotColor: "bg-amber-400",
    label: "Partial",
  },
  missing: {
    icon: X,
    color: "text-red-500",
    bg: "bg-red-50",
    dotColor: "bg-red-400",
    label: "Missing",
  },
};

export default function JobMatchScore({ match }) {
  if (!match) return null;

  const matched = match.skills.filter((s) => s.status === "match").length;
  const total = match.skills.length;

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          Your Match
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div className="flex gap-5">
          {/* Score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <ScoreRing score={match.overall} size={100} />
            <span className="text-[10px] text-muted">
              {matched}/{total} skills matched
            </span>
          </div>

          {/* Skill breakdown */}
          <div className="flex-1 min-w-0 space-y-2">
            {match.skills.map((skill) => {
              const config = statusConfig[skill.status];
              const Icon = config.icon;
              return (
                <div
                  key={skill.name}
                  className="flex items-start gap-2.5"
                >
                  <div className={`shrink-0 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center mt-0.5`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#1A1A1A]">{skill.name}</span>
                      <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">{skill.note}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
