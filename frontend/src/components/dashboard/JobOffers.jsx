import { Target } from "lucide-react";
import JobOfferCard from "./JobOfferCard";
import { mockJobOffers } from "@/data/mockData";

export default function JobOffers() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-success" />
          Job Offers
        </h2>
        <span className="text-xs text-muted">
          {mockJobOffers.length} matches
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {mockJobOffers.map((offer) => (
          <JobOfferCard key={offer.id} offer={offer} />
        ))}
      </div>
    </div>
  );
}
