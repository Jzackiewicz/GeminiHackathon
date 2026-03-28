import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import { Mic, MicOff, Send } from "lucide-react";

function ChatBubble({ message }) {
  const isAi = message.role === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isAi
            ? "bg-white border border-panel-border text-[#1A1A1A] rounded-tl-md"
            : "bg-[#1A1A1A] text-white rounded-tr-md"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

export default function InterviewSession() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [interview, setInterview] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState(null);
  const [ended, setEnded] = useState(false);

  const messagesEndRef = useRef(null);
  const vapiRef = useRef(null);
  const chatHistoryRef = useRef([]);
  const transcriptRef = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();

  const settings = location.state || {};
  const hasText = input.trim().length > 0;

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start interview on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const data = await api.startInterview({
          personality: settings.personality || "Professional",
          interview_type: settings.interview_type || "Technical",
          job_context: settings.job_context || "",
        });
        if (cancelled) return;
        setInterview(data);
        setStatus("ready");

        // Start voice call by default
        await startVoiceCall(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus("error");
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  async function startVoiceCall(data) {
    setStatus("connecting");
    try {
      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(data.public_key);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setVoiceActive(true);
        setStatus("active");
      });
      vapi.on("call-end", () => {
        setVoiceActive(false);
        setSpeaking(false);
      });
      vapi.on("speech-start", () => setSpeaking(true));
      vapi.on("speech-end", () => setSpeaking(false));
      vapi.on("message", (msg) => {
        if (msg.type === "transcript" && msg.transcriptType === "final") {
          const entry = { role: msg.role === "assistant" ? "ai" : "user", text: msg.transcript };
          setMessages((prev) => [...prev, { id: Date.now(), ...entry }]);
          transcriptRef.current.push({ role: msg.role, text: msg.transcript });
        }
      });
      vapi.on("error", (e) => setError(String(e.message || e)));

      vapi.start(data.assistant_id);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  async function switchToTextChat() {
    // Stop voice if active
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setVoiceActive(false);
    setSpeaking(false);
    setStatus("active");

    // Initialize text chat if no messages yet
    if (chatHistoryRef.current.length === 0 && messages.length === 0) {
      chatHistoryRef.current = [{ role: "user", content: "hello" }];
      try {
        const resp = await api.interviewChat(interview.id, chatHistoryRef.current);
        for (const msg of resp.output || []) {
          if (msg.content) {
            chatHistoryRef.current.push({ role: "assistant", content: msg.content });
            const entry = { id: Date.now(), role: "ai", text: msg.content };
            setMessages((prev) => [...prev, entry]);
            transcriptRef.current.push({ role: "assistant", text: msg.content });
          }
        }
      } catch (err) {
        setError(err.message);
      }
    }
  }

  function handleVoice() {
    if (voiceActive) {
      // Switch to text mode
      switchToTextChat();
    } else if (interview && !ended) {
      // Restart voice
      startVoiceCall(interview);
    }
  }

  async function handleSend() {
    if (!input.trim() || !interview) return;
    const msg = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { id: Date.now(), role: "user", text: msg }]);
    transcriptRef.current.push({ role: "user", text: msg });

    if (voiceActive && vapiRef.current) {
      // Inject text into voice call
      vapiRef.current.send({
        type: "add-message",
        message: { role: "user", content: msg },
        triggerResponseEnabled: true,
      });
    } else {
      // Text chat mode
      setSending(true);
      chatHistoryRef.current.push({ role: "user", content: msg });
      try {
        const resp = await api.interviewChat(interview.id, chatHistoryRef.current);
        for (const m of resp.output || []) {
          if (m.content) {
            chatHistoryRef.current.push({ role: "assistant", content: m.content });
            setMessages((prev) => [...prev, { id: Date.now(), role: "ai", text: m.content }]);
            transcriptRef.current.push({ role: "assistant", text: m.content });
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setSending(false);
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleEndInterview() {
    // Stop voice
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setVoiceActive(false);
    setSpeaking(false);
    setEnded(true);

    if (interview && transcriptRef.current.length > 0) {
      try {
        await api.interviewComplete(interview.id, transcriptRef.current);
      } catch (_) {}
    }

    navigate("/interview/summary", {
      state: { interviewId: interview?.id, transcript: transcriptRef.current },
    });
  }

  async function handleReview() {
    if (!interview || transcriptRef.current.length < 2) return;
    setReviewing(true);
    setError("");
    try {
      const resp = await api.interviewReview(interview.id, transcriptRef.current);
      if (resp.error) {
        setError(resp.error);
      } else {
        setReview(resp.review);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  }

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Session header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-panel-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Interview Session</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                status === "active" ? "bg-emerald-500" :
                status === "connecting" || status === "loading" ? "bg-amber-500 animate-pulse" :
                ended ? "bg-gray-400" : "bg-red-500"
              }`} />
              <span className="text-[11px] text-muted">
                {interview ? `ID: #${interview.id}` : ""}
                {status === "loading" && " – Starting..."}
                {status === "connecting" && " – Connecting voice..."}
                {status === "active" && (voiceActive ? " – Voice active" : " – Text chat")}
                {status === "error" && " – Error"}
                {ended && " – Ended"}
              </span>
            </div>
          </div>
          {!ended ? (
            <button
              onClick={handleEndInterview}
              disabled={status === "loading"}
              className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              End Interview
            </button>
          ) : (
            <button
              onClick={() => navigate("/interview")}
              className="px-4 py-1.5 bg-[#1A1A1A] text-white text-xs font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors cursor-pointer"
            >
              Back to Interview
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4">
          {status === "loading" && messages.length === 0 && (
            <div className="flex justify-center py-12">
              <p className="text-sm text-muted">Starting interview...</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {error && (
            <div className="flex justify-center">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Post-session review */}
        {ended && transcriptRef.current.length > 2 && !review && (
          <div className="shrink-0 px-6 pb-4">
            <button
              onClick={handleReview}
              disabled={reviewing}
              className="w-full max-w-3xl mx-auto block py-3 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {reviewing ? "Analyzing with AI..." : "Review Interview Performance"}
            </button>
          </div>
        )}

        {/* Review results */}
        {review && (
          <div className="shrink-0 px-6 pb-6 max-w-3xl mx-auto w-full">
            <div className="border border-purple-200 rounded-xl p-5 bg-purple-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Interview Review</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    review.overall_score >= 7 ? "bg-emerald-100 text-emerald-700" :
                    review.overall_score >= 4 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {review.overall_score}/10
                  </span>
                  {review.hiring_recommendation && (
                    <span className={`px-2 py-1 rounded text-[10px] font-medium uppercase ${
                      review.hiring_recommendation === "strong_hire" ? "bg-emerald-100 text-emerald-700" :
                      review.hiring_recommendation === "hire" ? "bg-blue-100 text-blue-700" :
                      review.hiring_recommendation === "maybe" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {review.hiring_recommendation.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              {review.overall_assessment && (
                <p className="text-xs text-[#1A1A1A] leading-relaxed">{review.overall_assessment}</p>
              )}
              {review.strengths?.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider mb-1">Strengths</p>
                  {review.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-[#1A1A1A] pl-3 py-0.5 border-l-2 border-emerald-300">
                      <span className="font-medium">{s.area}</span> — {s.detail}
                    </p>
                  ))}
                </div>
              )}
              {review.weaknesses?.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-red-500 uppercase tracking-wider mb-1">Areas for Improvement</p>
                  {review.weaknesses.map((w, i) => (
                    <p key={i} className="text-xs text-[#1A1A1A] pl-3 py-0.5 border-l-2 border-red-300">
                      <span className="font-medium">{w.area}</span> — {w.detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice agent active indicator */}
        {voiceActive && !ended && (
          <div className="shrink-0 flex flex-col items-center gap-3 py-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              {speaking && (
                <span className="absolute inset-0 rounded-full bg-[#1A1A1A]/20 animate-ping" />
              )}
            </div>
            <p className="text-xs text-muted">
              {speaking ? "AI is speaking..." : "Listening... speak now or tap to stop"}
            </p>
            <button
              onClick={handleVoice}
              className="px-4 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
            >
              <MicOff className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Switch to Text
            </button>
          </div>
        )}

        {/* Input area */}
        {!ended && status !== "loading" && (
          <div className="shrink-0 px-6 pb-6 pt-2 max-w-3xl w-full mx-auto">
            <div className="flex items-center gap-2 bg-white border border-panel-border rounded-2xl px-4 py-2 shadow-card focus-within:ring-2 focus-within:ring-[#1A1A1A]/20 focus-within:border-[#1A1A1A] transition">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voiceActive ? "Type to inject into call..." : "Type a message..."}
                rows={1}
                disabled={sending}
                className="flex-1 text-sm bg-transparent border-none outline-none resize-none max-h-32 py-1.5 disabled:opacity-50"
              />
              {hasText ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 -ml-[1px]" />
                </button>
              ) : (
                <button
                  onClick={voiceActive ? handleVoice : () => startVoiceCall(interview)}
                  disabled={!interview}
                  className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    voiceActive
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "text-[#1A1A1A] hover:bg-[#EAEAE5]"
                  }`}
                >
                  {voiceActive ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
