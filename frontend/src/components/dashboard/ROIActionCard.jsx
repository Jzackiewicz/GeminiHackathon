import {
  BookOpen,
  Code,
  Eye,
  TrendingUp,
  GitBranch,
  Users,
  MessageSquare,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeConfig = {
  skill_up: { label: "Skill Up", icon: BookOpen },
  visibility: { label: "Visibility", icon: Eye },
  project: { label: "Project", icon: Code },
  networking: { label: "Networking", icon: Users },
  interview_prep: { label: "Interview Prep", icon: MessageSquare },
  career_move: { label: "Career Move", icon: Briefcase },
  learning: { label: "Learning", icon: GraduationCap },
  open_source: { label: "Open Source", icon: GitBranch },
};

const difficultyStyles = {
  hard: "bg-error-container text-on-error-container",
  medium: "bg-warning-light text-amber-700",
  easy: "bg-tertiary-fixed-dim/20 text-on-tertiary-container",
};

export default function ROIActionCard({ action }) {
  const config = typeConfig[action.type] || { label: action.type, icon: TrendingUp };
  const Icon = config.icon;
  const difficulty = action.difficulty || "medium";

  return (
    <Card className="hover:-translate-y-1 transition-all duration-200">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center">
            <Icon className="w-5 h-5 text-on-secondary-container" />
          </div>
          <div className="flex gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] font-semibold"
            >
              {config.label}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[10px] font-semibold ${difficultyStyles[difficulty] || ""}`}
            >
              {difficulty}
            </Badge>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-on-surface leading-snug">{action.title}</h3>
          <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
            {action.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
