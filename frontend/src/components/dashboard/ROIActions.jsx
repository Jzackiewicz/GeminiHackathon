import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ROIActionCard from "./ROIActionCard";
import { api } from "@/api";

export default function ROIActions() {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCareerSuggestions()
      .then((r) => setSuggestions(r.suggestions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function regenerate() {
    setGenerating(true);
    setError("");
    try {
      const r = await api.generateCareerSuggestions();
      setSuggestions(r.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight mb-2">
            AI Suggestions for Growth
          </h2>
          <p className="text-on-surface-variant text-base max-w-lg">
            Actionable insights generated from your unique professional profile.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={regenerate}
          disabled={generating}
          className="text-on-surface-variant hover:text-on-surface shrink-0"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {suggestions ? "Regenerate" : "Generate"}
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
      ) : generating ? (
        <div className="flex items-center justify-center text-on-surface-variant text-sm py-16">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Generating suggestions...
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suggestions.slice(0, 6).map((action, i) => (
            <ROIActionCard key={i} action={action} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest shadow-card flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-outline-variant" />
          </div>
          <p className="text-sm font-semibold text-on-surface mb-1">No suggestions yet</p>
          <p className="text-xs text-on-surface-variant text-center max-w-[260px] mb-4">Connect your GitHub profile, then generate personalized career advice</p>
          <Button variant="outline" size="sm" onClick={regenerate} disabled={generating} className="shadow-card">
            Generate Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}
