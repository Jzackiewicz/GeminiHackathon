import { Sparkles } from "lucide-react";
import ROIActionCard from "./ROIActionCard";
import { mockROIActions } from "@/data/mockData";

export default function ROIActions() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Suggestions
        </h2>
        <span className="text-xs text-muted">
          {mockROIActions.length} actions
        </span>
      </div>

      <div className="relative">
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <div className="grid grid-rows-2 grid-flow-col gap-3 w-max">
            {mockROIActions.map((action) => (
              <ROIActionCard key={action.id} action={action} />
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
