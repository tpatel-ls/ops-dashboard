// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const importAll = vi.fn<(value: unknown) => Promise<void>>();
const exportAll = vi.fn<() => Promise<unknown>>();
const downloadJson = vi.fn();

vi.mock('./theme-provider', () => ({ useTheme: () => ({ theme: 'system', setTheme: vi.fn() }) }));
const requestNotifications = vi.hoisted(() => vi.fn<() => Promise<string>>());
vi.mock('@/lib/notifications', () => ({
  notificationPermission: () => 'default',
  requestNotifications,
}));
vi.mock('@/lib/export', () => ({
  downloadJson,
  downloadText: vi.fn(),
  exportAll,
  importAll,
  tasksToMarkdown: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({ isSupabaseConfigured: () => false, getSupabase: () => null }));
vi.mock('@/components/sync-status', () => ({ SyncStatus: () => null }));
vi.mock('@/components/organizations-manager', () => ({ OrganizationsManager: () => null }));
const updateSettings = vi.hoisted(() => vi.fn());
vi.mock('@/lib/settings', () => ({
  DEFAULT_VIEWS: ['today'],
  getSettings: async () => ({ ...DEFAULT_SETTINGS, updatedAt: '2026-10-28T00:00:00.000Z' }),
  updateSettings,
}));

const { SettingsForm } = await import('./settings-form');

afterEach(() => {
  cleanup();
  importAll.mockReset();
  exportAll.mockReset();
  downloadJson.mockReset();
  requestNotifications.mockReset();
  updateSettings.mockReset();
});

async function chooseBackup(contents: string) {
  render(createElement(SettingsForm));
  await screen.findByRole('button', { name: 'Import JSON' });
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  // jsdom's File has no text(), so hand the handler the two members it reads.
  const file = { name: 'backup.json', text: async () => contents };
  fireEvent.change(input, { target: { files: [file] } });
}

describe('SettingsForm import', () => {
  it('confirms a successful import instead of staying silent', async () => {
    importAll.mockResolvedValue();
    await chooseBackup('{"version":1}');

    expect(await screen.findByText('Imported backup.json.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Imported backup.json.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows why an import failed inline rather than in a blocking alert', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    importAll.mockRejectedValue(new Error('Export version is not supported.'));
    await chooseBackup('{"version":9}');

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Import failed: Export version is not supported.',
    );
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});

describe('SettingsForm export', () => {
  it('says the export failed instead of leaving the button looking dead', async () => {
    exportAll.mockRejectedValue(new Error('The database connection is closing.'));
    render(createElement(SettingsForm));
    fireEvent.click(await screen.findByRole('button', { name: 'Export JSON' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Export failed: The database connection is closing.',
    );
    expect(downloadJson).not.toHaveBeenCalled();
  });

  it('downloads the snapshot when the export succeeds', async () => {
    const snapshot = { version: 1, tasks: [], projects: [], whiteboards: [] };
    exportAll.mockResolvedValue(snapshot);
    render(createElement(SettingsForm));
    fireEvent.click(await screen.findByRole('button', { name: 'Export JSON' }));

    await vi.waitFor(() => expect(downloadJson).toHaveBeenCalledWith(snapshot, expect.any(String)));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('SettingsForm appearance', () => {
  it('tells assistive technology which theme is selected', async () => {
    render(createElement(SettingsForm));
    const group = await screen.findByRole('group', { name: 'Color theme' });
    const pressed = Array.from(group.querySelectorAll('button')).map((button) => [
      button.textContent,
      button.getAttribute('aria-pressed'),
    ]);

    expect(pressed).toEqual([
      ['light', 'false'],
      ['dark', 'false'],
      ['system', 'true'],
    ]);
  });
});

describe('SettingsForm reminders', () => {
  it('explains how to unblock notifications instead of offering a request that cannot prompt', async () => {
    requestNotifications.mockResolvedValue('denied');
    render(createElement(SettingsForm));

    fireEvent.click(await screen.findByRole('button', { name: 'Request permission' }));

    expect(await screen.findByText(/Notifications are blocked for this site\./)).toBeTruthy();
    expect(screen.getByText('Permission: denied')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Request permission' })).toBeNull();
  });
});

describe('SettingsForm number fields', () => {
  it('lets a value be typed digit by digit instead of clamping each keystroke', async () => {
    updateSettings.mockImplementation(async (patch: object) => ({
      ...DEFAULT_SETTINGS,
      ...patch,
    }));
    render(createElement(SettingsForm));
    const focus = (await screen.findByLabelText('Focus minutes')) as HTMLInputElement;

    fireEvent.change(focus, { target: { value: '' } });
    fireEvent.change(focus, { target: { value: '4' } });
    expect(focus.value).toBe('4');
    fireEvent.change(focus, { target: { value: '45' } });
    fireEvent.blur(focus);

    expect(updateSettings.mock.calls).toEqual([[{ pomodoroFocusMinutes: 45 }]]);
    expect(await screen.findByDisplayValue('45')).toBe(focus);
  });

  it('saves an out-of-range value on blur and keeps the saved value for a blank field', async () => {
    updateSettings.mockImplementation(async (patch: object) => ({
      ...DEFAULT_SETTINGS,
      ...patch,
    }));
    render(createElement(SettingsForm));
    const breakField = (await screen.findByLabelText('Break minutes')) as HTMLInputElement;
    const slipping = screen.getByLabelText('Slipping after (days)') as HTMLInputElement;

    fireEvent.change(breakField, { target: { value: '45' } });
    expect(updateSettings).not.toHaveBeenCalled();
    fireEvent.keyDown(breakField, { key: 'Enter' });
    expect(updateSettings.mock.calls).toEqual([[{ pomodoroBreakMinutes: 45 }]]);

    fireEvent.change(slipping, { target: { value: '' } });
    fireEvent.blur(slipping);
    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(slipping.value).toBe(String(DEFAULT_SETTINGS.slippingDays));
  });
});

describe('SettingsForm workday', () => {
  it('keeps the other time when an edit puts the workday end before its start', async () => {
    updateSettings.mockImplementation(async (patch: object) => ({
      ...DEFAULT_SETTINGS,
      ...patch,
    }));
    render(createElement(SettingsForm));
    const start = (await screen.findByLabelText('Workday start')) as HTMLInputElement;
    const end = screen.getByLabelText('Workday end') as HTMLInputElement;
    expect([start.value, end.value]).toEqual(['08:00', '18:00']);

    fireEvent.change(start, { target: { value: '19:00' } });

    expect(updateSettings).not.toHaveBeenCalled();
    expect([start.value, end.value]).toEqual(['19:00', '18:00']);
    expect(screen.getByRole('alert').textContent).toMatch(/must end after it starts/);
    expect(start.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(end, { target: { value: '23:00' } });

    expect(updateSettings.mock.calls).toEqual([[{ workdayStart: '19:00', workdayEnd: '23:00' }]]);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
