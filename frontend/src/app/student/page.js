"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, getUser } from "@/lib/api";
import StudentFeedback from "@/components/StudentFeedback";

function statusStyle(status) {
  const styles = {
    SUBMITTED: "bg-amber-50 text-amber-700 ring-amber-200",
    VERIFIED: "bg-sky-50 text-sky-700 ring-sky-200",
    ASSIGNED: "bg-violet-50 text-violet-700 ring-violet-200",
    IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
    RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CLOSED: "bg-slate-100 text-slate-700 ring-slate-200",
    REOPENED: "bg-orange-50 text-orange-700 ring-orange-200",
    REJECTED: "bg-red-50 text-red-700 ring-red-200",
  };

  return styles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function StudentDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [similarComplaints, setSimilarComplaints] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState("");

  const [form, setForm] = useState({
    category_id: "1",
    title: "",
    description: "",
    severity: "MEDIUM",
    urgency: "MEDIUM",
  });

  const loadData = useCallback(async (token) => {
    try {
      setLoading(true);

      const [complaintsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/complaints`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/complaints/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const complaintsResult = await complaintsResponse.json();
      const categoriesResult = await categoriesResponse.json();

      if (complaintsResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      if (complaintsResult.success) {
        setComplaints(complaintsResult.data || []);
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data || []);
      }

      if (!complaintsResponse.ok || !complaintsResult.success) {
        setMessage(
          complaintsResult.message || "Unable to load complaints."
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to load dashboard data. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = getUser();
    const role = storedUser?.role || storedUser?.role_name;
    const rolePaths = { STUDENT: "/student", MAINTENANCE_STAFF: "/staff", WARDEN: "/warden", ADMINISTRATOR: "/admin" };

    if (!token || !rolePaths[role]) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
      return;
    }
    if (role !== "STUDENT") {
      router.replace(rolePaths[role]);
      return;
    }

    void Promise.resolve().then(() => loadData(token));
  }, [loadData, router]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  useEffect(() => {
    const title = form.title.trim();
    const description = form.description.trim();
    const combinedLength = title.length + (title && description ? 1 : 0) + description.length;

    if (combinedLength < 3) {
      const clearTimer = setTimeout(() => {
        setSimilarComplaints([]);
        setSimilarError("");
        setSimilarLoading(false);
      }, 0);

      return () => clearTimeout(clearTimer);
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSimilarLoading(true);
      setSimilarError("");

      try {
        // Keep search text within the backend's 5,150-character limit.
        const searchText = `${title}${title && description ? "\n" : ""}${description}`.slice(0, 5150);

        const response = await fetch(`${API_URL}/search/complaints`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: searchText, limit: 5 }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          router.push("/");
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Similar complaint search failed");
        }

        setSimilarComplaints(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Similar complaint lookup failed:", error);
          setSimilarComplaints([]);
          setSimilarError("Similar complaint suggestions are temporarily unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSimilarLoading(false);
        }
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.title, form.description, router]);

  async function handleSubmit(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await fetch(`${API_URL}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          category_id: Number(form.category_id),
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      if (!response.ok || !result.success) {
        setMessage(result.message || "Unable to submit complaint.");
        return;
      }

      setMessage("Complaint submitted successfully!");
      setSimilarComplaints([]);
      setSimilarError("");

      setForm({
        category_id: categories[0]?.category_id
          ? String(categories[0].category_id)
          : "1",
        title: "",
        description: "",
        severity: "MEDIUM",
        urgency: "MEDIUM",
      });

      await loadData(token);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the backend.");
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-5 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Loading student dashboard...
          </p>
        </div>
      </main>
    );
  }

  const activeCount = complaints.filter(
    (item) => !["RESOLVED", "CLOSED", "REJECTED"].includes(item.status)
  ).length;

  const resolvedCount = complaints.filter(
    (item) => ["RESOLVED", "CLOSED"].includes(item.status)
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 text-white md:flex">
          <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold">
              H
            </div>
            <div>
              <p className="font-bold tracking-wide">Hostel Complaints</p>
              <p className="text-xs text-slate-400">Management System</p>
            </div>
          </div>

          <div className="px-4 py-7">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Workspace
            </p>
            <div className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold">
              <span className="text-lg">▦</span>
              My Dashboard
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-semibold">
                S
              </div>
              <div>
                <p className="text-sm font-semibold">Student Portal</p>
                <p className="text-xs text-slate-400">Student account</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-left text-sm text-slate-300 transition hover:border-red-400/50 hover:bg-red-500/10 hover:text-white"
            >
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Workspace / Student
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                Student Dashboard
              </h1>
            </div>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </button>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
            {/* Welcome banner */}
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-8">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Student portal
                </p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Welcome to your dashboard
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Submit hostel maintenance complaints and follow their
                  progress until resolution.
                </p>
              </div>
              <div className="hidden h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-4xl sm:flex">
                ◈
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Total complaints
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {complaints.length}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Complaints submitted by you
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Active complaints
                </p>
                <p className="mt-3 text-3xl font-bold text-blue-700">
                  {activeCount}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Still being processed
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Resolved complaints
                </p>
                <p className="mt-3 text-3xl font-bold text-emerald-600">
                  {resolvedCount}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Resolved or closed
                </p>
              </div>
            </div>

            {/* Feedback */}
            {message && (
              <div
                role="status"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.toLowerCase().includes("successfully")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {message}
              </div>
            )}

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              {/* Complaint form */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    New request
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Submit a complaint
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provide details about the maintenance issue.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="category_id"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Complaint category
                    </label>
                    <select
                      id="category_id"
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    >
                      {categories.map((category) => (
                        <option
                          key={category.category_id}
                          value={category.category_id}
                        >
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Complaint title
                    </label>
                    <input
                      id="title"
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Example: Fan not working"
                      maxLength={150}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe the maintenance issue..."
                      rows={5}
                      maxLength={5000}
                      required
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {form.description.length}/5000
                    </p>
                  </div>

                  {(similarLoading || similarError || similarComplaints.length > 0 || (form.title.trim() + form.description.trim()).length >= 3) && (
                    <section
                      className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                      aria-live="polite"
                    >
                      <h3 className="text-sm font-semibold text-slate-800">
                        Similar complaints in your hostel
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        These suggestions may help you check whether this issue has already been reported.
                      </p>

                      {similarLoading && (
                        <p className="mt-3 text-xs text-blue-700">
                          Checking for similar complaints...
                        </p>
                      )}

                      {similarError && (
                        <p className="mt-3 text-xs text-amber-700">
                          {similarError}
                        </p>
                      )}

                      {!similarLoading && !similarError && similarComplaints.length === 0 && (
                        <p className="mt-3 text-xs text-slate-500">
                          No similar complaints found.
                        </p>
                      )}

                      {similarComplaints.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {similarComplaints.map((item) => (
                            <li
                              key={item.complaint_id}
                              className="rounded-lg border border-blue-100 bg-white p-3"
                            >
                              <p className="text-sm font-medium text-slate-800">
                                {item.title || "Existing complaint"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Complaint #{item.complaint_id} · {item.status || "Status unavailable"}
                                {Number.isFinite(Number(item.similarity)) ? ` · ${Number(item.similarity * 100).toFixed(1)}% match` : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="severity"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Severity
                      </label>
                      <select
                        id="severity"
                        name="severity"
                        value={form.severity}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="urgency"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Urgency
                      </label>
                      <select
                        id="urgency"
                        name="urgency"
                        value={form.urgency}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || categories.length === 0}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Submitting complaint..." : "Submit complaint"}
                  </button>

                  {categories.length === 0 && (
                    <p className="text-xs text-amber-700">
                      No complaint categories are available. Please contact
                      the administrator.
                    </p>
                  )}
                </form>
              </section>

              {/* Complaint history */}
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      My complaints
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Your submitted maintenance requests
                    </p>
                  </div>
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                    {complaints.length}
                  </span>
                </div>

                <div className="max-h-[850px] space-y-4 overflow-y-auto p-5 sm:p-6">
                  {complaints.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                        ▤
                      </div>
                      <h3 className="mt-4 font-semibold text-slate-800">
                        No complaints yet
                      </h3>
                      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                        Your submitted complaints will appear here. Use the
                        form to report your first maintenance issue.
                      </p>
                    </div>
                  ) : (
                    complaints.map((complaint) => (
                      <article
                        key={complaint.complaint_id}
                        className="rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-blue-600">
                              COMPLAINT #{complaint.complaint_id}
                            </p>
                            <h3 className="mt-1 font-bold text-slate-900">
                              {complaint.title}
                            </h3>
                          </div>

                          <span
                            className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle(
                              complaint.status
                            )}`}
                          >
                            {complaint.status?.replaceAll("_", " ") || "Unknown"}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                          {complaint.description}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                          {complaint.category_name && (
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                              {complaint.category_name}
                            </span>
                          )}
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            Severity: {complaint.severity}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                            Urgency: {complaint.urgency}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>

            <StudentFeedback complaints={complaints} />

            <footer className="pb-3 text-center text-xs text-slate-400">
              Hostel Complaint Management
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
