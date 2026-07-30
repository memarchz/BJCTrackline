"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/hooks";
import { BellIcon, LogoutIcon, SearchIcon } from "@/components/nav-icons";

const PAGE_HEADERS: { match: string; title: string; sub: string }[] = [
  { match: "/dashboard", title: "Dashboard", sub: "Overview of your work and team activity" },
  { match: "/starred", title: "Starred", sub: "Tasks you've pinned for quick access" },
  { match: "/current-tasks", title: "Current Tasks", sub: "Your active work — new and in progress" },
  { match: "/pending-review", title: "Pending Review", sub: "Work you've submitted, and its review status" },
  { match: "/tasks", title: "Tasks", sub: "Full filterable task list" },
  { match: "/teams", title: "Teams", sub: "Your team's tasks and performance" },
  { match: "/calendar", title: "Calendar", sub: "Deadlines by due date" },
  { match: "/chat", title: "Chat", sub: "Team channels and direct messages" },
  { match: "/history", title: "History", sub: "Your completed tasks" },
  { match: "/tor", title: "TOR Request", sub: "Terms-of-Reference procurement requests" },
  { match: "/admin/teams", title: "All Teams", sub: "Browse and manage every team" },
  { match: "/admin/users", title: "Manage Users", sub: "Teams and team membership" },
  { match: "/admin/accounts", title: "User Accounts", sub: "Credentials and access" },
  { match: "/how-to", title: "How to use", sub: "Guide and FAQ" },
];

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const NOTIF_META: Record<string, { bg: string; color: string; path: string }> = {
  assigned: { bg: "#dbeafe", color: "#2563eb", path: "M12 5v14M5 12h14" },
  rejected: { bg: "#fee2e2", color: "#b91c1c", path: "M6 6l12 12M18 6L6 18" },
  approved: { bg: "#dcfce7", color: "#15803d", path: "M20 6L9 17l-5-5" },
  comment: { bg: "#fef3c7", color: "#b45309", path: "M4 5h16v11H8l-4 4V5z" },
  nudged: { bg: "#fef3c7", color: "#b45309", path: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" },
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { notifications, markAllRead, clearAll } = useNotifications();
  const [query, setQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const header = PAGE_HEADERS.find((h) => pathname.startsWith(h.match)) ?? { title: "BJC Trackline", sub: "" };
  const unreadCount = notifications.filter((n) => !n.read).length;

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/tasks?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="flex items-center gap-4 px-7 h-[70px] bg-white border-b flex-none relative" style={{ borderColor: "#e3e8e6" }}>
      <div className="min-w-0 mr-auto">
        <div className="font-bold text-[19px] tracking-tight">{header.title}</div>
        <div className="text-[12.5px] mt-0.5" style={{ color: "#5c6a67" }}>{header.sub}</div>
      </div>

      <form onSubmit={onSearchSubmit} className="relative w-[230px]">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
        <input
          className="input w-full text-[12.5px]"
          style={{ paddingLeft: 32 }}
          placeholder="Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <button
        onClick={() => setShowNotifications((v) => !v)}
        className="bell-btn w-[38px] h-[38px] flex-none rounded-[10px] border bg-white flex items-center justify-center relative cursor-pointer"
        style={{ borderColor: "#e3e8e6", color: "#3d4a47" }}
        aria-label="Notifications"
      >
        <BellIcon className="bell-glyph" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-white font-mono flex items-center justify-center"
            style={{ background: "#b91c1c", fontSize: 9.5, fontWeight: 700, border: "2px solid #fff" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      <button className="btn btn-secondary" onClick={() => logout().then(() => router.replace("/login"))}>
        <LogoutIcon />
        Logout
      </button>

      {showNotifications && (
        <>
          <div className="fixed inset-0 z-29" onClick={() => setShowNotifications(false)} />
          <div
            className="pop-anim absolute top-[60px] right-6 w-[378px] bg-white rounded-2xl z-30 max-h-[460px] flex flex-col overflow-hidden border origin-top-right"
            style={{ borderColor: "#e3e8e6", boxShadow: "var(--shadow-lg)" }}
          >
            <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b" style={{ borderColor: "#eef1f0" }}>
              <BellIcon style={{ color: "#1e3a8a" }} />
              <div className="font-bold text-sm">Notifications</div>
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#b91c1c", background: "#fee2e2" }}>
                  {unreadCount} new
                </span>
              )}
              <button onClick={markAllRead} className="ml-auto bg-transparent border-none text-[11.5px] font-semibold cursor-pointer p-0" style={{ color: "#2563eb" }}>
                Mark all read
              </button>
            </div>
            <div className="overflow-y-auto">
              {notifications.map((n) => {
                const meta = NOTIF_META[n.type] ?? NOTIF_META.assigned;
                return (
                  <div key={n.id} className="flex gap-3 px-4.5 py-3.5 border-b relative" style={{ borderColor: "#f4f6f5", background: n.read ? "#fff" : "#f5f9ff" }}>
                    {!n.read && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full" style={{ background: "#2563eb" }} />}
                    <div className="w-[34px] h-[34px] flex-none rounded-[10px] flex items-center justify-center" style={{ background: meta.bg, color: meta.color }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                        <path d={meta.path} />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] leading-snug" style={{ color: "#10201d", fontWeight: n.read ? 500 : 600 }}>{n.text}</div>
                      <div className="font-mono text-[10.5px] mt-0.5" style={{ color: "#96a19d" }}>{relativeTime(n.ts)}</div>
                    </div>
                  </div>
                );
              })}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="w-full py-3 bg-transparent border-none border-t cursor-pointer flex items-center justify-center gap-1.5 text-[12.5px] font-semibold hover:bg-[#fef2f2]"
                  style={{ borderColor: "#f0f3f2", color: "#b91c1c" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9}>
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                  Clear all messages
                </button>
              )}
              {notifications.length === 0 && (
                <div className="py-8 px-4.5 text-center text-[12.5px]" style={{ color: "#8a968f" }}>
                  You&apos;re all caught up — no messages.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
