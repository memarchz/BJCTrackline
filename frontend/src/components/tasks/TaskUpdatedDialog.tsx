export function TaskUpdatedDialog({
  title,
  team,
  dueDate,
  assignees,
  onDone,
}: {
  title: string;
  team: string;
  dueDate: string;
  assignees: string[];
  onDone: () => void;
}) {
  return (
    <div
      className="backdrop-anim fixed inset-0 z-[70] flex items-center justify-center p-6"
      style={{ background: "rgba(9,20,17,.5)" }}
      onClick={onDone}
    >
      <div
        className="dialog-anim w-[420px] max-w-full bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 30px 70px rgba(9,20,17,.35)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg,#eff6ff,#dbeafe)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a6c6f7" strokeWidth={1.6} className="absolute top-6 left-8 opacity-70" style={{ transform: "rotate(-14deg)" }}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a6c6f7" strokeWidth={1.6} className="absolute bottom-8 right-10 opacity-60" style={{ transform: "rotate(16deg)" }}>
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </svg>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3.5"
            style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a8a)", boxShadow: "0 10px 22px rgba(29,78,216,.35)" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="font-bold text-[17px]">Task updated</div>
          <div className="text-[13px] mt-1 leading-relaxed max-w-[300px]" style={{ color: "#1e3a8a" }}>
            <span className="font-semibold">&quot;{title}&quot;</span> has been saved
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex gap-2.5">
            <div className="flex-1 rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <div className="text-[10.5px] font-semibold uppercase mb-1" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Team</div>
              <div className="text-[12.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">{team}</div>
            </div>
            <div className="flex-1 rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
              <div className="text-[10.5px] font-semibold uppercase mb-1" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Due</div>
              <div className="text-[12.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">{dueDate}</div>
            </div>
          </div>
          <div className="rounded-[11px] border px-3.5 py-2.5" style={{ borderColor: "#eef1f0", background: "#f8faf9" }}>
            <div className="text-[10.5px] font-semibold uppercase mb-1" style={{ color: "#96a19d", letterSpacing: ".07em" }}>Assignees</div>
            <div className="text-[12.5px] font-medium">{assignees.join(", ") || "—"}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 px-6 py-4.5 border-t" style={{ borderColor: "#eef1f0", background: "#fbfcfc" }}>
          <button
            className="btn text-white"
            style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a8a)" }}
            onClick={onDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
