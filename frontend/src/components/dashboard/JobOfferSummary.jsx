import { Briefcase, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function JobOfferSummary({ offer }) {
  if (!offer) return null;

  const scoreColor =
    offer.matchScore >= 80
      ? "text-emerald-600 bg-emerald-50"
      : offer.matchScore >= 60
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
          Job Offer
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-sm font-semibold text-[#1A1A1A] hover:text-accent transition-colors text-left cursor-pointer underline decoration-dotted underline-offset-2">
                {offer.title}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-white border-panel-border shadow-card-hover" align="start">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-[#1A1A1A]">{offer.title}</h4>
                  <p className="text-xs text-muted mt-0.5">{offer.company}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {offer.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {offer.salary}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor}`}>
                    {offer.matchScore}% match
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {offer.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${scoreColor}`}>
            {offer.matchScore}%
          </span>
        </div>

        <p className="text-xs text-muted">
          {offer.company} · {offer.location}
        </p>

        <div className="flex flex-wrap gap-1">
          {offer.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
