"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSidebarCounts } from "@/lib/hooks";
import {
  AccountsIcon,
  AllTeamsIcon,
  CalendarIcon,
  ChatIcon,
  CurrentIcon,
  DashboardIcon,
  HistoryIcon,
  HowToIcon,
  ManageUsersIcon,
  ReviewIcon,
  StarredIcon,
  TeamsIcon,
  TorIcon,
} from "@/components/nav-icons";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLink({
  href,
  icon,
  label,
  count,
  dot,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  // A plain unlabeled indicator (e.g. "something across these needs your
  // attention") for links that summarize more than one underlying count.
  dot?: boolean;
  active: boolean;
}) {
  return (
    <Link href={href} className={`navlink ${active ? "active" : ""}`}>
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className="ml-auto text-white font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,.14)" }}
        >
          {count}
        </span>
      )}
      {dot && <span className="ml-auto w-2 h-2 rounded-full flex-none" style={{ background: "#fff" }} aria-label="Needs review" />}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { counts } = useSidebarCounts();

  const is = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="w-[236px] flex-none flex flex-col py-5.5 px-3.5" style={{ background: "#172554" }}>
      <div className="flex items-center gap-3 px-2 pb-5.5">
        <div
          className="logo-mark w-[38px] h-[38px] flex-none rounded-[11px] flex items-center justify-center cursor-pointer"
          style={{ background: "linear-gradient(135deg,#3b82f6,#1e3a8a)", boxShadow: "0 6px 16px rgba(37,99,235,.45)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle className="logo-ring" cx="12" cy="12" r="8.5" stroke="#93c5fd" strokeWidth="1.6" strokeDasharray="40 14" strokeLinecap="round" style={{ transformOrigin: "center" }} />
            <path d="M8.5 12.2l2.4 2.4 4.6-5" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-white font-bold text-[18px] tracking-wide">BJC Trackline</div>
          <div className="text-white/50 text-[10px] tracking-wide">Job Tracking System</div>
        </div>
      </div>

      <nav className="side-nav flex flex-col gap-1 flex-1 overflow-y-auto min-h-0">
        <div className="text-white/34 text-[10px] font-semibold tracking-[.12em] uppercase px-3.5 pt-2 pb-1.5">Menu</div>
        <NavLink href="/dashboard" icon={<DashboardIcon />} label="Dashboard" active={is("/dashboard")} />
        <NavLink href="/starred" icon={<StarredIcon />} label="Starred" count={counts.starred} active={is("/starred")} />
        <NavLink href="/current-tasks" icon={<CurrentIcon />} label="Current Tasks" count={counts.current} active={is("/current-tasks")} />
        <NavLink href="/pending-review" icon={<ReviewIcon />} label="Pending Review" count={counts.review} active={is("/pending-review")} />
        <NavLink href="/teams" icon={<TeamsIcon />} label="Teams" count={counts.teamsReview} active={is("/teams")} />
        <NavLink href="/calendar" icon={<CalendarIcon />} label="Calendar" active={is("/calendar")} />
        <NavLink href="/chat" icon={<ChatIcon />} label="Chat" count={counts.chatUnread} active={is("/chat")} />
        <NavLink href="/history" icon={<HistoryIcon />} label="History" active={is("/history")} />
        <NavLink href="/tor" icon={<TorIcon />} label="TOR Request" active={is("/tor")} />

        {user?.admin && (
          <>
            <div className="text-white/34 text-[10px] font-semibold tracking-[.12em] uppercase px-3.5 pt-3.5 pb-1.5">Admin</div>
            <NavLink href="/admin/teams" icon={<AllTeamsIcon />} label="All Teams" dot={counts.anyTeamReview} active={is("/admin/teams")} />
            <NavLink href="/admin/users" icon={<ManageUsersIcon />} label="Manage Users" active={is("/admin/users")} />
            <NavLink href="/admin/accounts" icon={<AccountsIcon />} label="User Accounts" active={is("/admin/accounts")} />
          </>
        )}

        <div className="text-white/34 text-[10px] font-semibold tracking-[.12em] uppercase px-3.5 pt-3.5 pb-1.5">Support</div>
        <NavLink href="/how-to" icon={<HowToIcon />} label="How to use" active={is("/how-to")} />
      </nav>

      {user && (
        <div className="px-1.5 pt-2 flex items-center gap-2.5">
          <div
            className="w-[34px] h-[34px] flex-none rounded-full flex items-center justify-center font-mono font-semibold text-xs"
            style={{ background: "#1e3a8a", color: "#93c5fd" }}
          >
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{user.name}</div>
            <div className="text-white/45 text-[10.5px] whitespace-nowrap overflow-hidden text-ellipsis">{user.title ?? (user.admin ? "Admin" : "Member")}</div>
          </div>
        </div>
      )}
    </aside>
  );
}
