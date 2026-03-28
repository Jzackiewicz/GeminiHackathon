import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function JobOfferCard({ scored }) {
  const navigate = useNavigate();
  const offer = scored.offer;
  const score = scored.overall_score;

  const scoreColor =
    score >= 85
      ? "text-on-tertiary-container"
      : score >= 70
        ? "text-warning"
        : "text-outline";

  return (
    <Card
      className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
      onClick={() => navigate(`/job/${offer.slug}`)}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center font-headline font-bold text-on-surface-variant shrink-0">
              {(offer.company_name || "?")[0]}
            </div>
            <div className="min-w-0">
              <h3 className="font-headline font-bold text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {offer.title}
              </h3>
              {offer.company_name && (
                <p className="text-sm text-on-surface-variant font-medium mt-0.5">
                  {offer.company_name}
                  {offer.city && <span className="text-outline"> · {offer.city}</span>}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-3">
            <span className={`text-xl font-headline font-extrabold tracking-tighter ${scoreColor}`}>
              {score}%
            </span>
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Match</span>
          </div>
        </div>

        {offer.required_skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {offer.required_skills.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] font-semibold">
                {tag}
              </Badge>
            ))}
            {offer.required_skills.length > 4 && (
              <Badge variant="secondary" className="text-[10px] font-semibold text-outline">
                +{offer.required_skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-surface-container-high">
          {offer.salary_display ? (
            <span className="text-sm font-bold text-on-surface">{offer.salary_display}</span>
          ) : (
            <span />
          )}
          <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">
            View Details →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
