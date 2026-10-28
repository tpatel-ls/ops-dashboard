// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const importAll = vi.fn<(value: unknown) => Promise<void>>();
const exportAll = vi.fn<() => Promise<unknown>>();
const downloadJson = vi.fn();

vi.mock('./theme-provider', () => ({ useTheme: () => ({ theme: 'system', setTheme: vi.fn() }) }));
vi.mock('@/lib/notifications', () => ({
  notificationPermission: () => 'default',
  requestNotifications: vi.fn(),
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
vi.mock('@/lib/settings', () => ({
  DEFAULT_VIEWS: ['today'],
  getSettings: async () => ({ ...DEFAULT_SETTINGS, updatedAt: '2026-10-28T00:00:00.000Z' }),
  updateSettings: vi.fn(),
}));

const { SettingsForm } = await import('./settings-form');

afterEach(() => {
  cleanup();
  importAll.mockReset();
  exportAll.mockReset();
  downloadJson.mockReset();
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
