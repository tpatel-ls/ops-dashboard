// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOrganization, nextOrgColor } from '@/lib/organizations';

const { OrgForm } = await import('./organizations-manager');

afterEach(cleanup);

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
