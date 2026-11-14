"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, logout } from "@/lib/api";

const ROLES = ["STUDENT", "MAINTENANCE_STAFF", "WARDEN"];
const EMPTY = { role: "STUDENT", full_name: "", email: "", password: "", phone: "", registration_number: "", department: "", course: "", student_hostel_id: "", room_id: "", employee_code: "", employment_type: "", hostel_id: "", start_date: new Date().toISOString().slice(0, 10) };

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomsForHostelId, setRoomsForHostelId] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    try {
      const { response, result } = await apiRequest(`/admin/users?${params}`);
      if (response.status === 401) { logout(); return; }
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load users.");
      setUsers(result.data || []);
      setPagination(result.pagination || { page, total_pages: 1, total: 0 });
    } catch (error) { setMessage(error.message || "Unable to load users."); }
  }, [page, role, status, search]);

  useEffect(() => { Promise.resolve().then(() => loadUsers()); }, [loadUsers]);

  useEffect(() => {
    let active = true;
    apiRequest("/admin/hostels").then(({ response, result }) => {
      if (response.status === 401) { logout(); return; }
      if (active && response.ok && result.success) setHostels(result.data || []);
    }).catch((error) => console.error("Hostel list could not be loaded:", error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const hostelId = form.role === "STUDENT" ? form.student_hostel_id : "";
    if (!hostelId) return;
    let active = true;
    apiRequest(`/admin/hostels/${hostelId}/rooms`).then(({ response, result }) => {
      if (response.status === 401) { logout(); return; }
      if (active && response.ok && result.success) {
        setRooms(result.data || []);
        setRoomsForHostelId(hostelId);
      } else if (active) {
        setRooms([]);
        setRoomsForHostelId(hostelId);
      }
    }).catch((error) => {
      if (active) {
        setRooms([]);
        setRoomsForHostelId(hostelId);
      }
      console.error("Available rooms could not be loaded:", error);
    });
    return () => { active = false; };
  }, [form.role, form.student_hostel_id]);

  function changeFilter(setter, value) { setter(value); setPage(1); }

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = { role: form.role, full_name: form.full_name, email: form.email, password: form.password, phone: form.phone || null };
    if (form.role === "STUDENT") Object.assign(payload, { registration_number: form.registration_number, department: form.department || null, course: form.course || null, ...(form.student_hostel_id && form.room_id ? { hostel_id: Number(form.student_hostel_id), room_id: Number(form.room_id) } : form.student_hostel_id ? { hostel_id: Number(form.student_hostel_id) } : form.room_id ? { room_id: Number(form.room_id) } : {}) });
    else Object.assign(payload, { hostel_id: Number(form.hostel_id), start_date: form.start_date, ...(form.role === "MAINTENANCE_STAFF" ? { employee_code: form.employee_code, employment_type: form.employment_type || null } : {}) });
    try {
      const { response, result } = await apiRequest("/admin/users", { method: "POST", body: JSON.stringify(payload) });
      if (response.status === 401) { logout(); return; }
      if (!response.ok || !result.success) throw new Error(result.message || "User creation failed.");
      setMessage("User created successfully. Share the temporary credentials securely.");
      setForm(EMPTY);
      setPage(1);
      await loadUsers();
    } catch (error) { setMessage(error.message || "Unable to create user."); }
    finally { setBusy(false); }
  }

  async function changeStatus(user, account_status) {
    setMessage("");
    try {
      const { response, result } = await apiRequest(`/admin/users/${user.user_id}/status`, { method: "PATCH", body: JSON.stringify({ account_status }) });
      if (response.status === 401) { logout(); return; }
      if (!response.ok || !result.success) throw new Error(result.message || "Account update failed.");
      setMessage(`Account status updated for ${user.full_name}.`);
      await loadUsers();
    } catch (error) { setMessage(error.message || "Unable to update account."); }
  }

  const field = (name, label, type = "text", required = false) => <label className="block text-sm font-medium text-slate-700">{label}<input required={required} minLength={name === "password" ? 12 : undefined} maxLength={name === "password" ? 128 : undefined} type={type} value={form[name]} onChange={(event) => setForm((old) => ({ ...old, [name]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" /></label>;

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div><h2 className="text-xl font-bold text-slate-900">User management</h2><p className="mt-1 text-sm text-slate-500">Create student, maintenance staff and warden accounts; review and manage account status.</p></div>
      {message && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      <form onSubmit={createUser} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 font-semibold text-slate-800">Create account</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium text-slate-700">Role<select value={form.role} onChange={(event) => setForm((old) => ({ ...old, role: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">{ROLES.map((item) => <option key={item}>{item}</option>)}</select></label>
          {field("full_name", "Full name", "text", true)}{field("email", "Email", "email", true)}{field("password", "Initial password (12+ characters)", "password", true)}{field("phone", "Phone")}
          {form.role === "STUDENT" ? <>{field("registration_number", "Registration number", "text", true)}{field("department", "Department")}{field("course", "Course")}<label className="block text-sm font-medium text-slate-700">Hostel<select required value={form.student_hostel_id} onChange={(event) => setForm((old) => ({ ...old, student_hostel_id: event.target.value, room_id: "" }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Select hostel</option>{hostels.map((hostel) => <option key={hostel.hostel_id} value={hostel.hostel_id}>{hostel.hostel_name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Available room<select required disabled={!form.student_hostel_id} value={form.room_id} onChange={(event) => setForm((old) => ({ ...old, room_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Select room</option>{(roomsForHostelId === form.student_hostel_id ? rooms : []).map((room) => <option key={room.room_id} value={room.room_id}>Room {room.room_number} · {room.available_beds} beds available</option>)}</select></label></> : <><label className="block text-sm font-medium text-slate-700">Hostel<select required value={form.hostel_id} onChange={(event) => setForm((old) => ({ ...old, hostel_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Select hostel</option>{hostels.map((hostel) => <option key={hostel.hostel_id} value={hostel.hostel_id}>{hostel.hostel_name}</option>)}</select></label>{field("start_date", "Assignment start date", "date", true)}{form.role === "MAINTENANCE_STAFF" && <>{field("employee_code", "Employee code", "text", true)}{field("employment_type", "Employment type")}</>}</>}
        </div>
        <button disabled={busy} className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creating…" : "Create user"}</button>
        <p className="mt-2 text-xs text-slate-500">Select a hostel and an available room when creating a student. This creates the active room allocation required for complaint submission. Rooms at capacity or under maintenance are excluded. Passwords are hashed by the backend; do not reuse or publicly share passwords.</p>
      </form>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input maxLength={100} value={search} onChange={(event) => changeFilter(setSearch, event.target.value)} placeholder="Search name or email" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={role} onChange={(event) => changeFilter(setRole, event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All roles</option>{[...ROLES, "ADMINISTRATOR"].map((item) => <option key={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option>{["ACTIVE", "INACTIVE", "SUSPENDED"].map((item) => <option key={item}>{item}</option>)}</select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Created</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.user_id}><td className="p-3"><p className="font-semibold text-slate-800">{user.full_name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="p-3">{user.role_name}</td><td className="p-3">{user.account_status}</td><td className="p-3">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</td><td className="p-3"><select aria-label={`Update status for ${user.full_name}`} value={user.account_status} onChange={(event) => changeStatus(user, event.target.value)} className="rounded-md border border-slate-300 px-2 py-1"><option>ACTIVE</option><option>INACTIVE</option><option>SUSPENDED</option></select></td></tr>)}</tbody></table>{users.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No users match these filters.</p>}</div>
      <div className="flex items-center justify-between text-sm text-slate-600"><span>{pagination.total || 0} users · Page {pagination.page || page} of {pagination.total_pages || 1}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= (pagination.total_pages || 1)} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </section>
  );
}
