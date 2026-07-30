const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function daysUntil(iso: string): number {
  const due = new Date(iso);
  const now = new Date();
  const dueDay = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueDay - today) / 86400000);
}

export function dueText(iso: string): string {
  const days = daysUntil(iso);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function monthDay(iso: string): { day: number; mon: string } {
  const d = new Date(iso);
  return { day: d.getDate(), mon: MONTHS[d.getMonth()] };
}

export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export function priorityBadgeClass(level: "low" | "medium" | "high"): string {
  return level === "high" ? "badge lvl-high" : level === "medium" ? "badge lvl-med" : "badge lvl-low";
}

export function statusBadgeClass(status: string, overdue?: boolean): string {
  if (overdue) return "badge b-overdue";
  switch (status) {
    case "todo":
      return "badge b-todo";
    case "in_progress":
      return "badge b-progress";
    case "submitted":
      return "badge b-submitted";
    case "rejected":
      return "badge b-rejected";
    case "completed":
      return "badge b-completed";
    default:
      return "badge b-todo";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "todo":
      return "To do";
    case "in_progress":
      return "In progress";
    case "submitted":
      return "Submitted";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    default:
      return capitalize(status);
  }
}
