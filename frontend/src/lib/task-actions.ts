import { api } from "./api";
import type { Level, Task } from "./types";
import { emitTasksChanged } from "./task-events";

export async function starTask(id: string, starred: boolean) {
  if (starred) await api.delete(`/tasks/${id}/star`);
  else await api.post(`/tasks/${id}/star`);
  emitTasksChanged();
}

export async function startTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/start`)).data.task;
  emitTasksChanged();
  return task;
}

export async function submitTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/submit`)).data.task;
  emitTasksChanged();
  return task;
}

export async function approveTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/approve`)).data.task;
  emitTasksChanged();
  return task;
}

export async function rejectTask(id: string, reason: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/reject`, { reason })).data.task;
  emitTasksChanged();
  return task;
}

export async function reworkTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/rework`)).data.task;
  emitTasksChanged();
  return task;
}

export async function cancelSubmission(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/cancel`)).data.task;
  emitTasksChanged();
  return task;
}

export async function nudgeTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/nudge`)).data.task;
  emitTasksChanged();
  return task;
}

export async function dismissNudge(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/nudge/dismiss`)).data.task;
  emitTasksChanged();
  return task;
}

export async function startSubtask(taskId: string, subtaskId: string): Promise<Task> {
  const task = (await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/start`)).data.task;
  emitTasksChanged();
  return task;
}

export async function submitSubtask(taskId: string, subtaskId: string): Promise<Task> {
  const task = (await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/submit`)).data.task;
  emitTasksChanged();
  return task;
}

export async function approveSubtask(taskId: string, subtaskId: string): Promise<Task> {
  const task = (await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/approve`)).data.task;
  emitTasksChanged();
  return task;
}

export async function rejectSubtask(taskId: string, subtaskId: string, reason: string): Promise<Task> {
  const task = (await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/reject`, { reason })).data.task;
  emitTasksChanged();
  return task;
}

export async function reworkSubtask(taskId: string, subtaskId: string): Promise<Task> {
  const task = (await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/rework`)).data.task;
  emitTasksChanged();
  return task;
}

export async function archiveTask(id: string): Promise<Task> {
  const task = (await api.post(`/tasks/${id}/archive`)).data.task;
  emitTasksChanged();
  return task;
}

export async function uploadAttachment(id: string, file: File): Promise<Task> {
  const form = new FormData();
  form.append("file", file);
  return (await api.post(`/tasks/${id}/attachments`, form)).data.task;
}

export async function deleteAttachment(taskId: string, attachmentId: string): Promise<Task> {
  return (await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`)).data.task;
}

// The backend streams the file directly (checked on every request), so this
// is just the URL to navigate to — no round trip needed to "get" it first.
export function getAttachmentDownloadUrl(taskId: string, attachmentId: string): string {
  return `${api.defaults.baseURL ?? ""}/tasks/${taskId}/attachments/${attachmentId}/download`;
}

export async function bulkStart(ids: string[]): Promise<number> {
  const updated = (await api.post("/tasks/bulk/start", { ids })).data.updated;
  emitTasksChanged();
  return updated;
}

export async function bulkRework(ids: string[]): Promise<number> {
  const updated = (await api.post("/tasks/bulk/rework", { ids })).data.updated;
  emitTasksChanged();
  return updated;
}

export async function bulkArchive(ids: string[]): Promise<number> {
  const updated = (await api.post("/tasks/bulk/archive", { ids })).data.updated;
  emitTasksChanged();
  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await api.delete(`/tasks/${id}`);
  emitTasksChanged();
}

export interface SubtaskInput {
  id?: string;
  title: string;
  description?: string;
  assigneeId?: string;
}

export interface TaskDraft {
  title: string;
  description?: string;
  teamId: string;
  priority: Level;
  impact: Level;
  dueDate: string;
  assigneeIds?: string[];
  subtasks?: SubtaskInput[];
}

export async function createTask(draft: TaskDraft): Promise<Task> {
  const task = (await api.post("/tasks", draft)).data.task;
  emitTasksChanged();
  return task;
}

export async function updateTask(id: string, draft: Partial<TaskDraft>): Promise<Task> {
  const task = (await api.patch(`/tasks/${id}`, draft)).data.task;
  emitTasksChanged();
  return task;
}
