import { Sparkles } from "lucide-react";
import ROIActionCard from "./ROIActionCard";
import { mockROIActions } from "@/data/mockData";

export default function ROIActions() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Suggestions
        </h2>
        <span className="text-xs text-muted">
          {mockROIActions.length} actions
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-min">
        {mockROIActions.map((action) => (
          <ROIActionCard key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}
