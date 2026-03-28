import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import ProfileSummary from "../components/dashboard/ProfileSummary";
import AddDataSource from "../components/dashboard/AddDataSource";
import ROIActions from "../components/dashboard/ROIActions";
import InterviewSettings from "../components/dashboard/InterviewSettings";
import InterviewCall from "../components/dashboard/InterviewCall";
import InterviewScore from "../components/dashboard/InterviewScore";

export default function Interview() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
    api.getProfile().then(setProfile).catch(() => {});
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Main content */}
        <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-5">
          {/* Top row: Profile + AI Suggestions */}
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[340px] shrink-0 space-y-3">
              <ProfileSummary profile={profile} onUpdate={setProfile} />
              <AddDataSource />
            </div>
            <div className="flex-1 min-w-0">
              <ROIActions />
            </div>
          </div>

          {/* Bottom row: Settings + Call Area */}
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[340px] shrink-0">
              <InterviewSettings />
            </div>
            <div className="flex-1 min-w-0">
              <InterviewCall />
            </div>
          </div>
        </div>

        {/* Right sidebar: Score / Results */}
        <div className="hidden lg:block w-[300px] shrink-0 border-l border-[#E8E8E3] p-4 lg:p-6 overflow-y-auto custom-scrollbar">
          <InterviewScore />
        </div>
      </div>

      {/* Mobile score */}
      <div className="lg:hidden p-4">
        <InterviewScore />
      </div>
    </div>
  );
}
