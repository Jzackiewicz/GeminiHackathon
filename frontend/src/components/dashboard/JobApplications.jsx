import { Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockJobApplications, applicationStatuses } from "@/data/mockData";

export default function JobApplications() {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted" />
          Applications
        </h2>
      </div>

      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
          {mockJobApplications.map((app) => {
            const status = applicationStatuses[app.status];
            return (
              <Card
                key={app.id}
                className="w-[calc((100%-60px)/4)] min-w-[180px] shrink-0 border-[#E8E8E3] hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-background border border-[#E8E8E3] flex items-center justify-center text-sm font-bold text-muted">
                      {app.logo}
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-medium ${status.color}`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                      {app.title}
                    </p>
                    <p className="text-xs text-muted">{app.company}</p>
                  </div>
                  <p className="text-xs text-muted-light">
                    Applied {app.appliedDate}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
