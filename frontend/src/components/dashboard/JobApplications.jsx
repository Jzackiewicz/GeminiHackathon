import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockJobApplications, applicationStatuses } from "@/data/mockData";

export default function JobApplications() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-headline text-xl font-extrabold flex items-center gap-2.5 text-on-surface tracking-tight">
          <Briefcase className="w-5 h-5 text-on-surface-variant" />
          Applications
        </h2>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {mockJobApplications.map((app) => {
            const status = applicationStatuses[app.status];
            return (
              <Card
                key={app.id}
                className="w-[calc((100%-72px)/4)] min-w-[180px] shrink-0 hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-sm font-bold text-on-surface-variant font-headline">
                      {app.logo}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-semibold ${status.color}`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {app.title}
                    </p>
                    <p className="text-xs text-on-surface-variant">{app.company}</p>
                  </div>
                  <p className="text-xs text-outline">
                    Applied {app.appliedDate}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-surface-container-low to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
