import TopBar from "./TopBar";
import ProfileSummary from "./ProfileSummary";
import AddDataSource from "./AddDataSource";
import ROIActions from "./ROIActions";
import JobOffers from "./JobOffers";

export default function DashboardLayout({ user, profile, scanning, onUpdateProfile, onLogout }) {
  return (
    <div className="min-h-screen bg-surface">
      <TopBar user={user} onLogout={onLogout} />

      <div className="pt-16">
        {/* Hero / Profile Section */}
        <section className="bg-surface-container-low">
          <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 min-w-0">
                <ProfileSummary profile={profile} scanning={scanning} onUpdate={onUpdateProfile} />
              </div>
              {!scanning && (
                <div className="w-full lg:w-auto shrink-0">
                  <AddDataSource profile={profile} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Suggestions */}
        <section className="bg-surface">
          <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
            <ROIActions />
          </div>
        </section>

        {/* Job Matches */}
        <section className="bg-surface-container-low">
          <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
            <JobOffers />
          </div>
        </section>
      </div>
    </div>
  );
}
