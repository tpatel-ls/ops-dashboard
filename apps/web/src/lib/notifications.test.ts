import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const reminders = {
    delete: vi.fn(),
    put: vi.fn(),
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

import { checkAndFireDueReminders, scheduleReminder } from './notifications';

describe('scheduleReminder', () => {
  it.each(['', 'not-a-date'])('rejects an invalid trigger time: %s', async (triggerAt) => {
    await expect(scheduleReminder('task-1', triggerAt)).rejects.toThrow(
      'Reminder time must be a valid date',
    );
    expect(mocks.reminders.put).not.toHaveBeenCalled();
  });
});

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

  it('removes a due reminder whose task no longer exists', async () => {
    mocks.tasks.get.mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: vi.fn() },
    });

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(0);
    expect(mocks.reminders.delete).toHaveBeenCalledWith('reminder-1');
  });
});
