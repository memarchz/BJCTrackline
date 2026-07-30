"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Task } from "./types";

export function useTaskList(params: Record<string, string | boolean | undefined>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const key = JSON.stringify(params);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<{ tasks: Task[] }>("/tasks", { params: JSON.parse(key) });
      setTasks(res.data.tasks);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/param-change, see React docs "Fetching data with Effects"
    refresh();
  }, [refresh]);

  return { tasks, loading, error, refresh, setTasks };
}
