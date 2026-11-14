"use client";

import { useState } from "react";
import { apiRequest, logout } from "@/lib/api";

export default function SemanticComplaintSearch({ title = "Search related complaints" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function search(event) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 3) {
      setMessage("Enter at least 3 characters.");
      setResults([]);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const { response, result } = await apiRequest("/search/complaints", {
        method: "POST",
        body: JSON.stringify({ text: text.slice(0, 5150), limit: 5 }),
      });
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok || !result.success) throw new Error(result.message || "Search is currently unavailable.");
      setResults(Array.isArray(result.data) ? result.data : []);
      setMessage(result.data?.length ? "Related complaints found." : "No related complaints found in your authorized hostel scope.");
    } catch (error) {
      setMessage(error.message || "Unable to search complaints.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">Search by meaning, not only exact keywords. Results are limited by your account permissions.</p>
      </div>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={5150} placeholder="e.g. water leaking from the bathroom ceiling" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button disabled={loading} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Searching…" : "Search"}</button>
      </form>
      {message && <p className="mt-3 text-sm text-slate-600" role="status">{message}</p>}
      {results.length > 0 && <div className="mt-4 space-y-3">{results.map((item) => (
        <article key={item.complaint_id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.title}</h3><span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{Number(item.similarity * 100).toFixed(1)}% match</span></div>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          <p className="mt-2 text-xs text-slate-500">#{item.complaint_id} · {item.hostel_name || "Authorized hostel"} · {item.category_name || "Uncategorized"} · {item.status}</p>
        </article>
      ))}</div>}
    </section>
  );
}
