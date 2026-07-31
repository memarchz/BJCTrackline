export type Level = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "submitted" | "rejected" | "completed";
export type TaskLogAction = "created" | "started" | "submitted" | "cancelled" | "rejected" | "approved" | "reworked" | "archived" | "commented";
export type NotificationType = "assigned" | "rejected" | "approved" | "comment" | "nudged";
export type TorStatus = "pending_chief_approval" | "tor" | "bidding" | "pta" | "pr" | "po" | "completed";

export interface TeamRef {
  id: string;
  name: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  username: string | null;
  title: string | null;
  admin: boolean;
  team: TeamRef | null;
}

export interface Subtask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  late: boolean | null;
  dueDate: string;
  submittedDate: string | null;
  reviewDate: string | null;
  rejectReason: string | null;
  assignee: UserSummary | null;
  // 0-10, 2 decimals — set only once this subtask is completed.
  score: number | null;
}

export interface Attachment {
  id: string;
  name: string;
  uploadedAt: string;
  uploadedBy: UserSummary;
}

export interface TaskLogEntry {
  id: string;
  ts: string;
  action: TaskLogAction;
  note: string | null;
  by: UserSummary;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Level;
  impact: Level;
  status: TaskStatus;
  archived: boolean;
  late: boolean | null;
  overdue: boolean;
  team: TeamRef;
  createdBy: UserSummary;
  assignees: UserSummary[];
  dueDate: string;
  createdDate: string;
  submittedDate: string | null;
  reviewDate: string | null;
  rejectReason: string | null;
  // 0-10, 2 decimals — set only once completed, and only when this task has
  // no subtasks (a task with subtasks carries no score of its own; see each
  // Subtask's own `score` instead).
  score: number | null;
  // Contextual to the logged-in viewer: for someone who is only assigned to a
  // subtask (not the parent task), these reflect that subtask instead.
  viewerStatus: TaskStatus;
  viewerDueDate: string;
  viewerSubtaskId: string | null;
  viewerSubtaskTitle: string | null;
  // Set when the task owner has nudged the viewer (a direct assignee) and
  // they haven't dismissed the resulting badge yet.
  viewerNudgedAt: string | null;
  subtasks: Subtask[];
  attachments: Attachment[];
  log: TaskLogEntry[];
  starred: boolean;
}

export interface Team {
  id: string;
  name: string;
  memberCount?: number;
  taskCount?: number;
  members?: UserSummary[];
}

export interface TeamMemberStat {
  user: UserSummary;
  assignedCount: number;
  completedCount: number;
  lateCount: number;
  openCount: number;
  onTimeRate: number;
  completionTrend: { label: string; onTimeRate: number; lateRate: number; avgScore: number }[];
}

export interface TeamPerformance {
  stats: { total: number; completed: number; inProgress: number; overdue: number; lateCount: number; onTimeRate: number };
  // Per week (not cumulative), aggregated across the whole team — same
  // definitions as the personal Dashboard's charts (see DashboardData).
  completionTrend: { label: string; onTimeRate: number; lateRate: number; avgScore: number }[];
  top3: TeamMemberStat[];
  members: TeamMemberStat[];
  tasks: Task[];
}

export interface TorRequest {
  id: string;
  project: string;
  code: string;
  dept: string;
  amount: string;
  openedDate: string;
  status: TorStatus;
  step: number;
  comment: string | null;
  rejected: boolean;
  requester: UserSummary;
  reviewer: UserSummary | null;
}

export interface ConversationSummary {
  id: string;
  kind: "team" | "dm";
  name: string;
  teamId?: string | null;
  userId?: string;
  lastMessage: { text: string; ts: string; from: UserSummary } | null;
  unreadCount: number;
  // DM only — when the other participant last read this conversation, so
  // the sender can see a "Seen" mark on their own latest message.
  otherReadAt?: string | null;
}

export interface Message {
  id: string;
  text: string;
  ts: string;
  from: UserSummary;
}

export interface Notification {
  id: string;
  type: NotificationType;
  text: string;
  ts: string;
  read: boolean;
}

export interface DashboardData {
  stats: Record<string, number>;
  priorityDistribution: { high: number; medium: number; low: number };
  // Per week (not cumulative), all 0-100 except avgScore: onTimeRate and
  // lateRate are both against the same denominator (tasks due that week) —
  // lateRate is shown for context only and never folds into "completion
  // rate," which credits on-time work alone. avgScore is 0-10, 2 decimals
  // (average task score among tasks completed that week, on-time or late).
  completionTrend: { label: string; onTimeRate: number; lateRate: number; avgScore: number }[];
  dueSoon: Task[];
  recentActivity: { id: string; ts: string; action: TaskLogAction; note: string | null; by: UserSummary; task: { id: string; title: string } }[];
  upcomingForMe: Task[];
}
