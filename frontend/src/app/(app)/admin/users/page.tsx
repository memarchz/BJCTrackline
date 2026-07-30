"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type { TeamRef, UserSummary } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function ManageUsersPage() {
  const [teams, setTeams] = useState<TeamRef[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [teamName, setTeamName] = useState("");
  const [pickerTeamId, setPickerTeamId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [teamsRes, usersRes] = await Promise.all([api.get<{ teams: TeamRef[] }>("/teams"), api.get<{ users: UserSummary[] }>("/users")]);
    setTeams(teamsRes.data.teams);
    setUsers(usersRes.data.users);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, []);

  async function addTeam() {
    const name = teamName.trim();
    if (!name) return;
    try {
      await api.post("/teams", { name });
      setTeamName("");
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeMember(userId: string) {
    await api.patch(`/users/${userId}`, { teamId: null });
    refresh();
  }

  async function assignMember(userId: string, teamId: string) {
    await api.patch(`/users/${userId}`, { teamId });
    refresh();
  }

  async function deleteUser(userId: string) {
    if (!window.confirm("Delete this user? This can't be undone.")) return;
    try {
      await api.delete(`/users/${userId}`);
      refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function confirmPicker() {
    const ids = Object.keys(picked).filter((k) => picked[k]);
    await Promise.all(ids.map((id) => assignMember(id, pickerTeamId!)));
    setPickerTeamId(null);
    setPicked({});
  }

  const unassigned = users.filter((u) => !u.team);
  const pickerTeam = teams.find((t) => t.id === pickerTeamId);
  const pickList = unassigned.filter((u) => !pickerSearch.trim() || u.name.toLowerCase().includes(pickerSearch.trim().toLowerCase()));

  return (
    <div style={{ maxWidth: 1120 }}>
      {error && (
        <div className="text-sm rounded-lg px-3 py-2 mb-4" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>
      )}

      <div className="card flex items-center gap-3 p-3.5 mb-5.5 flex-wrap">
        <div className="w-10 h-10 flex-none rounded-[11px] flex items-center justify-center" style={{ background: "#dbeafe", color: "#1e3a8a" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M17.5 14.5v6M14.5 17.5h6" /></svg>
        </div>
        <div className="flex-none">
          <div className="font-bold text-sm">Create a team</div>
          <div className="text-[11.5px]" style={{ color: "#8a968f" }}>Add a new team to the organization</div>
        </div>
        <input
          className="input flex-1"
          style={{ minWidth: 160 }}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTeam()}
          placeholder="e.g. Data Science"
        />
        <button className="btn btn-primary flex-none" onClick={addTeam}>Add team</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => {
          const members = users.filter((u) => u.team?.id === team.id);
          return (
            <div key={team.id} className="card flex flex-col overflow-hidden">
              <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b" style={{ borderColor: "#f0f3f2" }}>
                <div className="font-bold text-[15px]">{team.name}</div>
                <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "#1e3a8a", background: "#dbeafe" }}>{members.length} members</span>
              </div>
              <div className="flex flex-col">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4.5 py-2.5 border-b hover:bg-[#f8faf9]" style={{ borderColor: "#f4f6f5" }}>
                    <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#3d4a47" }}>{initials(m.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{m.name}</span>
                        {m.admin && <span className="font-mono uppercase font-semibold rounded-full px-1.5 py-0.5" style={{ fontSize: 9, color: "#92400e", background: "#fef3c7" }}>Admin</span>}
                      </div>
                      <div className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{m.title}</div>
                    </div>
                    <button onClick={() => removeMember(m.id)} title="Remove from team" className="flex-none w-[30px] h-[30px] rounded-lg border flex items-center justify-center cursor-pointer hover:border-[#fca5a5] hover:text-[#b91c1c] hover:bg-[#fef2f2]" style={{ borderColor: "#e3e8e6", color: "#8a968f" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  </div>
                ))}
                {members.length === 0 && <div className="px-4.5 py-4 text-[12.5px] italic" style={{ color: "#96a19d" }}>No members yet — add one below.</div>}
              </div>
              <div className="mt-auto px-4.5 py-3 border-t" style={{ borderColor: "#f0f3f2", background: "#fbfcfc" }}>
                <button
                  onClick={() => {
                    setPickerTeamId(team.id);
                    setPickerSearch("");
                    setPicked({});
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold cursor-pointer"
                  style={{ border: "1px dashed #b6c0bc", background: "#fff", color: "#1e3a8a" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                  Add member
                </button>
              </div>
            </div>
          );
        })}
        {teams.length === 0 && <div className="text-sm" style={{ color: "#8a968f" }}>No teams yet — create one above.</div>}
      </div>

      {pickerTeamId && (
        <div className="backdrop-anim fixed inset-0 z-[70] flex items-center justify-center p-6" style={{ background: "rgba(9,20,17,.5)" }} onClick={() => setPickerTeamId(null)}>
          <div className="dialog-anim w-[460px] max-w-full max-h-[82vh] bg-white rounded-2xl flex flex-col overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5.5 py-4.5 border-b" style={{ borderColor: "#f0f3f2" }}>
              <div className="font-bold text-base">Add members to {pickerTeam?.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "#8a968f" }}>Pick from people who aren&apos;t on a team yet.</div>
              <input className="input w-full mt-3.5" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="Search by name" />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {pickList.map((u) => {
                const checked = !!picked[u.id];
                return (
                  <div key={u.id} onClick={() => setPicked((p) => ({ ...p, [u.id]: !p[u.id] }))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[#f8faf9]">
                    <div className="w-5 h-5 flex-none rounded-md flex items-center justify-center" style={{ border: `2px solid ${checked ? "#2563eb" : "#cdd7d3"}`, background: checked ? "#2563eb" : "#fff" }}>
                      {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><path d="M20 6L9 17l-5-5" /></svg>}
                    </div>
                    <div className="w-8 h-8 flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#3d4a47" }}>{initials(u.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{u.name}</div>
                      <div className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{u.title}</div>
                    </div>
                  </div>
                );
              })}
              {pickList.length === 0 && (
                <div className="py-6.5 px-4 text-center text-[13px]" style={{ color: "#96a19d" }}>
                  No unassigned people match. Create accounts in <span className="font-semibold" style={{ color: "#5c6a67" }}>User Accounts</span>.
                </div>
              )}
            </div>
            <div className="flex items-center gap-2.5 px-5.5 py-3.5 border-t" style={{ borderColor: "#f0f3f2" }}>
              <div className="text-xs mr-auto" style={{ color: "#5c6a67" }}>{Object.values(picked).filter(Boolean).length} selected</div>
              <button className="btn btn-secondary" onClick={() => setPickerTeamId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmPicker}>Add selected</button>
            </div>
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="mt-6.5">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#8a968f" }} />
            <span className="font-bold text-[15px]" style={{ color: "#3d4a47" }}>Unassigned members</span>
            <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: "#5c6a67", background: "#eef1f0" }}>{unassigned.length}</span>
          </div>
          <div className="card overflow-hidden">
            {unassigned.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-4.5 py-3 border-b hover:bg-[#f8faf9]" style={{ borderColor: "#f4f6f5" }}>
                <div className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs" style={{ background: "#eef1f0", color: "#3d4a47" }}>{initials(u.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis">{u.name}</div>
                  <div className="text-[11.5px] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: "#8a968f" }}>{u.title}</div>
                </div>
                <select
                  className="input flex-none"
                  style={{ height: 36, width: 150 }}
                  value={assignSel[u.id] ?? teams[0]?.id ?? ""}
                  onChange={(e) => setAssignSel((s) => ({ ...s, [u.id]: e.target.value }))}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button className="btn btn-primary flex-none" style={{ height: 36 }} onClick={() => assignMember(u.id, assignSel[u.id] ?? teams[0]?.id)}>
                  Assign
                </button>
                <button onClick={() => deleteUser(u.id)} title="Delete user" className="flex-none w-[30px] h-[30px] rounded-lg border flex items-center justify-center cursor-pointer hover:border-[#fca5a5] hover:text-[#b91c1c] hover:bg-[#fef2f2]" style={{ borderColor: "#e3e8e6", color: "#8a968f" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
