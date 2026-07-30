"use client";

// Tiny pub/sub so the sidebar's badge counts (Starred / Current Tasks /
// Pending Review) stay live. The sidebar persists across route navigation
// (it lives in the layout, not the page), so it never re-mounts and never
// naturally re-fetches after a task is created, starred, or moved to a new
// status from wherever the user happens to be. Every mutation in
// task-actions.ts calls emitTasksChanged() so any mounted listener (the
// sidebar's useSidebarCounts hook) can refetch.

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeTasksChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitTasksChanged(): void {
  listeners.forEach((listener) => listener());
}
