const MAX_TASK_ID_LENGTH = 128;

export function notificationTarget(taskId: unknown): string {
  if (typeof taskId !== 'string' || !taskId.trim()) return '/today';
  const id = taskId.trim();
  if (id.length > MAX_TASK_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(id)) return '/today';
  const query = new URLSearchParams({ task: id });
  return `/today?${query.toString()}`;
}
