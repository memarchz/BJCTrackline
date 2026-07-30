"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth-context";
import { subscribeTasksChanged } from "./task-events";
import type { ConversationSummary, Notification, Task } from "./types";

export function useSidebarCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ starred: 0, current: 0, review: 0, teamsReview: 0, anyTeamReview: false, chatUnread: 0 });

  const refresh = useCallback(async () => {
    if (!user) return;
    const [starred, current, review, teamsReview, anyTeamReview, conversations] = await Promise.all([
      api.get<{ tasks: Task[] }>("/tasks", { params: { starred: true } }),
      api.get<{ tasks: Task[] }>("/tasks", { params: { assigneeId: user.id, status: "todo,in_progress" } }),
      api.get<{ tasks: Task[] }>("/tasks", { params: { assigneeId: user.id, status: "submitted,rejected,completed" } }),
      // Own team's "awaiting your review" badge on the Teams nav link.
      user.team
        ? api.get<{ tasks: Task[] }>("/tasks", { params: { createdById: user.id, teamId: user.team.id, status: "submitted" } })
        : Promise.resolve({ data: { tasks: [] } }),
      // Admin only: is *any* team's review queue non-empty, for the All Teams red dot.
      user.admin
        ? api.get<{ tasks: Task[] }>("/tasks", { params: { createdById: user.id, status: "submitted" } })
        : Promise.resolve({ data: { tasks: [] } }),
      api.get<{ conversations: ConversationSummary[] }>("/conversations"),
    ]);
    setCounts({
      starred: starred.data.tasks.length,
      current: current.data.tasks.length,
      review: review.data.tasks.length,
      teamsReview: teamsReview.data.tasks.length,
      anyTeamReview: anyTeamReview.data.tasks.length > 0,
      chatUnread: conversations.data.conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    });
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, [refresh]);

  // The sidebar lives in the layout and never re-mounts on navigation, so
  // without this, these counts would go stale the moment a task changes
  // anywhere else in the app. Every mutation in task-actions.ts emits this.
  useEffect(() => {
    return subscribeTasksChanged(refresh);
  }, [refresh]);

  // New chat messages don't fire a task-changed event, and nobody else is
  // going to tell this hook to recheck — poll lightly so the unread badge
  // doesn't go stale while the user is elsewhere in the app.
  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { counts, refresh };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const res = await api.get<{ notifications: Notification[] }>("/notifications");
    setNotifications(res.data.notifications);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, see React docs "Fetching data with Effects"
    refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeTasksChanged(refresh);
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(async () => {
    await api.delete("/notifications");
    setNotifications([]);
  }, []);

  return { notifications, refresh, markAllRead, clearAll };
}
