import { useState } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/api";

export default function InterviewCall() {
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);

  async function startInterview() {
    setLoading(true);
    try {
      const data = await api.startInterview();
      setInterview(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function endInterview() {
    setInterview(null);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {interview ? (
          <>
            {/* Active call area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-primary-container rounded-t-xl p-8 min-h-[300px]">
              {/* Animated rings */}
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-tertiary-fixed-dim/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-tertiary-fixed-dim/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-tertiary-fixed-dim flex items-center justify-center">
                  <Mic className="w-8 h-8 text-on-tertiary-fixed" />
                </div>
              </div>
              <p className="text-on-primary font-bold text-lg font-headline">Interview in progress</p>
              <p className="text-on-primary-container text-sm mt-1">
                Interview #{interview.id}
              </p>
              <div id="vapi-container" className="mt-4 w-full" />
            </div>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-4 p-4 bg-primary rounded-b-xl">
              <button
                onClick={() => setMuted(!muted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  muted
                    ? "bg-error/20 text-error hover:bg-error/30"
                    : "bg-on-primary/10 text-on-primary hover:bg-on-primary/20"
                }`}
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={endInterview}
                className="w-14 h-14 rounded-full bg-error text-on-error flex items-center justify-center hover:bg-red-700 transition-all cursor-pointer shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          /* Pre-call state */
          <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
            <div className="w-20 h-20 rounded-full bg-surface-container-low border-2 border-dashed border-outline-variant/30 flex items-center justify-center mb-6">
              <Phone className="w-8 h-8 text-on-surface-variant" />
            </div>
            <p className="text-sm font-bold text-on-surface mb-1">Ready to start</p>
            <p className="text-xs text-on-surface-variant text-center max-w-[250px] mb-6">
              Configure your settings, then call AI to start the mock interview
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary text-sm font-semibold rounded-full hover:bg-primary-container hover:shadow-ambient hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <Phone className="w-4 h-4" />
              {loading ? "Connecting..." : "Start Interview"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
