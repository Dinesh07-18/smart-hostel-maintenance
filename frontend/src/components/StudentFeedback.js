"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, logout } from "@/lib/api";

export default function StudentFeedback({ complaints = [] }) {
  const [feedback, setFeedback] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { response, result } = await apiRequest("/feedback");
      if (response.status === 401) { logout(); return; }
      if (response.ok && result.success) setFeedback(result.data || []);
    } catch (error) {
      console.error("Feedback history could not be loaded:", error);
    }
  }, []);

  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const submitted = new Set(feedback.map((item) => Number(item.complaint_id)));
  const eligible = complaints.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status) && !submitted.has(Number(item.complaint_id)));

  async function submit(complaintId) {
    setBusyId(complaintId);
    setMessage("");
    try {
      const { response, result } = await apiRequest("/feedback", {
        method: "POST",
        body: JSON.stringify({ complaint_id: complaintId, rating: Number(ratings[complaintId] || 5), comments: comments[complaintId] || "" }),
      });
      if (response.status === 401) { logout(); return; }
      if (!response.ok || !result.success) throw new Error(result.message || "Feedback submission failed.");
      setMessage(`Feedback submitted for complaint #${complaintId}.`);
      await load();
    } catch (error) {
      setMessage(error.message || "Unable to submit feedback.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-bold text-slate-900">Feedback</h2>
      <p className="mt-1 text-sm text-slate-500">Rate completed complaints. Feedback is available only after resolution.</p>
      {message && <p className="mt-3 text-sm text-blue-700" role="status">{message}</p>}
      {eligible.length === 0 ? <p className="mt-4 text-sm text-slate-500">No completed complaints are waiting for feedback.</p> : <div className="mt-4 space-y-4">{eligible.map((item) => (
        <div key={item.complaint_id} className="rounded-xl border border-slate-200 p-4">
          <p className="font-semibold text-slate-800">#{item.complaint_id} · {item.title}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr_auto]">
            <select aria-label={`Rating for complaint ${item.complaint_id}`} value={ratings[item.complaint_id] || "5"} onChange={(event) => setRatings((old) => ({ ...old, [item.complaint_id]: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</select>
            <input value={comments[item.complaint_id] || ""} maxLength={5000} onChange={(event) => setComments((old) => ({ ...old, [item.complaint_id]: event.target.value }))} placeholder="Optional comments" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={() => submit(item.complaint_id)} disabled={busyId === item.complaint_id} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busyId === item.complaint_id ? "Submitting…" : "Submit rating"}</button>
          </div>
        </div>
      ))}</div>}
      {feedback.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-700">Submitted feedback</h3><ul className="mt-2 space-y-2">{feedback.map((item) => <li key={item.feedback_id} className="text-sm text-slate-600">Complaint #{item.complaint_id}: {item.rating}/5{item.comments ? ` — ${item.comments}` : ""}</li>)}</ul></div>}
    </section>
  );
}
