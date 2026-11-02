// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDomain } from '@/lib/domains';

const { DomainForm } = await import('./domains-view');

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
      'Could not save this domain. Your changes are still here.',
    );
    expect(onSave).toHaveBeenCalledOnce();
    expect((screen.getByLabelText('Domain name') as HTMLInputElement).value).toBe(name);
  });
});
