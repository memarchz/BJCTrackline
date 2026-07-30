"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type { UserSummary } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<UserSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPw, setNewPw] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [pwDrafts, setPwDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await api.get<{ users: UserSummary[] }>("/users");
    setAccounts(res.data.users);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function createAccount() {
    const name = newName.trim();
    if (!name || !newPw || newPw.length < 6) {
      setError("Name and a password of at least 6 characters are required.");
      return;
    }
    setError(null);
    try {
      await api.post("/users", { name, email: newEmail.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}@bjctrackline.test`, password: newPw });
      setNewName("");
      setNewEmail("");
      setNewPw("");
      flash("Account created");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create this account"));
    }
  }

  async function saveEmail(id: string) {
    const email = emailDrafts[id];
    if (!email) return;
    try {
      await api.patch(`/users/${id}/credentials`, { email });
      setEmailDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      flash("Email updated");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function savePassword(id: string) {
    const password = pwDrafts[id]?.trim();
    if (!password) return;
    try {
      await api.patch(`/users/${id}/credentials`, { password });
      setPwDrafts((d) => ({ ...d, [id]: "" }));
      flash("Password updated");
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Delete this user? This can't be undone.")) return;
    try {
      await api.delete(`/users/${id}`);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {error && <div className="text-sm rounded-lg px-3 py-2 mb-4" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>}

      <div className="card flex items-center gap-3 p-3.5 mb-5.5 flex-wrap">
        <div className="w-10 h-10 flex-none rounded-[11px] flex items-center justify-center" style={{ background: "#dbeafe", color: "#1e3a8a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6 1.6 0 3 .3 4.2.9" /><path d="M18 14v6M15 17h6" /></svg>
        </div>
        <div className="flex-none">
          <div className="font-bold text-sm">Create account</div>
          <div className="text-[11.5px]" style={{ color: "#8a968f" }}>Add a new user to the system</div>
        </div>
        <input className="input flex-1" style={{ minWidth: 120 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
        <input className="input flex-1" style={{ minWidth: 120 }} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" />
        <input className="input flex-1" style={{ minWidth: 120 }} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Password" />
        <button className="btn btn-primary flex-none" onClick={createAccount}>Create</button>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-3.5 px-4.5 py-3 border-b font-mono uppercase" style={{ gridTemplateColumns: "1.7fr 1fr 1.6fr 1.6fr auto", background: "#f8faf9", borderColor: "#e3e8e6", fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", color: "#5c6a67" }}>
          <div>User</div><div>Team</div><div>Email</div><div>Password</div><div />
        </div>
        {accounts.map((a) => (
          <div key={a.id} className="grid gap-3.5 px-4.5 py-3 border-b items-center hover:bg-[#f8faf9]" style={{ gridTemplateColumns: "1.7fr 1fr 1.6fr 1.6fr auto", borderColor: "#f0f3f2" }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#3d4a47" }}>{initials(a.name)}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{a.name}</span>
                  {a.admin && <span className="font-mono uppercase font-semibold rounded-full px-1.5 py-0.5" style={{ fontSize: 9, color: "#92400e", background: "#fef3c7" }}>Admin</span>}
                </div>
                <div className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{a.title}</div>
              </div>
            </div>
            <div className="text-[12.5px]" style={{ color: a.team ? "#3d4a47" : "#96a19d" }}>{a.team?.name ?? "Unassigned"}</div>
            <div className="flex items-center gap-1.5">
              <input
                className="input flex-1 min-w-0"
                style={{ height: 34 }}
                type="email"
                value={emailDrafts[a.id] ?? a.email}
                onChange={(e) => setEmailDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                placeholder="Set email"
              />
              <button className="btn btn-secondary flex-none" style={{ height: 34, fontSize: 12 }} onClick={() => saveEmail(a.id)}>Save</button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                className="input flex-1 min-w-0"
                style={{ height: 34 }}
                type="password"
                value={pwDrafts[a.id] ?? ""}
                onChange={(e) => setPwDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                placeholder="Change password"
              />
              <button className="btn btn-secondary flex-none" style={{ height: 34, fontSize: 12 }} onClick={() => savePassword(a.id)}>Save</button>
            </div>
            <button onClick={() => deleteUser(a.id)} title="Delete user" className="flex-none w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer hover:border-[#fca5a5] hover:text-[#b91c1c] hover:bg-[#fef2f2]" style={{ borderColor: "#e3e8e6", color: "#8a968f" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
            </button>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] text-white rounded-full px-5 py-2.5 font-semibold text-[13px]" style={{ background: "#10201d", boxShadow: "0 12px 34px rgba(9,20,17,.32)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
