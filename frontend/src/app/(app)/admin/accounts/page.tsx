"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
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
    try {
      const res = await api.get<{ users: UserSummary[] }>("/users");
      setAccounts(res.data.users);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, []);

  async function createAccount() {
    // Disabled as per user request
    return;
  }

  async function saveEmail(id: string) {
    // Disabled as per user request
    return;
  }

  async function savePassword(id: string) {
    // Disabled as per user request
    return;
  }

  async function deleteUser(id: string) {
    // Disabled as per user request
    return;
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      {error && <div className="text-sm rounded-lg px-3 py-2 mb-4" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>}

      {/* Corporate Info Banner */}
      <div className="card p-4.5 mb-5.5 flex items-start gap-3.5" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none mt-0.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div>
          <div className="font-bold text-sm">User Account Management Suspended</div>
          <div className="text-xs mt-1 leading-relaxed opacity-90">
            BJC Trackline has been updated to handle user security, passwords, and profiles via the corporate EHR Login API and centralized Master Data system. This page is kept for viewing legacy account records. Creating, deleting, or updating credentials directly on this page is disabled.
          </div>
        </div>
      </div>

      <div className="card flex items-center gap-3 p-3.5 mb-5.5 flex-wrap opacity-60">
        <div className="w-10 h-10 flex-none rounded-[11px] flex items-center justify-center" style={{ background: "#dbeafe", color: "#1e3a8a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6 1.6 0 3 .3 4.2.9" /><path d="M18 14v6M15 17h6" /></svg>
        </div>
        <div className="flex-none">
          <div className="font-bold text-sm">Create an account</div>
          <div className="text-[11.5px]" style={{ color: "#8a968f" }}>Add a local system account (Managed via Corporate HR / Master Data)</div>
        </div>
        <input className="input" style={{ width: 140 }} placeholder="Full name" value={newName} disabled={true} onChange={(e) => setNewName(e.target.value)} />
        <input className="input" style={{ width: 160 }} placeholder="Email (optional)" value={newEmail} disabled={true} onChange={(e) => setNewEmail(e.target.value)} />
        <input className="input" style={{ width: 130 }} type="password" placeholder="Password (6+ chars)" value={newPw} disabled={true} onChange={(e) => setNewPw(e.target.value)} />
        <button className="btn btn-primary flex-none" disabled={true} onClick={createAccount}>Create</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fbfcfc", borderBottom: "1px solid #f0f3f2" }}>
              <th className="px-5.5 py-3 font-semibold text-[13px] text-slate-700">Account</th>
              <th className="px-5.5 py-3 font-semibold text-[13px] text-slate-700">Email Address</th>
              <th className="px-5.5 py-3 font-semibold text-[13px] text-slate-700">New Password</th>
              <th className="px-5.5 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-b hover:bg-[#fbfcfc]" style={{ borderColor: "#f4f6f5" }}>
                <td className="px-5.5 py-3 flex items-center gap-3">
                  <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#3d4a47" }}>{initials(acc.name)}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{acc.name}</div>
                    <div className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{acc.title || "Employee"} &bull; {acc.id}</div>
                  </div>
                </td>
                <td className="px-5.5 py-3">
                  <div className="flex items-center gap-2 max-w-[210px] opacity-70">
                    <input
                      className="input w-full text-[13px]"
                      style={{ height: 32 }}
                      value={emailDrafts[acc.id] ?? acc.email}
                      disabled={true}
                      onChange={(e) => setEmailDrafts((d) => ({ ...d, [acc.id]: e.target.value }))}
                    />
                    {(emailDrafts[acc.id] ?? acc.email) !== acc.email && (
                      <button className="btn btn-secondary flex-none" style={{ height: 32, padding: "0 10px" }} disabled={true} onClick={() => saveEmail(acc.id)}>Save</button>
                    )}
                  </div>
                </td>
                <td className="px-5.5 py-3">
                  <div className="flex items-center gap-2 max-w-[200px] opacity-70">
                    <input
                      type="password"
                      className="input w-full text-[13px]"
                      style={{ height: 32 }}
                      placeholder="Enter to change"
                      value={pwDrafts[acc.id] ?? ""}
                      disabled={true}
                      onChange={(e) => setPwDrafts((d) => ({ ...d, [acc.id]: e.target.value }))}
                    />
                    {pwDrafts[acc.id] && (
                      <button className="btn btn-secondary flex-none" style={{ height: 32, padding: "0 10px" }} disabled={true} onClick={() => savePassword(acc.id)}>Save</button>
                    )}
                  </div>
                </td>
                <td className="px-5.5 py-3 text-right">
                  <button disabled={true} title="Delete account (Disabled)" className="inline-flex w-[30px] h-[30px] rounded-lg border items-center justify-center opacity-40 cursor-not-allowed" style={{ borderColor: "#e3e8e6", color: "#8a968f" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[80] bg-[#1e293b] text-white text-sm font-semibold rounded-lg px-4.5 py-3 shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
