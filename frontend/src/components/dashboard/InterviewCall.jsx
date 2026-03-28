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
    <Card className="border-panel-border shadow-card h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {interview ? (
          <>
            {/* Active call area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1A1A1A] rounded-t-xl p-8 min-h-[300px]">
              {/* Animated rings */}
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-accent/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-accent flex items-center justify-center">
                  <Mic className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-white font-semibold text-lg">Interview in progress</p>
              <p className="text-white/50 text-sm mt-1">
                Interview #{interview.id}
              </p>
              <div id="vapi-container" className="mt-4 w-full" />
            </div>

            {/* Call controls */}
            <div className="flex items-center justify-center gap-4 p-4 bg-[#111118] rounded-b-xl">
              <button
                onClick={() => setMuted(!muted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  muted
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={endInterview}
                className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer shadow-lg"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          /* Pre-call state */
          <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
            <div className="w-20 h-20 rounded-full bg-background border-2 border-dashed border-[#E8E8E3] flex items-center justify-center mb-6">
              <Phone className="w-8 h-8 text-muted" />
            </div>
            <p className="text-sm font-semibold mb-1">Ready to start</p>
            <p className="text-xs text-muted text-center max-w-[250px] mb-6">
              Configure your settings, then call AI to start the mock interview
            </p>
            <button
              onClick={startInterview}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-full hover:bg-[#2A2A2A] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50"
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
