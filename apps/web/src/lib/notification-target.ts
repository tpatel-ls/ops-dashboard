export function notificationTarget(taskId: unknown): string {
  if (typeof taskId !== 'string' || !taskId.trim()) return '/today';
  const query = new URLSearchParams({ task: taskId.trim() });
  return `/today?${query.toString()}`;
}
