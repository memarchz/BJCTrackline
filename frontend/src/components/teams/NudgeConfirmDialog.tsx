import type { Task } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function NudgeConfirmDialog({
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
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg,#fffbeb,#fef3c7)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f3d99a" strokeWidth={1.6} className="absolute top-6 left-8 opacity-70" style={{ transform: "rotate(-18deg)" }}>
            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f3d99a" strokeWidth={1.6} className="absolute bottom-8 right-10 opacity-60" style={{ transform: "rotate(24deg)" }}>
            <path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3.5"
            style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)", boxShadow: "0 10px 22px rgba(180,83,9,.35)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </div>
          <div className="font-bold text-[17px]">Send a nudge?</div>
          <div className="text-[13px] mt-1 leading-relaxed max-w-[300px]" style={{ color: "#92400e" }}>
            A friendly reminder about <span className="font-semibold">&quot;{task.title}&quot;</span>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <div className="text-[10.5px] font-semibold uppercase mb-2" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Sending to</div>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 border" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono font-semibold flex-none" style={{ fontSize: 10, background: "#dbeafe", color: "#1e3a8a" }}>
                    {initials(a.name)}
                  </span>
                  <span className="text-[12.5px] font-medium">{a.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1 flex items-center gap-2 rounded-[11px] border px-3 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5c6a67" strokeWidth={1.8} className="flex-none">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
              </svg>
              <span className="text-[12px] font-medium" style={{ color: "#3d4a47" }}>Notification</span>
            </div>
            <div className="flex-1 flex items-center gap-2 rounded-[11px] border px-3 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5c6a67" strokeWidth={1.8} className="flex-none">
                <path d="M3 6h18v12H3z" />
                <path d="M3 6l9 7 9-7" />
              </svg>
              <span className="text-[12px] font-medium" style={{ color: "#3d4a47" }}>Email</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4.5 border-t" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn text-white inline-flex items-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#f59e0b,#b45309)" }}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? (
              "Sending…"
            ) : (
              <>
                Send nudge
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
