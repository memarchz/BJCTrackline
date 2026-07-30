"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { TorRequest, TorStatus } from "@/lib/types";

const STATUS_META: Record<TorStatus, { label: string; color: string; bg: string; border: string; gradient: string }> = {
  pending_chief_approval: { label: "Pending Chief Approval", color: "#d97706", bg: "#fef3c7", border: "#fde68a", gradient: "linear-gradient(135deg,#fffbeb,#fef3c7)" },
  tor: { label: "TOR", color: "#2563eb", bg: "#dbeafe", border: "#bfdbfe", gradient: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
  bidding: { label: "Bidding", color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe", gradient: "linear-gradient(135deg,#f5f3ff,#ede9fe)" },
  pta: { label: "PTA", color: "#0284c7", bg: "#e0f2fe", border: "#bae6fd", gradient: "linear-gradient(135deg,#f0f9ff,#e0f2fe)" },
  pr: { label: "PR", color: "#0891b2", bg: "#cffafe", border: "#a5f3fc", gradient: "linear-gradient(135deg,#ecfeff,#cffafe)" },
  po: { label: "PO", color: "#4f46e5", bg: "#e0e7ff", border: "#c7d2fe", gradient: "linear-gradient(135deg,#eef2ff,#e0e7ff)" },
  completed: { label: "Completed", color: "#15803d", bg: "#dcfce7", border: "#bbf7d0", gradient: "linear-gradient(135deg,#f0fdf4,#dcfce7)" },
};

const STEP_LABELS = ["TOR", "Bidding", "PTA", "PR", "PO", "Completed"];
const SUMMARY_STATUSES: TorStatus[] = ["pending_chief_approval", "tor", "pta", "completed"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TorPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TorRequest[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await api.get<{ requests: TorRequest[] }>("/tor");
    setRequests(res.data.requests);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, []);

  if (!requests) return <div className="text-sm" style={{ color: "#5c6a67" }}>Loading…</div>;

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  async function review(action: "advance" | "reject") {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/tor/${selected.id}/review`, { action, comment: comment.trim() || undefined });
      setComment("");
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (selected) {
    const meta = STATUS_META[selected.status];
    const pct = Math.round((selected.step / 6) * 100);
    return (
      <div style={{ maxWidth: 1120 }}>
        <button className="mb-3 bg-transparent border-none cursor-pointer font-semibold text-sm p-0" style={{ color: "#2563eb" }} onClick={() => { setSelectedId(null); setComment(""); setError(null); }}>
          ← All requests
        </button>
        <div className="card overflow-hidden">
          <div className="flex items-start gap-3.5 px-6.5 py-5.5 border-b" style={{ borderColor: "#f0f3f2" }}>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-xl">{selected.project}</div>
              <div className="font-mono text-[12.5px] mt-0.5" style={{ color: "#8a968f" }}>{selected.code} · {selected.dept}</div>
            </div>
            <span className="font-mono text-[11px] font-semibold rounded-full px-3 py-1.5 uppercase whitespace-nowrap" style={{ color: meta.color, background: meta.bg, letterSpacing: ".03em" }}>{meta.label}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 1, background: "#f0f3f2" }}>
            {[
              { label: "Requester", value: selected.requester.name },
              { label: "Budget", value: `฿${Number(selected.amount).toLocaleString()}`, mono: true },
              { label: "Opened", value: fmtDate(selected.openedDate) },
              { label: "Progress", value: `${pct}%`, mono: true, color: meta.color },
            ].map((f) => (
              <div key={f.label} className="bg-white px-5.5 py-4">
                <div className="font-mono uppercase" style={{ fontSize: 10, color: "#96a19d", letterSpacing: ".05em", marginBottom: 5 }}>{f.label}</div>
                <div className="font-semibold text-[13.5px]" style={{ fontFamily: f.mono ? "var(--font-mono)" : undefined, color: f.color }}>{f.value}</div>
              </div>
            ))}
          </div>

          <div className="px-6.5 pt-7 pb-6.5">
            <div className="font-bold text-sm mb-5.5">TOR lifecycle</div>
            <div className="flex items-start relative">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = n < selected.step;
                const current = n === selected.step;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center relative min-w-0">
                    {i > 0 && (
                      <div className="absolute" style={{ top: 17, left: "-50%", width: "100%", height: 3, background: n <= selected.step ? "#15803d" : "#e3e8e6" }} />
                    )}
                    <div
                      className="relative z-10 rounded-full flex items-center justify-center font-mono font-bold text-sm"
                      style={{ width: 36, height: 36, background: done ? "#15803d" : current ? meta.color : "#fff", border: `2px solid ${done ? "#15803d" : current ? meta.color : "#d7dedb"}`, color: current ? "#fff" : done ? "#fff" : "#b6c0bc" }}
                    >
                      {done ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}><path d="M20 6L9 17l-5-5" /></svg>
                      ) : (
                        n
                      )}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-center" style={{ color: done || current ? "#10201d" : "#96a19d" }}>{label}</div>
                    {current && <div className="mt-0.5 font-mono uppercase" style={{ fontSize: 9, fontWeight: 600, color: meta.color, letterSpacing: ".05em" }}>Current</div>}
                  </div>
                );
              })}
            </div>

            <div className="mt-7">
              <div className="flex justify-between mb-1.5">
                <span className="text-xs font-medium" style={{ color: "#5c6a67" }}>Overall progress</span>
                <span className="font-mono text-xs font-semibold" style={{ color: meta.color }}>{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#eef1f0" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
              </div>
            </div>

            {selected.comment && (
              <div
                className="mt-6 rounded-xl p-4 flex gap-3"
                style={{ border: `1px solid ${selected.rejected ? "#fca5a5" : "#bbf7d0"}`, background: selected.rejected ? "#fef2f2" : "#f0fdf4" }}
              >
                <div className="w-[34px] h-[34px] flex-none rounded-[9px] flex items-center justify-center" style={{ background: selected.rejected ? "#fee2e2" : "#dcfce7", color: selected.rejected ? "#b91c1c" : "#15803d" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    {selected.rejected ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M20 6L9 17l-5-5" />}
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[13.5px]" style={{ color: selected.rejected ? "#991b1b" : "#14532d" }}>{selected.rejected ? "Rejected by chief" : "Approved by chief"}</div>
                  <div className="text-[12.5px] mt-1 leading-relaxed" style={{ color: selected.rejected ? "#7f1d1d" : "#166534" }}>{selected.comment}</div>
                </div>
              </div>
            )}

            {user?.admin && selected.status !== "completed" && (
              <div className="mt-6 border-t pt-5" style={{ borderColor: "#f0f3f2" }}>
                <div className="font-bold text-sm mb-2.5">Chief review</div>
                {error && <div className="text-sm rounded-lg px-3 py-2 mb-2.5" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>}
                <textarea className="input w-full" style={{ minHeight: 72 }} placeholder="Add a comment (required to reject)…" value={comment} onChange={(e) => setComment(e.target.value)} />
                <div className="flex gap-2.5 mt-3">
                  <button className="btn btn-success" disabled={busy} onClick={() => review("advance")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M20 6L9 17l-5-5" /></svg>
                    Approve
                  </button>
                  <button className="btn btn-danger" disabled={busy || !comment.trim()} onClick={() => review("reject")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M6 6l12 12M18 6L6 18" /></svg>
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120 }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6.5">
        {SUMMARY_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const count = requests.filter((r) => r.status === s).length;
          return (
            <div key={s} className="rounded-2xl p-4.5 flex items-center gap-3.5 border" style={{ borderColor: meta.border, background: meta.gradient }}>
              <div className="w-12 h-12 flex-none rounded-[13px] flex items-center justify-center text-white" style={{ background: meta.color }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M8 3h8l3 3v15H5V3z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
              </div>
              <div>
                <div className="font-mono font-semibold" style={{ fontSize: 32, lineHeight: 1, color: meta.color }}>{count}</div>
                <div className="font-mono uppercase font-semibold mt-1.5" style={{ fontSize: 10.5, color: meta.color }}>{meta.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-baseline gap-2.5 mb-3.5">
        <div className="font-bold text-base">Project requests</div>
        <div className="text-[12.5px]" style={{ color: "#8a968f" }}>{requests.length} open requests</div>
        <button className="btn btn-primary ml-auto" onClick={() => setCreateOpen(true)}>+ New Request</button>
      </div>

      <div className="flex flex-col gap-3">
        {requests.map((r) => {
          const meta = STATUS_META[r.status];
          const pct = Math.round((r.step / 6) * 100);
          return (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="rounded-2xl bg-white cursor-pointer border hover:-translate-y-0.5"
              style={{
                borderTopColor: "#e3e8e6",
                borderRightColor: "#e3e8e6",
                borderBottomColor: "#e3e8e6",
                borderLeftWidth: 4,
                borderLeftStyle: "solid",
                borderLeftColor: meta.color,
                padding: "16px 20px",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">{r.project}</div>
                  <div className="font-mono text-[11.5px] mt-0.5" style={{ color: "#8a968f" }}>{r.code} · {r.dept}</div>
                </div>
                {r.rejected && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold rounded-full px-2.5 py-1 uppercase" style={{ color: "#b91c1c", background: "#fee2e2", border: "1px solid #fca5a5" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M6 6l12 12M18 6L6 18" /></svg>Rejected
                  </span>
                )}
                <span className="font-mono text-[10.5px] font-semibold rounded-full px-2.5 py-1 uppercase whitespace-nowrap" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b6c0bc" strokeWidth={2} className="flex-none"><path d="M9 6l6 6-6 6" /></svg>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#eef1f0" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
                <div className="font-mono text-[11px] font-semibold flex-none" style={{ color: "#5c6a67" }}>Step {r.step}/6 · {STEP_LABELS[Math.max(0, Math.min(5, r.step - 1))]}</div>
              </div>
              <div className="flex items-center gap-3.5 mt-2.5 text-[11.5px]" style={{ color: "#8a968f" }}>
                <span>Requester: <span className="font-medium" style={{ color: "#3d4a47" }}>{r.requester.name}</span></span>
                <span className="opacity-40">•</span>
                <span>Budget: <span className="font-medium font-mono" style={{ color: "#3d4a47" }}>฿{Number(r.amount).toLocaleString()}</span></span>
                <span className="opacity-40">•</span>
                <span>Opened {fmtDate(r.openedDate)}</span>
              </div>
            </div>
          );
        })}
        {requests.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-sm" style={{ borderColor: "#cdd7d3", color: "#8a968f" }}>No procurement requests yet.</div>}
      </div>

      {createOpen && (
        <CreateTorDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function CreateTorDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [project, setProject] = useState("");
  const [code, setCode] = useState("");
  const [dept, setDept] = useState("");
  const [amount, setAmount] = useState("");
  const [openedDate, setOpenedDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!project.trim() || !code.trim() || !dept.trim() || !amount) {
      setError("Fill in all fields.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/tor", { project: project.trim(), code: code.trim(), dept: dept.trim(), amount: Number(amount), openedDate });
      onCreated();
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't create this request"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="backdrop-anim fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(9,20,17,.5)" }} onClick={onClose}>
      <div className="dialog-anim w-[480px] max-w-full bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b font-bold text-lg" style={{ borderColor: "#eef1f0" }}>New TOR request</div>
        <div className="p-6 flex flex-col gap-3.5">
          {error && <div className="text-sm rounded-lg px-3 py-2" style={{ background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5" }}>{error}</div>}
          <div>
            <div className="text-xs font-semibold mb-1.5" style={{ color: "#5c6a67" }}>Project name</div>
            <input className="input w-full" value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. Cloud Data Warehouse Migration" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "#5c6a67" }}>TOR code</div>
              <input className="input w-full" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TOR-2026-0XX" />
            </div>
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "#5c6a67" }}>Department</div>
              <input className="input w-full" value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Engineering" />
            </div>
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "#5c6a67" }}>Budget (฿)</div>
              <input className="input w-full" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000000" />
            </div>
            <div>
              <div className="text-xs font-semibold mb-1.5" style={{ color: "#5c6a67" }}>Opened date</div>
              <input className="input w-full" type="date" value={openedDate} onChange={(e) => setOpenedDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 px-6 py-4 border-t" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? "Creating…" : "Create request"}</button>
        </div>
      </div>
    </div>
  );
}
