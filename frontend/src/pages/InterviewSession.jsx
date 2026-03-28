import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import TopBar from "../components/dashboard/TopBar";
import { Mic, MicOff, Send } from "lucide-react";

const mockMessages = [
  {
    id: 1,
    role: "ai",
    text: "Hello! I'm ready to start your mock interview. Let's begin. Can you tell me a little bit about yourself and your background?",
  },
];

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
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

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

  function logout() {
    clearToken();
    navigate("/login");
  }

  function handleSend() {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Mock AI response after a short delay
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "ai",
          text: "That sounds great. Can you elaborate more on your previous experience?",
        },
      ]);
    }, 1200);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleVoice() {
    setVoiceActive((prev) => !prev);
    // Mocked — future VAPI integration
  }

  function handleEndInterview() {
    navigate("/interview");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar user={user} onLogout={logout} />

      {/* Chat area — fills remaining space, full width */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Session header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-panel-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Interview Session</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-muted">
                ID: #4 – In progress
              </span>
            </div>
          </div>
          <button
            onClick={handleEndInterview}
            className="px-4 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
          >
            End Interview
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 space-y-4">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice agent active indicator */}
        {voiceActive && (
          <div className="shrink-0 flex flex-col items-center gap-3 py-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="absolute inset-0 rounded-full bg-[#1A1A1A]/20 animate-ping" />
            </div>
            <p className="text-xs text-muted">Listening... speak now or tap to stop</p>
            <button
              onClick={handleVoice}
              className="px-4 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
            >
              <MicOff className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Stop Voice
            </button>
          </div>
        )}

        {/* Input area — constrained width, centered */}
        <div className="shrink-0 px-6 pb-6 pt-2 max-w-3xl w-full mx-auto">
          <div className="flex items-center gap-2 bg-white border border-panel-border rounded-2xl px-4 py-2 shadow-card focus-within:ring-2 focus-within:ring-[#1A1A1A]/20 focus-within:border-[#1A1A1A] transition">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 text-sm bg-transparent border-none outline-none resize-none max-h-32 py-1.5"
            />
            {hasText ? (
              <button
                onClick={handleSend}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 -ml-[1px]" />
              </button>
            ) : (
              <button
                onClick={handleVoice}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-[#1A1A1A] hover:bg-[#EAEAE5] transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
