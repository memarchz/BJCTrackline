"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { TaskRowCard } from "./TaskRowCard";
import { SearchIcon } from "@/components/nav-icons";

export interface BandDef {
  key: string;
  label: string;
  tasks: Task[];
  accent: string;
  gradient: string;
  borderColor: string;
  darkText: string;
  pillBg: string;
  iconPath: string;
  actionLabel?: string;
  onAction?: (taskIds: string[]) => void;
  emptyText: string;
}

const PAGE_SIZE = 4;

export function TaskBands({
  bands,
  plain,
  onOpen,
  onToggleStar,
  onDismissNudge,
}: {
  bands: BandDef[];
  plain?: boolean;
  onOpen: (taskId: string) => void;
  onToggleStar: (task: Task) => void;
  onDismissNudge?: (task: Task) => void;
}) {
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pages, setPages] = useState<Record<string, number>>({});

  const q = query.trim().toLowerCase();
  const filtering = !!(q || fromDate || toDate);

  function match(t: Task) {
    const due = t.viewerDueDate ?? t.dueDate;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    if (fromDate && due.slice(0, 10) < fromDate) return false;
    if (toDate && due.slice(0, 10) > toDate) return false;
    return true;
  }

  function setPage(key: string, n: number) {
    setPages((p) => ({ ...p, [key]: n }));
  }

  return (
    <div className="flex flex-col gap-5.5 max-w-[1180px]">
      {!plain && (
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${bands.length},minmax(0,1fr))` }}>
          {bands.map((b) => (
            <div key={b.key} className="rounded-2xl flex items-center gap-4.5 px-6 py-5.5 border" style={{ borderColor: b.borderColor, background: b.gradient }}>
              <div className="w-14 h-14 flex-none rounded-2xl flex items-center justify-center text-white" style={{ width: 56, height: 56, background: b.accent }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d={b.iconPath} />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 40, lineHeight: 1, color: b.darkText, fontWeight: 600 }}>{b.tasks.length}</div>
                <div className="uppercase font-semibold" style={{ fontSize: 12, letterSpacing: ".06em", color: b.accent, marginTop: 6 }}>{b.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 220 }}>
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input className="input w-full" style={{ paddingLeft: 34 }} placeholder="Search task name…" value={query} onChange={(e) => { setQuery(e.target.value); setPages({}); }} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium" style={{ color: "#5c6a67" }}>Due</span>
          <input className="input" style={{ width: "auto" }} type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPages({}); }} />
          <span className="text-xs" style={{ color: "#8a968f" }}>→</span>
          <input className="input" style={{ width: "auto" }} type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPages({}); }} />
        </div>
        {filtering && (
          <button className="btn btn-secondary" onClick={() => { setQuery(""); setFromDate(""); setToDate(""); setPages({}); }}>
            Clear
          </button>
        )}
      </div>

      {bands.map((b) => {
        const tasks = b.tasks.filter(match);
        const pageCount = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
        const page = Math.min(pages[b.key] ?? 0, pageCount - 1);
        const start = page * PAGE_SIZE;
        const pageTasks = tasks.slice(start, start + PAGE_SIZE);
        const showAction = !!(b.actionLabel && tasks.length && !filtering);

        return (
          <div key={b.key}>
            {!plain && (
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.accent }} />
                <span className="font-bold text-[15px]" style={{ color: b.darkText }}>{b.label}</span>
                <span className="font-mono text-[11px] font-semibold rounded-full px-2.5 py-0.5" style={{ color: b.accent, background: b.pillBg }}>{tasks.length}</span>
                {showAction && b.onAction && (
                  <button
                    onClick={() => b.onAction!(tasks.map((t) => t.id))}
                    title={b.actionLabel}
                    aria-label={b.actionLabel}
                    className="ml-auto w-[38px] h-[38px] rounded-[11px] border-none text-white cursor-pointer flex items-center justify-center hover:-translate-y-0.5"
                    style={{ background: b.accent }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {pageTasks.length > 0 && !plain && (
                <div className="flex items-center gap-4 px-4.5 py-2 rounded-[10px] border font-mono uppercase" style={{ background: b.pillBg, borderColor: b.borderColor, fontSize: 10.5, fontWeight: 600, letterSpacing: ".06em", color: b.darkText }}>
                  <div className="flex-1 min-w-0">Task</div>
                  <div className="flex-none" style={{ width: 132 }}>Priority · Impact</div>
                  <div className="flex-none text-right" style={{ width: 110 }}>Due date</div>
                  <div className="flex-none" style={{ width: 68 }} />
                </div>
              )}
              {pageTasks.map((t) => (
                // In "plain" bands (Starred, History) a single section can mix
                // several statuses, so let each row color itself by its own
                // status instead of the whole band's fixed accent.
                <TaskRowCard
                  key={t.id}
                  task={t}
                  stripColor={plain ? undefined : b.accent}
                  onOpen={() => onOpen(t.id)}
                  onToggleStar={() => onToggleStar(t)}
                  onDismissNudge={onDismissNudge ? () => onDismissNudge(t) : undefined}
                />
              ))}
              {tasks.length === 0 && b.tasks.length === 0 && (
                <div className="rounded-xl border border-dashed p-5.5 text-center text-[13px]" style={{ borderColor: "#cdd7d3", color: "#8a968f" }}>{b.emptyText}</div>
              )}
              {tasks.length === 0 && b.tasks.length > 0 && (
                <div className="rounded-xl border border-dashed p-5.5 text-center text-[13px]" style={{ borderColor: "#cdd7d3", color: "#8a968f" }}>No tasks match your search.</div>
              )}
            </div>

            {tasks.length > PAGE_SIZE && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-xs mr-1" style={{ color: "#5c6a67" }}>
                  {start + 1}–{Math.min(start + PAGE_SIZE, tasks.length)} of {tasks.length}
                </span>
                <button
                  disabled={page === 0}
                  onClick={() => setPage(b.key, Math.max(0, page - 1))}
                  className="w-[30px] h-[30px] rounded-[8px] border flex items-center justify-center font-mono text-xs font-semibold"
                  style={{ borderColor: "#e3e8e6", color: page === 0 ? "#c2cbc7" : "#3d4a47", background: "#fff", cursor: page === 0 ? "default" : "pointer" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(b.key, i)}
                    className="w-[30px] h-[30px] rounded-[8px] border font-mono text-xs font-semibold"
                    style={{ borderColor: i === page ? b.accent : "#e3e8e6", background: i === page ? b.accent : "#fff", color: i === page ? "#fff" : "#3d4a47", cursor: "pointer" }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === pageCount - 1}
                  onClick={() => setPage(b.key, Math.min(pageCount - 1, page + 1))}
                  className="w-[30px] h-[30px] rounded-[8px] border flex items-center justify-center font-mono text-xs font-semibold"
                  style={{ borderColor: "#e3e8e6", color: page === pageCount - 1 ? "#c2cbc7" : "#3d4a47", background: "#fff", cursor: page === pageCount - 1 ? "default" : "pointer" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
