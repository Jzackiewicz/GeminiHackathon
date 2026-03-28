import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, FileText, Mic, Lightbulb, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/api";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JobActions({ slug, offer }) {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    if (slug) {
      api.listInterviews().then((all) => {
        setInterviews(all.filter((iv) => iv.job_slug === slug));
      }).catch(() => {});
    }
  }, [slug]);

  // CV generation state
  const [cvDialogOpen, setCvDialogOpen] = useState(false);
  const [cvGenerating, setCvGenerating] = useState(false);
  const [cvResult, setCvResult] = useState(null);
  const [cvError, setCvError] = useState("");
  const [cvElapsed, setCvElapsed] = useState(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(pollRef.current);
    };
  }, []);

  async function handleGenerateCV() {
    setCvDialogOpen(true);
    setCvGenerating(true);
    setCvResult(null);
    setCvError("");
    setCvElapsed(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setCvElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const params = {};
      if (offer) {
        params.job_title = offer.title;
        params.company = offer.company;
        params.requirements = Array.isArray(offer.requirements)
          ? offer.requirements.join("\n")
          : offer.requirements;
      }
      const resp = await api.generateCV(params);
      if (resp.error) {
        setCvError(resp.error);
        setCvGenerating(false);
        clearInterval(timerRef.current);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.cvStatus(resp.job_id);
          if (status.status === "done") {
            setCvResult({ html: status.html, screenshotUrl: status.screenshotUrl, elapsed: status.elapsed });
            setCvGenerating(false);
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          } else if (status.status === "error") {
            setCvError(status.error || "Generation failed");
            setCvGenerating(false);
            clearInterval(pollRef.current);
            clearInterval(timerRef.current);
          }
        } catch (err) {
          setCvError(err.message);
          setCvGenerating(false);
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
        }
      }, 3000);
    } catch (err) {
      setCvError(err.message);
      setCvGenerating(false);
      clearInterval(timerRef.current);
    }
  }

  function downloadCV() {
    if (!cvResult?.html) return;
    const blob = new Blob([cvResult.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function openCVInNewTab() {
    if (!cvResult?.html) return;
    const win = window.open("", "_blank");
    win.document.write(cvResult.html);
    win.document.close();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {offer?.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-full hover:bg-primary-container hover:shadow-ambient hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span className="truncate">Apply</span>
            </a>
          )}
          <button
            onClick={handleGenerateCV}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm font-semibold rounded-full border border-outline-variant/20 hover:bg-surface-container-low hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Generate CV</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-surface-container-high" />

        {/* Start Interview */}
        <button
          onClick={() => navigate("/interview", {
            state: {
              job: {
                slug,
                title: offer?.title,
                company: offer?.company,
                requirements: offer?.requirements,
                tags: offer?.requirements,
                url: offer?.url,
              },
            },
          })}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-on-primary text-sm font-semibold rounded-full hover:bg-primary-container hover:shadow-ambient hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Mic className="w-4 h-4 shrink-0" />
          Start Interview Simulation
        </button>

        {/* Interview History for this job */}
        {interviews.length > 0 && (
          <>
            <div className="h-px bg-surface-container-high" />
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Interview History ({interviews.length})
              </p>
              <div className="space-y-2">
                {interviews.map((iv) => (
                  <div
                    key={iv.id}
                    onClick={() => navigate("/interview/summary", { state: { interviewId: iv.id } })}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-on-surface font-semibold truncate">{iv.mode || "Interview"}</p>
                      {iv.created_at && (
                        <p className="text-[10px] text-on-surface-variant">{formatDate(iv.created_at)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {iv.score != null && (
                        <span className={`text-xs font-bold ${iv.score >= 7 ? "text-on-tertiary-container" : iv.score >= 5 ? "text-warning" : "text-error"}`}>
                          {iv.score}/10
                        </span>
                      )}
                      {iv.review ? (
                        <Badge variant="success" className="text-[10px]">Reviewed</Badge>
                      ) : iv.transcript?.length > 0 ? (
                        <Badge variant="secondary" className="text-[10px] bg-warning-light text-amber-700">Completed</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Started</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* CV Generation Dialog */}
      <Dialog open={cvDialogOpen} onOpenChange={setCvDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>CV Generation</DialogTitle>
            <DialogDescription>
              {cvGenerating
                ? "Generating your CV with Google Stitch. This typically takes 90-120 seconds."
                : cvResult
                ? `CV generated in ${cvResult.elapsed}s`
                : cvError
                ? "Generation failed"
                : "Preparing..."}
            </DialogDescription>
          </DialogHeader>

          {cvGenerating && (
            <div className="flex flex-col items-center gap-3 py-6">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-2xl font-mono text-on-surface">{cvElapsed}s</p>
            </div>
          )}

          {cvError && (
            <p className="text-sm text-error text-center py-4">{cvError}</p>
          )}

          {cvResult && (
            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden" style={{ height: "300px" }}>
                <iframe
                  srcDoc={cvResult.html}
                  title="CV Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadCV}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded-full hover:bg-primary-container transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </button>
                <button
                  onClick={openCVInNewTab}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-lowest text-on-surface text-sm font-semibold rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Full View
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
