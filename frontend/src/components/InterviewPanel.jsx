import { useState } from "react";
import { api } from "../api";

export default function InterviewPanel() {
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(false);

  async function startInterview() {
    setLoading(true);
    try {
      const data = await api.startInterview();
      setInterview(data);
      // TODO: init VAPI web call with data.vapi_call_id
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 space-y-4 md:col-span-2">
      <h2 className="text-lg font-semibold">Mock Interview</h2>
      {interview ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Interview #{interview.id} started</p>
          <div id="vapi-container" className="bg-gray-800 rounded-lg p-8 text-center text-gray-500">
            Voice interview will appear here
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4 text-sm">Select a job offer first, then start your mock interview</p>
          <button
            onClick={startInterview}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      )}
    </div>
  );
}
