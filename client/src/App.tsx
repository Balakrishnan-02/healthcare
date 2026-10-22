import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ActivitySquare, AlertCircle, ArrowDownToLine, Bell, Check, ChevronDown, CircleHelp, ClipboardList, Cloud, CloudOff, HeartPulse, LayoutDashboard, LockKeyhole, LogOut, Menu, Plus, Search, ShieldCheck, Stethoscope, UserCog, Users, Wifi, WifiOff, X } from "lucide-react";
import { localDb } from "./db/localDb";
import { api } from "./services/api";
import { syncPending } from "./services/sync";
import type { PatientRecord, StaffUser } from "./types";
import StaffManagement from "./StaffManagement";

type PatientPayload = Omit<PatientRecord, "syncStatus" | "createdByName">;
const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Patients", icon: Users },
  { label: "Visits & notes", icon: ClipboardList },
  { label: "Care resources", icon: HeartPulse }
];

export default function App() {
  const [user, setUser] = useState<StaffUser | null>(() => {
    const raw = sessionStorage.getItem("ruralcare_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [email, setEmail] = useState("admin@ruralcare.local");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [form, setForm] = useState({ fullName: "", age: "", sex: "Prefer not to say", village: "", phone: "", note: "" });
  const visibleNavItems = user?.role === "admin" ? [...navItems, { label: "Staff management", icon: UserCog }] : navItems;

  const refresh = useCallback(async () => {
    const all = await localDb.patients.orderBy("createdAtClient").reverse().toArray();
    setPatients(all);
  }, []);

  const sync = useCallback(async () => {
    if (!user || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncPending();
      await refresh();
      if (result.synced) setToast(`${result.synced} record${result.synced === 1 ? "" : "s"} securely sent to the server.`);
    } catch {
      setToast("Could not reach the server. Your queued records remain on this device.");
    } finally { setSyncing(false); }
  }, [user, refresh]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void refresh();
    if (user) void sync();
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [refresh, sync, user]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginError("");
    try {
      const result = await api<{ token: string; user: StaffUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      sessionStorage.setItem("ruralcare_token", result.token);
      sessionStorage.setItem("ruralcare_user", JSON.stringify(result.user));
      setUser(result.user); setPassword("");
    } catch (err) { setLoginError(err instanceof Error ? err.message : "Unable to sign in"); }
  }
  function logout() {
    sessionStorage.removeItem("ruralcare_token"); sessionStorage.removeItem("ruralcare_user"); setUser(null);
  }
  async function savePatient(e: React.FormEvent) {
    e.preventDefault();
    const record: PatientPayload = {
      localId: crypto.randomUUID(), syncKey: crypto.randomUUID(),
      fullName: form.fullName.trim(), age: form.age ? Number(form.age) : undefined,
      sex: form.sex as PatientRecord["sex"], village: form.village.trim(),
      phone: form.phone.trim(), note: form.note.trim(), createdAtClient: new Date().toISOString()
    };
    await localDb.patients.put({ ...record, syncStatus: "pending", createdByName: user?.name });
    setForm({ fullName: "", age: "", sex: "Prefer not to say", village: "", phone: "", note: "" });
    setShowForm(false); await refresh();
    setToast(online ? "Saved on this device. Syncing to clinic database…" : "Saved on this device. It will sync when internet returns.");
    if (online) void sync();
  }
  const pending = patients.filter(p => p.syncStatus === "pending").length;
  const synced = patients.length - pending;
  const filtered = useMemo(() => patients.filter(p => [p.fullName, p.village, p.phone].join(" ").toLowerCase().includes(query.toLowerCase())), [patients, query]);

  if (!user) return <div className="login-shell">
    <div className="login-art"><div className="brand brand-light"><span className="brand-mark"><HeartPulse size={22}/></span><span>ruralcare<span className="brand-dot">.</span></span></div><div className="art-copy"><span className="eyebrow">CARE WITHOUT BARRIERS</span><h1>Good care should<br/>never depend on<br/><em>a signal.</em></h1><p>A dependable workspace for rural care teams — online or off.</p></div><div className="art-bottom"><ShieldCheck size={17}/> Designed for authorized clinic staff</div><div className="art-orb orb-one"/><div className="art-orb orb-two"/></div>
    <div className="login-panel"><div className="mobile-brand brand"><span className="brand-mark"><HeartPulse size={22}/></span><span>ruralcare<span className="brand-dot">.</span></span></div><div className="login-card"><div className="welcome-icon"><LockKeyhole size={22}/></div><span className="eyebrow">STAFF PORTAL</span><h2>Welcome back</h2><p className="muted">Sign in with your clinic staff account to continue.</p><form onSubmit={login} className="stack-form"><label>Work email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" placeholder="you@clinic.org"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password"/></label>{loginError && <div className="error-box"><AlertCircle size={16}/>{loginError}</div>}<button className="primary-btn full-btn" type="submit">Sign in securely <span>→</span></button></form><div className="login-foot"><ShieldCheck size={15}/> Protected access · Authorized staff only</div><div className="demo-note">Demo setup: use the bootstrap admin configured in <code>server/.env</code>.</div></div><div className="copyright">RuralCare Workspace · Local-first clinic tools</div></div>
  </div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><HeartPulse size={22}/></span><span>ruralcare<span className="brand-dot">.</span></span></div>
      <div className="facility-switch"><div className="facility-avatar">SC</div><div><strong>Sunrise Clinic</strong><small>Primary care facility</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div><nav>{visibleNavItems.map(item => <button key={item.label} className={`nav-item ${activeNav === item.label ? "active" : ""}`} onClick={() => setActiveNav(item.label)}><item.icon size={18}/><span>{item.label}</span>{item.label === "Patients" && <span className="nav-count">{patients.length}</span>}</button>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="offline-card"><div className={`status-icon ${online ? "online" : "offline"}`}>{online ? <Wifi size={17}/> : <WifiOff size={17}/>}</div><div><strong>{online ? "Connection available" : "Working offline"}</strong><small>{pending ? `${pending} record${pending===1?"":"s"} waiting to sync` : "Your workspace is ready"}</small></div></div>
      <button className="nav-item help-item" onClick={() => setToast("For help, contact your clinic system administrator.")}><CircleHelp size={18}/><span>Help & support</span></button>
      <div className="profile"><div className="profile-avatar">{user.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div className="profile-info"><strong>{user.name}</strong><small>{user.role}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div><div className="top-actions"><div className={`connection-pill ${online ? "connected" : "disconnected"}`}>{online ? <Wifi size={14}/> : <WifiOff size={14}/>}<span>{online ? "Online" : "Offline mode"}</span></div><button className="icon-btn notification-btn" onClick={() => setToast(pending ? `${pending} record(s) are waiting to sync.` : "You're all caught up.")}><Bell size={18}/>{pending > 0 && <i/>}</button><div className="top-avatar">{user.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow">{new Intl.DateTimeFormat("en-IN",{weekday:"long",day:"numeric",month:"long"}).format(new Date()).toUpperCase()}</div><h1>{activeNav === "Overview" ? "Good care starts here." : activeNav}</h1><p>{activeNav === "Overview" ? "A clear view of your clinic, even when the network isn't." : activeNav === "Patients" ? "Patient records saved locally and synced when connected." : activeNav === "Visits & notes" ? "A calm place to organize the day’s care." : activeNav === "Staff management" ? "Register and manage authorized clinic accounts." : "Quick links for your care team."}</p></div>{activeNav !== "Staff management" && <button className="primary-btn" onClick={() => setShowForm(true)}><Plus size={17}/> New patient</button>}</div>
        {!online && activeNav !== "Staff management" && <div className="offline-banner"><div className="banner-icon"><CloudOff size={18}/></div><div><strong>You're in offline mode</strong><p>New records are saved on this device and queued for sync when connectivity returns.</p></div><span className="banner-tag">LOCAL-FIRST</span></div>}
        {activeNav === "Staff management" && user.role === "admin" ? <StaffManagement /> : activeNav === "Care resources" ? <div className="resource-grid"><div className="resource-card"><div className="resource-icon mint"><HeartPulse size={20}/></div><h3>Clinic protocols</h3><p>Add locally approved, versioned protocols through your administrator.</p><span className="resource-link">No clinical guidance included <ArrowDownToLine size={14}/></span></div><div className="resource-card"><div className="resource-icon lavender"><Users size={20}/></div><h3>Community follow-up</h3><p>Plan a follow-up workflow with your clinical lead before enabling patient reminders.</p><span className="resource-link">Staff workflow <Activity size={14}/></span></div><div className="resource-card"><div className="resource-icon peach"><ShieldCheck size={20}/></div><h3>Privacy & safety</h3><p>Use approved devices, lock screens, and follow your facility's privacy policy.</p><span className="resource-link">Security first <LockKeyhole size={14}/></span></div></div> :
        activeNav === "Visits & notes" ? <div className="empty-panel"><div className="empty-icon"><ClipboardList size={24}/></div><h3>Visit workflow is ready to shape</h3><p>This starter avoids clinical decision-making. Add your approved visit forms after clinical and privacy review.</p><button className="secondary-btn" onClick={() => setToast("Visit notes module is a planned extension.")}>View implementation notes</button></div> :
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span>Total local records</span><span className="stat-icon blue"><Users size={18}/></span></div><div className="stat-number">{patients.length.toString().padStart(2,"0")}</div><div className="stat-foot"><span className="stat-dot blue-dot"/>Available on this device</div></div>
            <div className="stat-card"><div className="stat-top"><span>Synced to database</span><span className="stat-icon green"><Cloud size={18}/></span></div><div className="stat-number">{synced.toString().padStart(2,"0")}</div><div className="stat-foot"><span className="stat-dot green-dot"/>Confirmed by server</div></div>
            <div className="stat-card"><div className="stat-top"><span>Waiting to sync</span><span className="stat-icon amber"><ActivitySquare size={18}/></span></div><div className="stat-number">{pending.toString().padStart(2,"0")}</div><div className="stat-foot"><span className={`stat-dot ${pending ? "amber-dot" : "green-dot"}`}/>{pending ? "Queued on this device" : "No pending records"}</div></div>
          </div>
          <section className="records-panel"><div className="section-head"><div><h2>{activeNav === "Patients" ? "Patient directory" : "Recent patient records"}</h2><p>Records visible on this device</p></div><div className="section-actions"><div className="searchbox"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records"/></div><button className="secondary-btn compact" onClick={() => void sync()} disabled={!online || syncing}>{syncing ? <span className="spinner"/> : <Cloud size={15}/>} {syncing ? "Syncing" : "Sync now"}</button></div></div>
            {filtered.length ? <div className="table-wrap"><table><thead><tr><th>PATIENT</th><th>VILLAGE</th><th>AGE / SEX</th><th>CREATED</th><th>SYNC STATUS</th></tr></thead><tbody>{filtered.map(p=><tr key={p.localId}><td><div className="patient-cell"><div className="patient-avatar">{p.fullName.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div><strong>{p.fullName}</strong><small>{p.phone || "No phone added"}</small></div></div></td><td>{p.village || "—"}</td><td>{p.age ?? "—"} / {p.sex}</td><td>{new Date(p.createdAtClient).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</td><td><span className={`sync-badge ${p.syncStatus}`}><span/>{p.syncStatus === "synced" ? "Synced" : "Waiting"}</span></td></tr>)}</tbody></table></div> : <div className="empty-table"><div className="empty-icon"><Users size={22}/></div><h3>{query ? "No matching records" : "Your patient list starts here"}</h3><p>{query ? "Try another name, village, or phone number." : "Add a patient record. It will be saved on this device first."}</p>{!query && <button className="secondary-btn" onClick={() => setShowForm(true)}><Plus size={16}/> Add first patient</button>}</div>}
            <div className="table-footer"><span>Showing {filtered.length} of {patients.length} local records</span><span><ShieldCheck size={14}/> Staff-only workspace</span></div>
          </section>
        </>}
        <div className="safety-note"><AlertCircle size={16}/><p><strong>Prototype notice:</strong> This is a starter app, not a certified medical record system. Do not enter real patient information until security, privacy, backup, and clinical workflows have been reviewed.</p></div>
      </div>
      <footer className="main-footer"><span>© 2026 RuralCare Workspace</span><span><span className="footer-dot"/> {online ? "Connection available" : "Local mode active"} <span className="footer-divider">·</span> v1.0.0</span></footer>
    </main>
    {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">PATIENT INTAKE</span><h2>Add a patient</h2><p>Saved locally first, then queued for sync.</p></div><button className="icon-btn" onClick={() => setShowForm(false)}><X size={19}/></button></div><form onSubmit={savePatient} className="patient-form"><label>Full name *<input required minLength={2} maxLength={120} value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Enter patient name"/></label><div className="form-row"><label>Age<input type="number" min="0" max="125" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="Age"/></label><label>Sex<select value={form.sex} onChange={e=>setForm({...form,sex:e.target.value})}><option>Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label></div><label>Village / locality<input maxLength={120} value={form.village} onChange={e=>setForm({...form,village:e.target.value})} placeholder="Village name"/></label><label>Phone number<input maxLength={30} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional"/></label><label>Intake note<textarea maxLength={2000} rows={3} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Only enter information approved for this workflow."/></label><div className="local-save-note"><CloudOff size={16}/><span><strong>Local-first saving</strong><small>Will sync after a successful server connection.</small></span></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-btn"><Check size={16}/> Save record</button></div></form></div></div>}
    {toast && <div className="toast"><Check size={17}/><span>{toast}</span><button onClick={() => setToast("")}><X size={15}/></button></div>}
  </div>;
}
