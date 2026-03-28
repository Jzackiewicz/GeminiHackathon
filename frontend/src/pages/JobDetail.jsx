import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import JobOfferContent from "../components/job/JobOfferContent";
import JobMatchScore from "../components/job/JobMatchScore";
import JobActions from "../components/job/JobActions";
import { mockJobOffers, mockSkillMatch } from "@/data/mockData";

export default function JobDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const jobId = Number(id);
  const offer = mockJobOffers.find((j) => j.id === jobId);
  const skillMatch = mockSkillMatch[jobId];

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  if (!offer) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <TopBar user={user} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">Job offer not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      {/* Two-column layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
        {/* Left: Job Offer Content (~55%) */}
        <div className="w-full lg:w-[55%] shrink-0 min-h-0">
          <JobOfferContent offer={offer} />
        </div>

        {/* Right: Score + Actions (~45%) */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
          {/* Match Score */}
          <div className="shrink-0">
            <JobMatchScore match={skillMatch} />
          </div>

          {/* Actions (takes remaining space) */}
          <div className="flex-1 min-h-0">
            <JobActions jobId={jobId} offer={offer} />
          </div>
        </div>
      </div>
    </div>
  );
}
