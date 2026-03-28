import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopBar from "./TopBar";
import ProfileSummary from "./ProfileSummary";
import AddDataSource from "./AddDataSource";
import JobApplications from "./JobApplications";
import ROIActions from "./ROIActions";
import JobOffers from "./JobOffers";

export default function DashboardLayout({ user, profile, onUpdateProfile, onLogout }) {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={onLogout} />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left + Center content (scrollable) */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-5">
          {/* Top: Profile + ROI side by side */}
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[340px] shrink-0 space-y-3">
              <ProfileSummary profile={profile} onUpdate={onUpdateProfile} />
              <AddDataSource />
            </div>
            <div className="flex-1 min-w-0">
              <ROIActions />
            </div>
          </div>

          {/* Applications */}
          <JobApplications />

          {/* AI trigger button */}
          <div>
            <Button
              className="w-full bg-accent hover:bg-accent-dark text-white shadow-glow hover:shadow-lg transition-all duration-200 cursor-pointer h-11"
              size="lg"
            >
              <MessageSquare className="w-4 h-4" />
              Ask AI for advice
            </Button>
          </div>
        </div>

        {/* Right: Job Offers (fixed column, own scroll) */}
        <div className="hidden lg:block w-[300px] shrink-0 border-l border-[#E8E8E3] p-4 lg:p-6 overflow-y-auto custom-scrollbar">
          <JobOffers />
        </div>
      </div>

      {/* Mobile job offers */}
      <div className="lg:hidden p-4">
        <JobOffers />
      </div>
    </div>
  );
}
