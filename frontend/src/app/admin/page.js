"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, logout, getUser } from "@/lib/api";
import SemanticComplaintSearch from "@/components/SemanticComplaintSearch";
import AdminUserManagement from "@/components/AdminUserManagement";

const STATUSES = [
  "ALL",
  "SUBMITTED",
  "VERIFIED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "REJECTED",
];

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

function priorityStyle(priority) {
  const value = String(priority || "").toUpperCase();

  if (value.includes("CRITICAL") || value.includes("URGENT")) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (value.includes("HIGH")) {
    return "bg-orange-50 text-orange-700 ring-orange-200";
  }
  if (value.includes("MEDIUM")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  if (value.includes("LOW")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [remarks, setRemarks] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      const token = localStorage.getItem("token");
      const storedUser = getUser();

      if (
        !token ||
        !storedUser ||
        (storedUser.role || storedUser.role_name) !== "ADMINISTRATOR"
      ) {
        logout();
        return;
      }

      if (active) {
        setUser(storedUser);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "50",
      });

      if (status !== "ALL") {
        query.set("status", status);
      }

      const { response, result } = await apiRequest(
        `/warden/complaints?${query.toString()}`
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok || !result.success) {
        setMessage(result.message || "Unable to load complaints.");
        setComplaints([]);
        return;
      }

      const complaintData =
        result.data?.complaints || result.complaints || result.data || [];

      const paginationData =
        result.data?.pagination || result.pagination || {};

      setComplaints(Array.isArray(complaintData) ? complaintData : []);
      setPagination(paginationData);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    let active = true;

    if (user) {
      Promise.resolve().then(() => {
        if (active) {
          loadComplaints();
        }
      });
    }

    return () => {
      active = false;
    };
  }, [user, loadComplaints]);

  async function openAssignment(complaint) {
    setSelectedComplaint(complaint);
    setSelectedStaff("");
    setRemarks("");
    setStaff([]);
    setStaffLoading(true);
    setMessage("");

    try {
      const { response, result } = await apiRequest(
        `/warden/staff?hostel_id=${complaint.hostel_id}`
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok || !result.success) {
        setMessage(result.message || "Unable to load maintenance staff.");
        return;
      }

      const staffData = result.data?.staff || result.data || [];
      setStaff(Array.isArray(staffData) ? staffData : []);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect while loading staff.");
    } finally {
      setStaffLoading(false);
    }
  }

  async function assignComplaint(event) {
    event.preventDefault();

    if (!selectedComplaint || !selectedStaff) {
      setMessage("Please select a maintenance staff member.");
      return;
    }

    setAssigning(true);
    setMessage("");

    try {
      const { response, result } = await apiRequest(
        `/warden/complaints/${selectedComplaint.complaint_id}/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            staff_id: Number(selectedStaff),
            remarks: remarks.trim(),
          }),
        }
      );

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok || !result.success) {
        setMessage(result.message || "Complaint assignment failed.");
        return;
      }

      setMessage("Complaint assigned successfully.");
      setSelectedComplaint(null);
      setSelectedStaff("");
      setRemarks("");
      setStaff([]);

      await loadComplaints();
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setAssigning(false);
    }
  }

  function handleStatusChange(event) {
    setStatus(event.target.value);
    setPage(1);
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-5 shadow-sm">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Loading administrator dashboard...
          </p>
        </div>
      </main>
    );
  }

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
              <p className="font-bold tracking-wide">Hostel Complaint Management</p>
              <p className="text-xs text-slate-400">Complaint Operations</p>
            </div>
          </div>

          <div className="px-4 py-7">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Workspace
            </p>

            <div className="flex items-center gap-3 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-950/30">
              <span className="text-lg">▦</span>
              Dashboard
            </div>
          </div>

          <div className="mt-auto border-t border-white/10 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 font-semibold">
                {(user.full_name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user.full_name || "Administrator"}
                </p>
                <p className="text-xs text-slate-400">Administrator</p>
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
          {/* Top header */}
          <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Workspace / Overview
              </p>
              <h1 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                Administrator Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">
                  {user.full_name || "Administrator"}
                </p>
                <p className="text-xs text-slate-500">Platform Administrator</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                {(user.full_name || "A").charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:hidden"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
            {/* Welcome section */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white shadow-lg shadow-blue-900/10 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-sm font-medium text-blue-100">
                  Welcome back
                </p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  {user.full_name || "Administrator"}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
                  Monitor hostel maintenance complaints and coordinate
                  maintenance staff assignments from one place.
                </p>
              </div>
              <div className="hidden h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-4xl sm:flex">
                ◈
              </div>
            </div>

            {/* Complaint management heading */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Complaint Management
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review complaints, monitor their status and assign
                  maintenance staff.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {loading ? "Updating complaints..." : "Complaint data loaded"}
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Filter by complaint status
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={handleStatusChange}
                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:w-72"
                  >
                    {STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item === "ALL"
                          ? "All Complaints"
                          : item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {complaints.length}
                    </span>{" "}
                    on this page
                  </p>
                  <button
                    onClick={loadComplaints}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    ↻ Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback message */}
            <div className="mb-6"><SemanticComplaintSearch title="Search complaints across the platform" /></div>
        <div className="mb-6"><AdminUserManagement /></div>

        {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.toLowerCase().includes("successfully")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
                role="status"
              >
                {message}
              </div>
            )}

            {/* Complaints table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h3 className="font-bold text-slate-900">
                    All Complaints
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Complaint records and assignment actions
                  </p>
                </div>
                <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  {status === "ALL" ? "All statuses" : status.replaceAll("_", " ")}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-3 p-14 text-sm text-slate-500">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  Loading complaints...
                </div>
              ) : complaints.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">
                    ▤
                  </div>
                  <h4 className="mt-4 font-semibold text-slate-800">
                    No complaints found
                  </h4>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                    There are no complaints matching this filter. New
                    submissions will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Complaint",
                          "Student",
                          "Category",
                          "Hostel",
                          "Priority",
                          "Status",
                          "Assigned Staff",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {complaints.map((complaint) => (
                        <tr
                          key={complaint.complaint_id}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="max-w-xs px-5 py-4">
                            <p className="text-xs font-semibold text-blue-600">
                              #{complaint.complaint_id}
                            </p>
                            <p className="mt-1 font-semibold text-slate-800">
                              {complaint.title}
                            </p>
                            {complaint.description && (
                              <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                                {complaint.description}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-700">
                            {complaint.student_name || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.category_name || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.hostel_name || "-"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${priorityStyle(
                                complaint.priority_level
                              )}`}
                            >
                              {complaint.priority_level || "Not calculated"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle(
                                complaint.status
                              )}`}
                            >
                              {complaint.status?.replaceAll("_", " ") || "Unknown"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {complaint.assigned_staff_name || (
                              <span className="italic text-slate-400">
                                Not assigned
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {["SUBMITTED", "VERIFIED", "REOPENED"].includes(
                              complaint.status
                            ) ? (
                              <button
                                onClick={() => openAssignment(complaint)}
                                className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                              >
                                Assign staff
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                No action
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Page{" "}
                    <span className="font-semibold text-slate-800">
                      {pagination.page || page}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-800">
                      {pagination.total_pages}
                    </span>
                  </p>

                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((current) => current - 1)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous
                    </button>
                    <button
                      disabled={page >= pagination.total_pages || loading}
                      onClick={() => setPage((current) => current + 1)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="pb-3 text-center text-xs text-slate-400">
              Hostel Complaint Management
            </footer>
          </div>
        </section>
      </div>

      {/* Staff assignment modal */}
      {selectedComplaint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !assigning
            ) {
              setSelectedComplaint(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-title"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Complaint assignment
                </p>
                <h2
                  id="assignment-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  Assign maintenance staff
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Complaint #{selectedComplaint.complaint_id}:{" "}
                  {selectedComplaint.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                disabled={assigning}
                aria-label="Close assignment dialog"
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form onSubmit={assignComplaint} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Select maintenance staff
                </label>

                {staffLoading ? (
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    Loading available staff...
                  </div>
                ) : staff.length === 0 ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    No maintenance staff are currently available for this
                    hostel.
                  </p>
                ) : (
                  <select
                    value={selectedStaff}
                    onChange={(event) => setSelectedStaff(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    required
                  >
                    <option value="">Choose a staff member</option>
                    {staff.map((member) => (
                      <option
                        key={member.staff_id}
                        value={member.staff_id}
                      >
                        {member.full_name}
                        {member.employee_code
                          ? ` (${member.employee_code})`
                          : ""}
                        {" - "}
                        {member.availability_status}
                        {member.active_complaint_count !== undefined
                          ? ` | Active: ${member.active_complaint_count}`
                          : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Assignment remarks{" "}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Add instructions or additional details..."
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  disabled={assigning}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    assigning ||
                    staffLoading ||
                    staff.length === 0 ||
                    !selectedStaff
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Confirm assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
