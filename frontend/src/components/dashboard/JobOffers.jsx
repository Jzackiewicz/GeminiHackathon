import { useState, useEffect, useRef } from "react";
import { Target, RefreshCw, Loader2, ArrowRight } from "lucide-react";
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
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-2">
            Discover Your Perfect Match
          </h2>
          <p className="text-on-surface-variant text-base max-w-lg">
            Openings where your skills exceed the benchmark.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAndScore}
          disabled={fetching}
          className="text-on-surface-variant hover:text-on-surface shrink-0"
        >
          {fetching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-xs text-error mb-4">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center text-on-surface-variant text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : fetching ? (
        <div className="flex items-center justify-center text-on-surface-variant text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Fetching jobs...
        </div>
      ) : offers && offers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {offers.slice(0, 6).map((scored) => (
            <JobOfferCard key={scored.offer.slug} scored={scored} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest shadow-card flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-outline-variant" />
          </div>
          <p className="text-sm font-semibold text-on-surface mb-1">No matches yet</p>
          <p className="text-xs text-on-surface-variant text-center max-w-[220px] mb-4">Connect your GitHub profile, then fetch jobs to see scored matches</p>
          <Button variant="outline" size="sm" onClick={fetchAndScore} disabled={fetching} className="shadow-card">
            Fetch Jobs
          </Button>
        </div>
      )}
    </div>
  );
}
