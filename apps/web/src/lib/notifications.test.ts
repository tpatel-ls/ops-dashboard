import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const reminders = {
    update: vi.fn(),
    where: vi.fn(),
  };
  const tasks = { get: vi.fn() };
  return { reminders, tasks };
});

vi.mock('@ops-dashboard/core', () => ({
  getDb: () => ({ reminders: mocks.reminders, tasks: mocks.tasks }),
  newId: () => 'reminder-test',
}));

import { checkAndFireDueReminders } from './notifications';

describe('checkAndFireDueReminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const due = [{ id: 'reminder-1', taskId: 'task-1', triggerAt: '2026-07-29T12:00:00.000Z' }];
    mocks.reminders.where.mockReturnValue({
      belowOrEqual: () => ({
        filter: () => ({ toArray: async () => due }),
      }),
    });
    mocks.tasks.get.mockResolvedValue({ id: 'task-1', title: 'Call customer' });

    const NotificationMock = vi.fn();
    Object.assign(NotificationMock, { permission: 'granted' });
    vi.stubGlobal('window', { Notification: NotificationMock });
    vi.stubGlobal('Notification', NotificationMock);
  });

  it('keeps a reminder pending when notification delivery fails', async () => {
    const showNotification = vi.fn().mockRejectedValue(new Error('blocked'));
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) },
    });

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(0);
    expect(mocks.reminders.update).not.toHaveBeenCalled();
  });
});
