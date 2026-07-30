"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTaskList } from "@/lib/use-task-list";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { priorityBadgeClass, capitalize, statusLabel } from "@/lib/format";
import { CalendarIcon } from "@/components/nav-icons";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NOTES_KEY = "bjc_trackline_day_notes";

const STATUS_DOT: Record<string, string> = { todo: "#96a19d", in_progress: "#0284c7", submitted: "#d97706", rejected: "#b91c1c", completed: "#15803d" };
const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  todo: { bg: "#dbeafe", color: "#1e3a8a" },
  in_progress: { bg: "#dbeafe", color: "#1e3a8a" },
  submitted: { bg: "#fef3c7", color: "#92400e" },
  rejected: { bg: "#fee2e2", color: "#7f1d1d" },
  completed: { bg: "#dcfce7", color: "#14532d" },
};

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function CalendarInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { tasks } = useTaskList({ assigneeId: user?.id, archivedAny: true });
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(searchParams.get("open"));
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
      if (raw) setNotes(JSON.parse(raw));
    } catch {
      // ignore malformed/blocked storage
    }
  }, []);

  function setNoteFor(key: string, value: string) {
    setNotes((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      } catch {
        // ignore storage write failures (e.g. private browsing quota)
      }
      return next;
    });
  }

  const tasksByDay = useMemo(() => {
    const map = new Map<number, typeof tasks>();
    for (const t of tasks) {
      const d = new Date(t.viewerDueDate ?? t.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), t]);
      }
    }
    return map;
  }, [tasks, year, month]);

  function goMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
  }

  const firstDow = new Date(year, month, 1).getDay();
  const daysIn = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const cells: { day: number | null }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null });
  for (let d = 1; d <= daysIn; d++) cells.push({ day: d });

  const modalTasks = openDay ? (tasksByDay.get(openDay) ?? []) : [];
  const openKey = openDay ? dayKey(year, month, openDay) : null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-5.5 py-4.5 text-white" style={{ background: "#2563eb" }}>
        <CalendarIcon stroke="#fff" />
        <div className="font-bold text-base">{MONTHS[month]} {year}</div>
        <div className="flex items-center gap-1.5 ml-2">
          <button onClick={() => goMonth(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,.16)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button onClick={() => goMonth(1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white border-none cursor-pointer" style={{ background: "rgba(255,255,255,.16)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3.5 text-[11px]" style={{ color: "rgba(255,255,255,.85)" }}>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#93c5fd" }} />Tasks due</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#fbbf24" }} />Note</span>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
        {WEEKDAYS.map((w, i) => (
          <div key={w} className="py-2.5 text-center font-mono uppercase" style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", color: i === 0 || i === 6 ? "#b91c1c" : "#96a19d" }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} style={{ minHeight: 92, background: "#fbfcfc", borderRightColor: "#f4f6f5", borderBottomColor: "#f4f6f5" }} className="border-r border-b" />;
          const dayTasks = tasksByDay.get(cell.day) ?? [];
          const hasNote = !!notes[dayKey(year, month, cell.day)]?.trim();
          const isToday = isCurrentMonth && cell.day === now.getDate();
          const dow = new Date(year, month, cell.day).getDay();
          const weekend = dow === 0 || dow === 6;
          const hasHighPriority = dayTasks.some((t) => t.priority === "high");
          const bg = isToday ? "#eff6ff" : dayTasks.length ? "#f6faff" : hasNote ? "#fffdf5" : weekend ? "#fcfdfc" : "#fff";
          const topBar = dayTasks.length ? (hasHighPriority ? "#dc2626" : "#2563eb") : hasNote ? "#f59e0b" : "transparent";
          return (
            <div
              key={i}
              onClick={() => setOpenDay(cell.day)}
              className="border-r border-b p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-[#eef4fb]"
              style={{
                minHeight: 92,
                borderTopWidth: 2,
                borderTopStyle: "solid",
                borderTopColor: topBar,
                borderRightColor: "#f4f6f5",
                borderBottomColor: "#f4f6f5",
                background: bg,
              }}
            >
              <div className="flex items-center justify-between">
                {isToday ? (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-semibold text-xs text-white" style={{ background: "#2563eb" }}>{cell.day}</span>
                ) : (
                  <span className="font-mono font-semibold text-[13px] pl-0.5" style={{ color: weekend ? "#b91c1c" : "#3d4a47" }}>{cell.day}</span>
                )}
                {hasNote && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2}>
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                  </svg>
                )}
              </div>
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-1">
                  {dayTasks.slice(0, 2).map((t) => {
                    const chip = STATUS_CHIP[t.viewerStatus] ?? STATUS_CHIP.todo;
                    return (
                      <div key={t.id} className="text-[10px] font-medium rounded whitespace-nowrap overflow-hidden text-ellipsis px-1.5 py-0.5" style={{ background: chip.bg, color: chip.color }}>
                        {t.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 2 && <div className="font-mono" style={{ fontSize: 9.5, color: "#96a19d" }}>+{dayTasks.length - 2} more</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openDay !== null && openKey && (
        <div className="backdrop-anim fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(9,20,17,.5)" }} onClick={() => setOpenDay(null)}>
          <div className="dialog-anim w-[440px] max-w-full max-h-[86vh] bg-white rounded-2xl flex flex-col overflow-hidden" style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3.5 px-6 py-5 border-b" style={{ borderColor: "#eef1f0" }}>
              <div className="w-12 h-12 flex-none rounded-xl flex flex-col items-center justify-center leading-none" style={{ background: "#eff6ff", color: "#1e3a8a" }}>
                <span className="font-mono uppercase" style={{ fontSize: 9, color: "#2563eb", letterSpacing: ".05em" }}>{MONTHS[month].slice(0, 3)}</span>
                <span className="font-mono font-bold" style={{ fontSize: 19 }}>{openDay}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base">{new Date(year, month, openDay).toLocaleDateString("en-US", { weekday: "long" })}</div>
                <div className="text-xs" style={{ color: "#96a19d" }}>{modalTasks.length} task(s) due</div>
              </div>
              <button onClick={() => setOpenDay(null)} className="w-8 h-8 flex-none rounded-lg border bg-white flex items-center justify-center cursor-pointer" style={{ borderColor: "#e3e8e6", color: "#5c6a67" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-4.5">
              <div>
                <div className="font-mono uppercase font-semibold mb-2.5" style={{ fontSize: 10.5, letterSpacing: ".05em", color: "#96a19d" }}>Tasks due</div>
                <div className="flex flex-col gap-2">
                  {modalTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setOpenTaskId(t.id);
                        setOpenDay(null);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2.5 border rounded-[10px] cursor-pointer hover:bg-[#f8faf9]"
                      style={{ borderColor: "#eef1f0" }}
                    >
                      <span className="w-2 h-2 rounded-full flex-none" style={{ background: STATUS_DOT[t.viewerStatus] ?? "#96a19d" }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis">
                          {t.viewerSubtaskTitle ? `${t.title} · ${t.viewerSubtaskTitle}` : t.title}
                        </div>
                        <div className="text-[10.5px]" style={{ color: "#96a19d" }}>{statusLabel(t.viewerStatus)}</div>
                      </div>
                      <span className={priorityBadgeClass(t.priority)}>{capitalize(t.priority)}</span>
                    </div>
                  ))}
                  {modalTasks.length === 0 && <div className="rounded-[10px] border border-dashed p-4 text-center text-[12.5px]" style={{ borderColor: "#cdd7d3", color: "#96a19d" }}>No tasks due this day.</div>}
                </div>
              </div>
              <div>
                <div className="font-mono uppercase font-semibold mb-2.5" style={{ fontSize: 10.5, letterSpacing: ".05em", color: "#96a19d" }}>My note</div>
                <textarea
                  className="input w-full"
                  style={{ minHeight: 96, resize: "vertical" }}
                  placeholder="Jot a note for this day…"
                  value={notes[openKey] ?? ""}
                  onChange={(e) => setNoteFor(openKey, e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <TaskDrawer taskId={openTaskId} onClose={() => setOpenTaskId(null)} onChanged={() => {}} />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarInner />
    </Suspense>
  );
}
