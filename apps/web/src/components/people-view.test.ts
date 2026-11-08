// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { CreatePersonForm } = await import('./people-view');

afterEach(cleanup);

describe('CreatePersonForm', () => {
  it('reports a rejected save and keeps the details', async () => {
    const onCreated = vi.fn();
    render(createElement(CreatePersonForm, { onCreated, onCancel: () => {} }));
    fireEvent.change(screen.getByLabelText('Person name'), { target: { value: 'Ada' } });
    // The relationship limit is 200 characters, so createPerson rejects this one.
    fireEvent.change(screen.getByLabelText('Relationship'), { target: { value: 'x'.repeat(201) } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create this person. Your details are still here. Person details must be valid.',
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Person name') as HTMLInputElement).value).toBe('Ada');
  });
});
