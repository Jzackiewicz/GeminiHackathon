import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function MatchRing({ score }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 85
      ? "#10B981"
      : score >= 70
        ? "#F59E0B"
        : "#6B7280";

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="#E8E8E3"
          strokeWidth="3"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-xs font-bold"
          style={{ color }}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}

export default function JobOfferCard({ offer }) {
  return (
    <Card className="border-panel-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
      <CardContent className="p-4 flex items-center gap-3">
        <MatchRing score={offer.matchScore} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
            {offer.title}
          </h3>
          <p className="text-xs text-muted font-medium">{offer.company}</p>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-light" />
            <span className="text-[11px] text-muted-light">{offer.location}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {offer.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] font-normal px-1.5 py-0"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
