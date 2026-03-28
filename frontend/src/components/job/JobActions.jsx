import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Send, FileText, Mic, Lightbulb, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/api";

export default function JobActions({ slug, offer }) {
  const navigate = useNavigate();

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
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          {offer?.url && (
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Apply
            </a>
          )}
          <button
            onClick={handleGenerateCV}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-full border border-panel-border hover:bg-[#EAEAE5] hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Generate CV
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-panel-border" />

        {/* Start Interview */}
        <button
          onClick={() => navigate("/interview/session", {
            state: {
              job_context: [
                offer?.title,
                offer?.company ? `at ${offer.company}` : "",
                offer?.requirements?.length ? `\nSkills: ${offer.requirements.join(", ")}` : "",
              ].filter(Boolean).join(" "),
            },
          })}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          Start Interview Simulation
        </button>
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
              <svg className="animate-spin h-8 w-8 text-[#1A1A1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-2xl font-mono text-[#1A1A1A]">{cvElapsed}s</p>
            </div>
          )}

          {cvError && (
            <p className="text-sm text-red-500 text-center py-4">{cvError}</p>
          )}

          {cvResult && (
            <div className="space-y-4">
              <div className="bg-white border border-panel-border rounded-lg overflow-hidden" style={{ height: "300px" }}>
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download HTML
                </button>
                <button
                  onClick={openCVInNewTab}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-background text-[#1A1A1A] text-sm font-medium rounded-lg border border-panel-border hover:bg-[#EAEAE5] transition-all cursor-pointer"
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
