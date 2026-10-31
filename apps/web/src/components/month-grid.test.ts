// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      // Run the real query once, against the stubbed tables below.
      const [pending] = useState(query);
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void pending.then(setValue);
      }, [pending]);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({
    tasks: { toArray: async () => [] },
    projects: { toArray: async () => [] },
    organizations: { toArray: async () => [] },
    settings: { get: async () => undefined },
  }),
}));

const { MonthGrid } = await import('./month-grid');

afterEach(cleanup);

function dayButton(day: Date) {
  return screen.getByRole('button', { name: `${format(day, 'MMMM d')}, 0 tasks` });
}

describe('MonthGrid', () => {
  // The selected day and today were marked only by a ring and a filled
  // circle, so a screen reader could not tell which day the detail pane showed.
  it('exposes the selected day and today to assistive technology', () => {
    render(createElement(MonthGrid));
    const today = new Date();
    const other = new Date(today.getFullYear(), today.getMonth(), today.getDate() === 1 ? 2 : 1);

    expect(dayButton(today).getAttribute('aria-current')).toBe('date');
    expect(dayButton(today).getAttribute('aria-pressed')).toBe('true');
    expect(dayButton(other).getAttribute('aria-current')).toBeNull();
    expect(dayButton(other).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(dayButton(other));

    expect(dayButton(other).getAttribute('aria-pressed')).toBe('true');
    expect(dayButton(today).getAttribute('aria-pressed')).toBe('false');
    expect(dayButton(today).getAttribute('aria-current')).toBe('date');
  });
});
