import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import JobOfferContent from "../components/job/JobOfferContent";
import JobMatchScore from "../components/job/JobMatchScore";
import JobActions from "../components/job/JobActions";

export default function JobDetail() {
  const { slug } = useParams();
  const [user, setUser] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    api.getJobDetail(slug)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-surface">
        <TopBar user={user} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm pt-16">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading job details...
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="h-screen flex flex-col bg-surface">
        <TopBar user={user} onLogout={logout} />
        <div className="flex-1 flex items-center justify-center pt-16">
          <p className="text-sm text-on-surface-variant">{error || "Job offer not found"}</p>
        </div>
      </div>
    );
  }

  // Map backend OfferDetailOut to what components expect
  const offer = detail.offer;
  const contentOffer = {
    title: offer.title,
    company: offer.company_name,
    location: offer.city,
    salary: offer.salary_display,
    postedDate: offer.published_at,
    tags: offer.required_skills || [],
    description: null, // body_html used instead
    bodyHtml: detail.body_html,
    requirements: offer.required_skills,
    url: offer.url,
  };

  // Map score data for JobMatchScore
  const scoreData = detail.score;
  const matchData = scoreData ? {
    overall: scoreData.overall_score,
    skills: [
      ...(scoreData.skill_match?.matched || []).map((s) => ({ name: s, status: "match", note: "" })),
      ...(scoreData.skill_match?.bonus || []).map((s) => ({ name: s, status: "partial", note: "Bonus skill" })),
      ...(scoreData.skill_match?.missing || []).map((s) => ({ name: s, status: "missing", note: "" })),
    ],
  } : null;

  return (
    <div className="h-screen flex flex-col bg-surface">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden pt-16 bg-surface-container-low">
        {/* Left: Job Offer Content — scrolls independently */}
        <div className="w-full lg:w-[58%] shrink-0 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 lg:pr-3">
          <JobOfferContent offer={contentOffer} />
        </div>

        {/* Right: Score + Actions — scrolls independently */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 lg:pl-0 space-y-4">
          <JobMatchScore match={matchData} />
          <JobActions slug={slug} offer={contentOffer} />
        </div>
      </div>
    </div>
  );
}
