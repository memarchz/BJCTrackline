"use client";

import { useCallback, useEffect, useState } from "react";

export interface ToastState {
  message: string;
  tone?: "success" | "error";
}

// Local (per-component) toast state — deliberately not a global context,
// since only a couple of places need "did that action actually work?"
// feedback right now. Auto-dismisses after a few seconds.
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "success") => {
    setToast({ message, tone });
  }, []);

  return { toast, showToast, clearToast: () => setToast(null) };
}

export function Toast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const isError = toast.tone === "error";
  const style = isError
    ? { bg: "#fef2f2", border: "#fecaca", text: "#7f1d1d", icon: "#b91c1c" }
    : { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d", icon: "#15803d" };

  return (
    <div
      className="pop-anim fixed bottom-6 right-6 z-[80] flex items-center gap-2.5 rounded-xl border pl-3.5 pr-2.5 py-3"
      style={{ background: style.bg, borderColor: style.border, boxShadow: "var(--shadow-lg)" }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={style.icon} strokeWidth={2} className="flex-none">
        {isError ? <path d="M12 8v4M12 16h.01M10.3 4.9L2.8 18a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 4.9a1.6 1.6 0 0 0-2.8 0z" /> : <path d="M20 6L9 17l-5-5" />}
      </svg>
      <div className="text-[13px] font-semibold" style={{ color: style.text }}>{toast.message}</div>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="flex-none w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none bg-transparent"
        style={{ color: style.text }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
