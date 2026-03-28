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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          AI Suggestions
        </h2>
        <div className="flex items-center gap-2">
          {suggestions && (
            <span className="text-xs text-muted">
              {suggestions.length} actions
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerate}
            disabled={generating}
            className="h-7 px-2 text-xs text-muted hover:text-foreground"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {suggestions ? "Regenerate" : "Generate"}
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
      ) : generating ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Generating suggestions...
        </div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-min">
          {suggestions.map((action, i) => (
            <ROIActionCard key={i} action={action} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted text-sm gap-3 py-8">
          <Sparkles className="w-8 h-8 text-muted/40" />
          <p>No suggestions yet. Connect your GitHub profile, then generate personalized career advice.</p>
          <Button variant="outline" size="sm" onClick={regenerate} disabled={generating}>
            Generate Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}
