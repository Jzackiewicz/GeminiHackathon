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
            ? "bg-surface-container-lowest text-on-surface rounded-tl-none shadow-card"
            : "bg-primary-container text-on-primary rounded-tr-none"
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
          voice: settings.voice || "shimmer",
          job_context: settings.job_context || "",
          job_slug: settings.job_slug || null,
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

    // Carry over voice transcript into text chat history so the LLM has full context
    if (chatHistoryRef.current.length === 0 && transcriptRef.current.length > 0) {
      chatHistoryRef.current = transcriptRef.current.map((entry) => ({
        role: entry.role === "assistant" ? "assistant" : "user",
        content: entry.text,
      }));
    }

    // If no conversation at all, bootstrap with a greeting
    if (chatHistoryRef.current.length === 0) {
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
    <div className="h-screen flex flex-col bg-surface">
      <TopBar user={user} onLogout={logout} />

      <div className="flex-1 min-h-0 flex flex-col pt-16 bg-surface-container-low">
        {/* Session header */}
        <div className="flex items-center justify-between px-6 py-3 bg-surface-container-lowest shadow-card shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-on-surface font-headline tracking-tight">Interview Session</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                status === "active" ? "bg-tertiary-fixed-dim" :
                status === "connecting" || status === "loading" ? "bg-warning animate-pulse" :
                ended ? "bg-outline" : "bg-error"
              }`} />
              <span className="text-[11px] text-on-surface-variant font-medium">
                {interview ? `#${interview.id}` : ""}
                {status === "loading" && " — Starting..."}
                {status === "connecting" && " — Connecting voice..."}
                {status === "active" && (voiceActive ? " — Voice active" : " — Text chat")}
                {status === "error" && " — Error"}
                {ended && " — Ended"}
              </span>
            </div>
          </div>
          {!ended ? (
            <button
              onClick={handleEndInterview}
              disabled={status === "loading"}
              className="px-5 py-2 bg-error text-on-error text-xs font-bold rounded-full hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 hover:shadow-card"
            >
              End Interview
            </button>
          ) : (
            <button
              onClick={() => navigate("/interview")}
              className="px-5 py-2 bg-primary text-on-primary text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer hover:shadow-card"
            >
              Back to Interview
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4 max-w-4xl w-full mx-auto">
          {status === "loading" && messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="w-12 h-12 rounded-full bg-surface-container-lowest shadow-card flex items-center justify-center">
                <Mic className="w-5 h-5 text-on-surface-variant animate-pulse" />
              </div>
              <p className="text-sm text-on-surface-variant font-medium">Starting interview...</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {error && (
            <div className="flex justify-center">
              <div className="bg-error-container rounded-xl px-4 py-2">
                <p className="text-sm text-on-error-container">{error}</p>
              </div>
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
              className="w-full max-w-3xl mx-auto block py-3 bg-primary text-on-primary text-sm font-bold font-headline rounded-full hover:bg-primary-container hover:shadow-ambient transition-all disabled:opacity-50 cursor-pointer"
            >
              {reviewing ? "Analyzing with AI..." : "Review Interview Performance"}
            </button>
          </div>
        )}

        {/* Review results */}
        {review && (
          <div className="shrink-0 px-6 pb-6 max-w-3xl mx-auto w-full">
            <div className="rounded-2xl p-6 bg-surface-container-lowest shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-on-surface font-headline tracking-tight">Interview Review</h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    review.overall_score >= 7 ? "bg-tertiary-fixed-dim/20 text-on-tertiary-container" :
                    review.overall_score >= 4 ? "bg-warning-light text-amber-700" :
                    "bg-error-container text-on-error-container"
                  }`}>
                    {review.overall_score}/10
                  </span>
                  {review.hiring_recommendation && (
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      review.hiring_recommendation === "strong_hire" ? "bg-tertiary-fixed-dim/20 text-on-tertiary-container" :
                      review.hiring_recommendation === "hire" ? "bg-secondary-container text-on-secondary-container" :
                      review.hiring_recommendation === "maybe" ? "bg-warning-light text-amber-700" :
                      "bg-error-container text-on-error-container"
                    }`}>
                      {review.hiring_recommendation.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              {review.overall_assessment && (
                <p className="text-sm text-on-surface-variant leading-relaxed">{review.overall_assessment}</p>
              )}
              {review.strengths?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-wider mb-1.5">Strengths</p>
                  {review.strengths.map((s, i) => (
                    <p key={i} className="text-xs text-on-surface pl-3 py-0.5 border-l-2 border-tertiary-fixed-dim">
                      <span className="font-semibold">{s.area}</span> — {s.detail}
                    </p>
                  ))}
                </div>
              )}
              {review.weaknesses?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-error uppercase tracking-wider mb-1.5">Areas for Improvement</p>
                  {review.weaknesses.map((w, i) => (
                    <p key={i} className="text-xs text-on-surface pl-3 py-0.5 border-l-2 border-error">
                      <span className="font-semibold">{w.area}</span> — {w.detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice agent active indicator */}
        {voiceActive && !ended && (
          <div className="shrink-0 flex flex-col items-center gap-3 py-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary-container flex items-center justify-center shadow-ambient">
                <Mic className="w-7 h-7 text-on-primary" />
              </div>
              {speaking && (
                <span className="absolute inset-0 rounded-full bg-tertiary-fixed-dim/20 animate-ping" />
              )}
            </div>
            <p className="text-sm text-on-surface-variant font-medium">
              {speaking ? "AI is speaking..." : "Listening... speak now"}
            </p>
            <button
              onClick={handleVoice}
              className="px-5 py-2 text-xs font-bold text-error bg-error-container rounded-full hover:bg-error/10 transition-colors cursor-pointer"
            >
              <MicOff className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Switch to Text
            </button>
          </div>
        )}

        {/* Input area */}
        {!ended && status !== "loading" && (
          <div className="shrink-0 px-6 pb-6 pt-2 max-w-3xl w-full mx-auto">
            <div className="flex items-center gap-2 bg-surface-container-lowest rounded-2xl px-4 py-2.5 shadow-card focus-within:shadow-card-hover transition-shadow">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voiceActive ? "Type to inject into call..." : "Type a message..."}
                rows={1}
                disabled={sending}
                className="flex-1 text-sm bg-transparent border-none outline-none resize-none max-h-32 py-1 text-on-surface placeholder:text-outline disabled:opacity-50"
              />
              {hasText ? (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-container transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4 -ml-[1px]" />
                </button>
              ) : (
                <button
                  onClick={voiceActive ? handleVoice : () => startVoiceCall(interview)}
                  disabled={!interview}
                  className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    voiceActive
                      ? "bg-error text-on-error hover:bg-red-700"
                      : "text-on-surface-variant hover:bg-surface-container-high"
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
