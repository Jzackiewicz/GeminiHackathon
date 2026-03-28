import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    api.listInterviews().then(setInterviews).catch(() => {});
    api.getSelectedJob().then((r) => setSelectedJob(r.job)).catch(() => {});
  }, []);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      {/* Two-column layout — each column manages its own vertical split */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-y-auto lg:overflow-hidden">
        {/* Left column: ~40% width */}
        <div className="w-full lg:w-[40%] shrink-0 flex flex-col gap-4 min-h-0">
          {/* Job Offer (left) + Tips (right) side by side */}
          <Card className="border-panel-border shadow-card shrink-0">
            <CardContent className="p-5 flex gap-5">
              <div className="flex-1 min-w-0">
                <JobOfferSummary offer={selectedJob} />
              </div>
              <div className="border-l border-panel-border pl-5 flex-1 min-w-0">
                <PreInterviewTips tips={mockPreInterviewTips} />
              </div>
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
            <InterviewAnalysis />
          </div>

          {/* History (compact — ~40%) */}
          <div className="flex-[2] min-h-0">
            <InterviewHistory history={interviews} />
          </div>
        </div>
      </div>
    </div>
  );
}
