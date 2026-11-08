// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => ({ organizations: [], projects: [] }),
}));
vi.mock('@/lib/use-voice-input', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/use-voice-input')>()),
  useVoiceInput: () => ({
    available: false,
    listening: false,
    transcribing: false,
    error: null,
    toggle: vi.fn(),
  }),
}));
const createOrganization = vi.fn();
vi.mock('@/lib/organizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/organizations')>()),
  createOrganization,
}));

const { useAppStore } = await import('@/lib/app-store');
const { WorkLoggerDialog } = await import('./work-logger-dialog');

afterEach(() => {
  cleanup();
  createOrganization.mockReset();
  useAppStore.setState({ workLoggerOpen: false });
});

describe('WorkLoggerDialog new organization', () => {
  it('creates one organization when Enter is pressed again while the first save runs', async () => {
    let finish!: (org: { id: string; name: string }) => void;
    createOrganization.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    useAppStore.getState().openWorkLogger('project');
    render(createElement(WorkLoggerDialog));

    fireEvent.click(screen.getByRole('button', { name: 'Add org' }));
    const field = screen.getByLabelText('Organization name');
    fireEvent.change(field, { target: { value: 'Acme' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.keyDown(field, { key: 'Enter' });
    await act(async () => finish({ id: 'org-1', name: 'Acme' }));

    expect(createOrganization).toHaveBeenCalledTimes(1);
  });
});
