import {
  BookOpen,
  Code,
  Eye,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const iconMap = {
  BookOpen,
  Code,
  Eye,
  TrendingUp,
  GitBranch,
};

const priorityStyles = {
  high: "bg-danger-light text-red-700",
  medium: "bg-warning-light text-amber-700",
  low: "bg-accent-light text-accent",
};

const typeLabels = {
  "skill-up": "Skill Up",
  project: "Project",
  visibility: "Visibility",
};

export default function ROIActionCard({ action }) {
  const Icon = iconMap[action.icon] || BookOpen;

  return (
    <Card className="w-[280px] border-panel-border shadow-card hover:shadow-card-hover transition-shadow duration-200 cursor-pointer group">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
            <Icon className="w-5 h-5 text-accent group-hover:text-white transition-colors" />
          </div>
          <div className="flex gap-1.5">
            <Badge
              variant="secondary"
              className="text-[10px] font-medium bg-background border-panel-border"
            >
              {typeLabels[action.type]}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-[10px] font-medium ${priorityStyles[action.priority]}`}
            >
              {action.priority}
            </Badge>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold leading-snug">{action.title}</h3>
          <p className="text-xs text-muted mt-1.5 leading-relaxed">
            {action.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
