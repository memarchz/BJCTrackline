import type { Task } from "@/lib/types";

export function DeleteTaskConfirmDialog({
  task,
  busy,
  onConfirm,
  onCancel,
}: {
  task: Task | null;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!task) return null;

  return (
    <div
      className="backdrop-anim fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ background: "rgba(9,20,17,.5)" }}
      onClick={onCancel}
    >
      <div
        className="dialog-anim w-[420px] max-w-full bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg,#fef2f2,#fee2e2)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f3a9a9" strokeWidth={1.6} className="absolute top-6 left-8 opacity-70" style={{ transform: "rotate(-14deg)" }}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f3a9a9" strokeWidth={1.6} className="absolute bottom-8 right-10 opacity-60" style={{ transform: "rotate(16deg)" }}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </svg>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3.5"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", boxShadow: "0 10px 22px rgba(185,28,28,.35)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </div>
          <div className="font-bold text-[17px]">Delete this task?</div>
          <div className="text-[13px] mt-1 leading-relaxed max-w-[300px]" style={{ color: "#991b1b" }}>
            <span className="font-semibold">&quot;{task.title}&quot;</span> will be permanently removed
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <div className="text-[10.5px] font-semibold uppercase mb-1" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Team</div>
              <div className="text-[12.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">{task.team.name}</div>
            </div>
            <div className="flex-1 rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <div className="text-[10.5px] font-semibold uppercase mb-1" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Assignees</div>
              <div className="text-[12.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {task.assignees.map((a) => a.name).join(", ") || "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth={1.8} className="flex-none">
              <path d="M12 8v4M12 16h.01M10.3 4.9L2.8 18a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 4.9a1.6 1.6 0 0 0-2.8 0z" />
            </svg>
            <span className="text-[12px] font-medium leading-snug" style={{ color: "#7f1d1d" }}>
              This can&apos;t be undone — subtasks, files, and history go with it.
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4.5 border-t" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn text-white inline-flex items-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)" }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              "Deleting…"
            ) : (
              <>
                Delete task
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
