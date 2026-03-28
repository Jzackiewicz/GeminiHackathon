import { Lightbulb } from "lucide-react";

export default function PreInterviewTips({ tips }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider">
          Pre-Interview Tips
        </h3>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li
            key={i}
            className="text-xs text-[#1A1A1A] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-400"
          >
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
