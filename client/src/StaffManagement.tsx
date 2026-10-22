import { useCallback, useEffect, useState } from "react";
import { UserPlus, Users, ShieldCheck, RefreshCw, UserCheck, UserX } from "lucide-react";
import { api } from "./services/api";

type StaffRole = "admin" | "doctor" | "nurse" | "staff";
type StaffRow = { id: string; name: string; email: string; role: StaffRole; active: boolean; createdAt?: string };

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "nurse" as StaffRole });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ users: StaffRow[] }>("/auth/staff");
      setStaff(result.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStaff(); }, [loadStaff]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const created = await api<StaffRow>("/auth/staff", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(`Account created for ${created.name}. Share the temporary password securely.`);
      setForm({ name: "", email: "", password: "", role: "nurse" });
      await loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create staff account");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(person: StaffRow) {
    setError(""); setMessage("");
    try {
      await api(`/auth/staff/${person.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: !person.active })
      });
      setMessage(`${person.name}'s account is now ${person.active ? "inactive" : "active"}.`);
      await loadStaff();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update staff account");
    }
  }

  return <div className="staff-page">
    <div className="staff-intro">
      <div className="staff-intro-icon"><Users size={21}/></div>
      <div><h2>Staff directory</h2><p>Create individual accounts and manage access for your clinic team.</p></div>
      <button className="secondary-btn compact" onClick={() => void loadStaff()} disabled={loading}><RefreshCw size={14}/> Refresh</button>
    </div>
    <div className="staff-layout">
      <section className="records-panel staff-create-panel">
        <div className="staff-panel-title"><div><h3><UserPlus size={17}/> Register staff member</h3><p>Only administrators can create accounts.</p></div></div>
        <form className="staff-form" onSubmit={createStaff}>
          <label>Full name<input required minLength={2} maxLength={120} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Staff member's name"/></label>
          <label>Work email<input required type="email" maxLength={200} value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@clinic.org"/></label>
          <label>Temporary password<input required type="password" minLength={8} maxLength={200} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/><small>Use a unique password and share it privately.</small></label>
          <label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as StaffRole})}><option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>
          <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Creating account…" : <><UserPlus size={16}/> Create staff account</>}</button>
        </form>
        {message && <div className="staff-success"><ShieldCheck size={16}/>{message}</div>}
        {error && <div className="error-box"><UserX size={16}/>{error}</div>}
      </section>
      <section className="records-panel staff-directory-panel">
        <div className="staff-panel-title"><div><h3>Clinic team <span className="staff-total">{staff.length}</span></h3><p>Each person uses their own login.</p></div></div>
        {loading ? <div className="staff-empty">Loading staff accounts…</div> : staff.length === 0 ? <div className="staff-empty">No staff accounts found.</div> :
          <div className="staff-list">{staff.map(person => <div className="staff-row" key={person.id}>
            <div className="staff-avatar">{person.name.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()}</div>
            <div className="staff-person"><strong>{person.name}</strong><span>{person.email}</span><small>{person.role}</small></div>
            <span className={`staff-status ${person.active ? "active" : "inactive"}`}>{person.active ? "Active" : "Inactive"}</span>
            <button className="secondary-btn compact staff-toggle" onClick={() => void toggleStatus(person)}>{person.active ? <><UserX size={14}/> Deactivate</> : <><UserCheck size={14}/> Activate</>}</button>
          </div>)}</div>}
      </section>
    </div>
    <div className="safety-note"><ShieldCheck size={16}/><p><strong>Access control:</strong> Keep registration administrator-only. Assign each person the minimum role they need and deactivate accounts promptly when staff leave.</p></div>
  </div>;
}
