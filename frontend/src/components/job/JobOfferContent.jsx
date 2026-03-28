import { MapPin, DollarSign, Calendar, Building2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function JobOfferContent({ offer }) {
  if (!offer) return null;

  const tags = offer.tags || [];

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-on-surface font-headline tracking-tight break-words leading-tight">{offer.title}</h1>
              {offer.company && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Building2 className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  <span className="text-sm text-on-surface-variant">{offer.company}</span>
                </div>
              )}
            </div>
            {offer.url && (
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline mt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View listing
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
            {offer.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {offer.location}
              </span>
            )}
            {offer.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                {offer.salary}
              </span>
            )}
            {offer.postedDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Posted {new Date(offer.postedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* HTML body from JJIT */}
        {offer.bodyHtml && (
          <Section title="About the Role">
            <div
              className="text-sm text-on-surface leading-relaxed prose prose-sm max-w-none break-words overflow-hidden [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:overflow-x-auto [&_a]:break-all"
              dangerouslySetInnerHTML={{ __html: offer.bodyHtml }}
            />
          </Section>
        )}

        {/* Plain text description fallback */}
        {!offer.bodyHtml && offer.description && (
          <Section title="About the Role">
            <p className="text-sm text-on-surface leading-relaxed">{offer.description}</p>
          </Section>
        )}

        {/* Requirements */}
        {offer.requirements && offer.requirements.length > 0 && !offer.bodyHtml && (
          <Section title="Requirements">
            <ul className="space-y-1.5">
              {offer.requirements.map((req, i) => (
                <li
                  key={i}
                  className="text-sm text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-outline-variant"
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
                  className="text-sm text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-outline-variant"
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
                  className="text-sm text-on-surface leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-tertiary-fixed-dim"
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
