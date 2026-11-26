// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Organization } from '@ops-dashboard/core';

const archiveOrganization = vi.fn(async () => {});
vi.mock('@/lib/organizations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/organizations')>()),
  archiveOrganization,
}));

const { createOrganization, nextOrgColor } = await import('@/lib/organizations');
const { OrgForm, OrgRow } = await import('./organizations-manager');

afterEach(() => {
  cleanup();
  archiveOrganization.mockClear();
});

describe('OrgForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    // The name limit is 200 characters, so createOrganization rejects this one.
    const onSave = vi.fn(async (name: string, color: string) => {
      await createOrganization({ name, color });
    });
    render(createElement(OrgForm, { onSave, onCancel: () => {} }));
    const name = 'x'.repeat(201);
    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save this organization. Your changes are still here. Organization name must contain at most 200 characters.',
    );
    expect(onSave).toHaveBeenCalledOnce();
    expect((screen.getByLabelText('Organization name') as HTMLInputElement).value).toBe(name);
  });

  it('preselects the color it is given for a new organization', async () => {
    const onSave = vi.fn(async () => {});
    render(createElement(OrgForm, { defaultColor: nextOrgColor(1), onSave, onCancel: () => {} }));
    expect(
      screen
        .getByRole('button', { name: 'Select organization color 2' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Select organization color 1' })
        .getAttribute('aria-pressed'),
    ).toBe('false');

    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: 'Beta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith('Beta', nextOrgColor(1)));
  });
});

describe('OrgRow', () => {
  it('archives an organization only on a second activation', () => {
    const org = { id: 'org-1', name: 'Acme', color: '#f00', order: 1 } as Organization;
    render(createElement(OrgRow, { org, projectCount: 2 }));

    const button = screen.getByRole('button', { name: 'Archive Acme' });
    fireEvent.click(button);
    expect(archiveOrganization).not.toHaveBeenCalled();

    fireEvent.blur(button);
    fireEvent.click(button);
    expect(archiveOrganization).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Archive Acme. Activate again to confirm' }),
    );
    expect(archiveOrganization).toHaveBeenCalledWith('org-1');
  });
});
