import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  attachTaskReminder,
  checkAndFireDueReminders,
  requestNotifications,
  scheduleReminder,
} from './notifications';

afterEach(() => vi.unstubAllGlobals());

describe('requestNotifications', () => {
  it('keeps the current permission when the browser rejects the prompt', async () => {
    const NotificationMock = vi.fn();
    Object.assign(NotificationMock, {
      permission: 'default',
      requestPermission: vi.fn().mockRejectedValue(new DOMException('blocked')),
    });
    vi.stubGlobal('window', { Notification: NotificationMock });
    vi.stubGlobal('Notification', NotificationMock);

    await expect(requestNotifications()).resolves.toBe('default');
  });
});

describe('scheduleReminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tasks.get.mockResolvedValue({ id: 'task-1', title: 'Call customer', status: 'todo' });
  });

  it.each(['', 'not-a-date'])('rejects an invalid trigger time: %s', async (triggerAt) => {
    await expect(scheduleReminder('task-1', triggerAt)).rejects.toThrow(
      'Reminder time must be a valid date',
    );
    expect(mocks.reminders.put).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    { id: 'task-1', status: 'done' },
    { id: 'task-1', status: 'todo', deletedAt: '2026-08-01T12:00:00.000Z' },
  ])('rejects unavailable tasks before writing a reminder', async (task) => {
    mocks.tasks.get.mockResolvedValue(task);

    await expect(scheduleReminder('task-1', '2026-08-02T14:00:00.000Z')).rejects.toThrow(
      'Task is not available for reminders',
    );
    expect(mocks.reminders.put).not.toHaveBeenCalled();
  });

  it('normalizes trigger times before indexing reminders', async () => {
    await scheduleReminder(' task-1 ', ' 2026-08-02T09:00:00-05:00 ');

    expect(mocks.reminders.put).toHaveBeenCalledWith({
      id: 'reminder-test',
      taskId: 'task-1',
      triggerAt: '2026-08-02T14:00:00.000Z',
      delivered: false,
    });
  });
});

describe('attachTaskReminder', () => {
  it('normalizes embedded reminder metadata', () => {
    expect(
      attachTaskReminder(
        { id: ' task-1 ', status: 'todo' } as never,
        ' 2026-08-02T09:00:00-05:00 ',
      ),
    ).toEqual({
      id: 'reminder-test',
      taskId: 'task-1',
      triggerAt: '2026-08-02T14:00:00.000Z',
      delivered: false,
    });
  });

  it('rejects malformed or unavailable reminder targets', () => {
    expect(() => attachTaskReminder({ id: '', status: 'todo' } as never, '2026-08-02')).toThrow(
      'Reminder task is required',
    );
    expect(() =>
      attachTaskReminder({ id: 'task-1', status: 'done' } as never, '2026-08-02'),
    ).toThrow('Task is not available for reminders');
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

  it('uses the Notification API when service workers are unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(1);

    expect(Notification).toHaveBeenCalledWith(
      'Call customer',
      expect.objectContaining({ tag: 'ops-reminder-1' }),
    );
    expect(mocks.reminders.update).toHaveBeenCalledWith('reminder-1', { delivered: true });
  });

  it('skips reminder checks for an invalid clock value', async () => {
    await expect(checkAndFireDueReminders(new Date('invalid'))).resolves.toBe(0);
    expect(mocks.reminders.where).not.toHaveBeenCalled();
  });

  it('removes a due reminder whose task no longer exists', async () => {
    mocks.tasks.get.mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: vi.fn() },
    });

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(0);
    expect(mocks.reminders.delete).toHaveBeenCalledWith('reminder-1');
  });

  it('removes malformed due reminders without firing them', async () => {
    mocks.reminders.where.mockReturnValue({
      belowOrEqual: () => ({
        filter: () => ({
          toArray: async () => [
            { id: 'reminder-invalid', taskId: 'task-1', triggerAt: 'not-a-date' },
          ],
        }),
      }),
    });
    vi.stubGlobal('navigator', {});

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(0);

    expect(mocks.reminders.delete).toHaveBeenCalledWith('reminder-invalid');
    expect(mocks.tasks.get).not.toHaveBeenCalled();
    expect(Notification).not.toHaveBeenCalled();
  });

  it('removes a due reminder for a deleted task', async () => {
    mocks.tasks.get.mockResolvedValue({
      id: 'task-1',
      title: 'Call customer',
      status: 'todo',
      deletedAt: '2026-08-01T12:00:00.000Z',
    });
    vi.stubGlobal('navigator', {
      serviceWorker: { getRegistration: vi.fn() },
    });

    await expect(checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'))).resolves.toBe(0);
    expect(mocks.reminders.delete).toHaveBeenCalledWith('reminder-1');
  });

  it('shares one delivery pass across overlapping checks', async () => {
    let release: ((value: unknown[]) => void) | undefined;
    mocks.reminders.where.mockReturnValue({
      belowOrEqual: () => ({
        filter: () => ({
          toArray: () =>
            new Promise<unknown[]>((resolve) => {
              release = resolve;
            }),
        }),
      }),
    });
    vi.stubGlobal('navigator', {});

    const first = checkAndFireDueReminders(new Date('2026-07-29T13:00:00.000Z'));
    const overlap = checkAndFireDueReminders(new Date('2026-07-29T13:01:00.000Z'));

    expect(overlap).toBe(first);
    expect(mocks.reminders.where).toHaveBeenCalledOnce();
    release?.([]);
    await expect(first).resolves.toBe(0);
  });
});
