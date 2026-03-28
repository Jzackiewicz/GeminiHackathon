import { MapPin, DollarSign, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function JobOfferContent({ offer }) {
  if (!offer) return null;

  return (
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardContent className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-5">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-lg font-semibold text-[#1A1A1A]">{offer.title}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5 text-muted" />
                <span className="text-sm text-muted">{offer.company}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {offer.location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {offer.salary}
            </span>
            {offer.postedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Posted {new Date(offer.postedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {offer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Description */}
        {offer.description && (
          <Section title="About the Role">
            <p className="text-sm text-[#1A1A1A] leading-relaxed">{offer.description}</p>
          </Section>
        )}

        {/* Requirements */}
        {offer.requirements && (
          <Section title="Requirements">
            <ul className="space-y-1.5">
              {offer.requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#D1D5DB]"
                >
                  {req}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Responsibilities */}
        {offer.responsibilities && (
          <Section title="Responsibilities">
            <ul className="space-y-1.5">
              {offer.responsibilities.map((resp, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#D1D5DB]"
                >
                  {resp}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Benefits */}
        {offer.benefits && (
          <Section title="Benefits">
            <ul className="space-y-1.5">
              {offer.benefits.map((ben, i) => (
                <li
                  key={i}
                  className="text-sm text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-success"
                >
                  {ben}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}
