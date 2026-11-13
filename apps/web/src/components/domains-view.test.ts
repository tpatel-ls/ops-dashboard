// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Domain } from '@ops-dashboard/core';
import { createDomain } from '@/lib/domains';

const mocks = vi.hoisted(() => ({ domains: [] as Partial<Domain>[] }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.domains }));

const { DomainForm, DomainsView } = await import('./domains-view');

afterEach(cleanup);

describe('DomainForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    // The name limit is 200 characters, so createDomain rejects this one.
    const onSave = vi.fn(async (name: string, color: string) => {
      await createDomain({ name, color });
    });
    render(createElement(DomainForm, { onSave, onCancel: () => {} }));
    const name = 'x'.repeat(201);
    fireEvent.change(screen.getByLabelText('Domain name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not save this domain. Your changes are still here. Domain name must contain at most 200 characters.',
    );
    expect(onSave).toHaveBeenCalledOnce();
    expect((screen.getByLabelText('Domain name') as HTMLInputElement).value).toBe(name);
  });
});

describe('DomainsView', () => {
  it('reports whether the archived domains are shown', () => {
    mocks.domains = [{ id: 'd1', name: 'Old lane', color: '#888888', archivedAt: '2026-11-01' }];
    render(createElement(DomainsView));

    const toggle = screen.getByRole('button', { name: '1 archived' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Old lane')).toBeTruthy();
  });
});
