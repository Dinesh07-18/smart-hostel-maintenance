"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, getUser } from "@/lib/api";
import SemanticComplaintSearch from "@/components/SemanticComplaintSearch";

export default function StaffDashboard() {
  const router = useRouter();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadComplaints = useCallback(async (token) => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/staff/complaints`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      if (result.success) {
        setComplaints(result.data || []);
      } else {
        setMessage(result.message || "Unable to load complaints");
      }
    } catch (error) {
      console.error("Failed to load complaints:", error);
      setMessage("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
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
      if (role !== "MAINTENANCE_STAFF") {
        router.replace(rolePaths[role]);
        return;
      }

      if (active) loadComplaints(token);
    });

    return () => {
      active = false;
    };
  }, [loadComplaints, router]);

  async function updateStatus(complaintId, status) {
    const token = localStorage.getItem("token");

    try {
      setMessage("");

      const response = await fetch(
        `${API_URL}/staff/complaints/${complaintId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }

      if (result.success) {
        setMessage("Complaint status updated successfully!");
        loadComplaints(token);
      } else {
        setMessage(result.message || "Unable to update status");
      }
    } catch (error) {
      console.error("Failed to update complaint:", error);
      setMessage("Unable to connect to the server");
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700">Hostel Complaint Management</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Maintenance Staff Dashboard
            </h1>
            <p className="mt-1 text-gray-600">
              View and manage assigned maintenance complaints.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-3 font-medium text-white"
          >
            Logout
          </button>
        </div>

        <div className="mb-6"><SemanticComplaintSearch title="Search complaints in your assigned hostels" /></div>

        {message && (
          <div className="mb-6 rounded-lg bg-blue-100 px-4 py-3 text-blue-800">
            {message}
          </div>
        )}

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Assigned Complaints ({complaints.length})
          </h2>

          {loading ? (
            <p className="text-gray-600">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p className="text-gray-600">No complaints assigned.</p>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <div
                  key={complaint.complaint_id}
                  className="rounded-lg border border-gray-200 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {complaint.title}
                      </h3>

                      <p className="mt-1 text-gray-600">
                        {complaint.description}
                      </p>
                    </div>

                    <span className="rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                      {complaint.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
                    <span className="rounded bg-gray-100 px-2 py-1">
                      {complaint.category_name}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1">
                      Severity: {complaint.severity}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1">
                      Urgency: {complaint.urgency}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-3">
                    {complaint.status === "ASSIGNED" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            complaint.complaint_id,
                            "IN_PROGRESS"
                          )
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
                      >
                        Start Work
                      </button>
                    )}

                    {complaint.status === "IN_PROGRESS" && (
                      <button
                        onClick={() =>
                          updateStatus(
                            complaint.complaint_id,
                            "RESOLVED"
                          )
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white"
                      >
                        Mark Resolved
                      </button>
                    )}

                    {complaint.status === "RESOLVED" && (
                      <span className="rounded-lg bg-green-100 px-4 py-2 font-medium text-green-700">
                        Complaint Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
