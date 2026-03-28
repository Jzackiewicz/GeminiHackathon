import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import PreInterviewTips from "../components/dashboard/PreInterviewTips";
import JobOfferSummary from "../components/dashboard/JobOfferSummary";
import InterviewSettings from "../components/dashboard/InterviewSettings";
import InterviewAnalysis from "../components/dashboard/InterviewAnalysis";
import InterviewHistory from "../components/dashboard/InterviewHistory";
import { Card, CardContent } from "@/components/ui/card";
import { mockPreInterviewTips } from "@/data/mockData";

export default function Interview() {
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Job passed from job detail page
  const navJob = location.state?.job;

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    api.listInterviews().then(setInterviews).catch(() => {});
    if (navJob) {
      setSelectedJob(navJob);
    } else {
      api.getSelectedJob().then((r) => setSelectedJob(r.job)).catch(() => {});
    }
  }, []);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      <TopBar user={user} onLogout={logout} />

      {/* Two-column layout — each column manages its own vertical split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 px-4 pb-4 lg:px-6 lg:pb-6 pt-20 overflow-y-auto lg:overflow-hidden bg-surface-container-low">
        {/* Left column: ~40% width */}
        <div className="w-full lg:w-[40%] shrink-0 flex flex-col gap-4 min-h-0">
          {/* Job Offer + Tips stacked */}
          <Card className="shrink-0">
            <CardContent className="p-5 space-y-4">
              <JobOfferSummary offer={selectedJob} />
              <div className="h-px bg-surface-container-high" />
              <PreInterviewTips tips={mockPreInterviewTips} />
            </CardContent>
          </Card>

          {/* Interview Settings (takes remaining space — main feature) */}
          <div className="flex-1 min-h-0">
            <InterviewSettings selectedJob={selectedJob} />
          </div>
        </div>

        {/* Right column: ~60% width */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 min-h-0">
          {/* Analysis (takes more height — ~60%) */}
          <div className="flex-[3] min-h-0">
            <InterviewAnalysis
              interview={
                (selectedJob?.slug
                  ? interviews.filter((iv) => iv.job_slug === selectedJob.slug)
                  : interviews
                ).find((iv) => iv.review)
              }
            />
          </div>

          {/* History (compact — ~40%), filtered to current job */}
          <div className="flex-[2] min-h-0">
            <InterviewHistory
              history={
                selectedJob?.slug
                  ? interviews.filter((iv) => iv.job_slug === selectedJob.slug)
                  : interviews
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
