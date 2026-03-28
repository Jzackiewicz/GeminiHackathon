import { useState, useEffect, useRef } from "react";
import { Target, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import JobOfferCard from "./JobOfferCard";
import { api } from "@/api";

export default function JobOffers() {
  const [offers, setOffers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    loadScored();
    return () => clearInterval(pollRef.current);
  }, []);

  async function loadScored() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getScoredJobs({ limit: 20 });
      setOffers(data);
    } catch (err) {
      // 409 means profile not ready
      if (err.message.includes("Profile not ready") || err.message.includes("409")) {
        setOffers([]);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchAndScore() {
    setFetching(true);
    setError("");
    try {
      await api.fetchJobs();
      // Poll until fetch completes
      pollRef.current = setInterval(async () => {
        try {
          const status = await api.fetchJobsStatus();
          if (status.status === "done" || status.status === "idle") {
            clearInterval(pollRef.current);
            await loadScored();
            setFetching(false);
          }
        } catch {
          clearInterval(pollRef.current);
          setFetching(false);
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
      setFetching(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-success" />
          Job Offers
        </h2>
        <div className="flex items-center gap-2">
          {offers && offers.length > 0 && (
            <span className="text-xs text-muted">
              {offers.length} matches
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAndScore}
            disabled={fetching}
            className="h-7 px-2 text-xs text-muted hover:text-foreground"
          >
            {fetching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2 px-1">{error}</p>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : fetching ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Fetching jobs...
        </div>
      ) : offers && offers.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {offers.map((scored) => (
            <JobOfferCard key={scored.offer.slug} scored={scored} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm gap-3 py-8">
          <Target className="w-8 h-8 text-muted/40" />
          <p className="text-center">No scored jobs yet. Connect your GitHub profile, then fetch jobs to see matches.</p>
          <Button variant="outline" size="sm" onClick={fetchAndScore} disabled={fetching}>
            Fetch Jobs
          </Button>
        </div>
      )}
    </div>
  );
}
