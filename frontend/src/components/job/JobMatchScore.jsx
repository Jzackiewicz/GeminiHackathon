import { Target, Check, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreRing from "@/components/dashboard/ScoreRing";

const statusConfig = {
  match: {
    icon: Check,
    color: "text-on-tertiary-container",
    bg: "bg-tertiary-fixed-dim/20",
    label: "Match",
  },
  partial: {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-warning-light",
    label: "Partial",
  },
  missing: {
    icon: X,
    color: "text-error",
    bg: "bg-error-container",
    label: "Missing",
  },
};

export default function JobMatchScore({ match }) {
  if (!match) return null;

  const matched = match.skills.filter((s) => s.status === "match").length;
  const total = match.skills.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Target className="w-4 h-4 text-on-tertiary-container" />
          Your Match
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-5">
          {/* Score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <ScoreRing score={match.overall} size={100} />
            <span className="text-[10px] text-on-surface-variant font-medium">
              {matched}/{total} skills
            </span>
          </div>

          {/* Skill breakdown */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {match.skills.map((skill) => {
              const config = statusConfig[skill.status];
              const Icon = config.icon;
              return (
                <div
                  key={skill.name}
                  className="flex items-center gap-2"
                >
                  <div className={`shrink-0 w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-on-surface truncate">{skill.name}</span>
                  <span className={`text-[10px] font-bold shrink-0 ${config.color}`}>{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
