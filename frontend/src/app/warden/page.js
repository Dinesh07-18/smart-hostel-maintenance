"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, logout, getUser } from "@/lib/api";
import SemanticComplaintSearch from "@/components/SemanticComplaintSearch";

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

export default function WardenDashboard() {
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("SUBMITTED");
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

      if (!token || !storedUser || (storedUser.role || storedUser.role_name) !== "WARDEN") {
        logout();
        return;
      }

      if (active) setUser(storedUser);
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
        limit: "10",
      });

      if (status !== "ALL") query.set("status", status);

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

      setComplaints(result.data || []);
      setPagination(result.pagination || {});
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    Promise.resolve().then(() => {
      if (active) loadComplaints();
    });

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

      setStaff(result.data || []);
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
      await loadComplaints();
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setAssigning(false);
    }
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading Warden Dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">Hostel Complaint Management</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Warden Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Welcome, {user.full_name}. Manage complaints from your assigned hostel.
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <div className="mb-6"><SemanticComplaintSearch title="Search complaints across your assigned hostels" /></div>

        {message && (
          <div className="mb-5 rounded-lg bg-blue-100 p-4 text-blue-800">
            {message}
          </div>
        )}

        <section className="mb-6 rounded-xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Hostel Complaints
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review complaints and assign maintenance staff.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2"
              >
                {STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>

              <button
                onClick={loadComplaints}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
            Loading complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-600 shadow">
            No complaints found for this filter.
          </div>
        ) : (
          <section className="space-y-4">
            {complaints.map((complaint) => (
              <article
                key={complaint.complaint_id}
                className="rounded-xl bg-white p-6 shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {complaint.title}
                    </h3>
                    <p className="mt-2 text-gray-600">
                      {complaint.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {complaint.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                  <p>Category: {complaint.category_name || "—"}</p>
                  <p>Hostel: {complaint.hostel_name || "—"}</p>
                  <p>Room: {complaint.room_number || "—"}</p>
                  <p>Student: {complaint.student_name || "—"}</p>
                  <p>Severity: {complaint.severity || "—"}</p>
                  <p>Urgency: {complaint.urgency || "—"}</p>
                  <p>Priority: {complaint.priority_level || "Not calculated"}</p>
                  <p>Assigned Staff: {complaint.assigned_staff_name || "Not assigned"}</p>
                </div>

                {["SUBMITTED", "VERIFIED", "REOPENED"].includes(
                  complaint.status
                ) && (
                  <button
                    onClick={() => openAssignment(complaint)}
                    className="mt-5 rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
                  >
                    Assign Maintenance Staff
                  </button>
                )}
              </article>
            ))}
          </section>
        )}

        <div className="mt-6 flex items-center justify-between rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-gray-600">
            Page {pagination.page || page} of {pagination.total_pages || 1}
            {" · "}
            Total complaints: {pagination.total ?? complaints.length}
          </p>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= (pagination.total_pages || 1)}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={assignComplaint}
              className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Assign Maintenance Staff
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {selectedComplaint.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="text-2xl text-gray-500"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <label className="mt-5 block text-sm font-medium text-gray-700">
                Available Staff
              </label>
              {staffLoading ? (
                <p className="mt-2 text-gray-500">Loading staff...</p>
              ) : (
                <select
                  required
                  value={selectedStaff}
                  onChange={(event) => setSelectedStaff(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-gray-300 p-3"
                >
                  <option value="">Select maintenance staff</option>
                  {staff.map((member) => (
                    <option key={member.staff_id} value={member.staff_id}>
                      {member.full_name} — {member.availability_status}
                      {" · Active complaints: "}
                      {member.active_complaint_count ?? 0}
                    </option>
                  ))}
                </select>
              )}

              {!staffLoading && staff.length === 0 && (
                <p className="mt-2 text-sm text-amber-700">
                  No maintenance staff available for this hostel.
                </p>
              )}

              <label className="mt-5 block text-sm font-medium text-gray-700">
                Assignment Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                placeholder="Enter instructions for the maintenance staff..."
                className="mt-2 w-full rounded-lg border border-gray-300 p-3"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-lg border px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || staffLoading || staff.length === 0}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
