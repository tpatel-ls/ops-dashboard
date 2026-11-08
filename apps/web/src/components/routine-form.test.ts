// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => [] }));

const { RoutineForm } = await import('./routine-form');

afterEach(cleanup);

describe('RoutineForm', () => {
  it('reports a rejected save and keeps the form open', async () => {
    const onCreated = vi.fn();
    render(createElement(RoutineForm, { onCreated }));
    fireEvent.click(screen.getByRole('button', { name: 'New Routine' }));
    // The name limit is 200 characters, so createRoutine rejects this one.
    const name = 'x'.repeat(201);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Routine' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create this routine. Your details are still here. Routine name must contain at most 200 characters.',
    );
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(name);
  });
});
