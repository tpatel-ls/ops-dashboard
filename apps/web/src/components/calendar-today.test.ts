// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
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

const { CalendarWeek } = await import('./calendar-week');
const { WeekBoard } = await import('./week-board');

afterEach(cleanup);

// Today was marked only by the primary text color, which a screen reader
// does not convey. Each view's today marker must carry aria-current="date".
describe.each([
  ['CalendarWeek', CalendarWeek],
  ['WeekBoard', WeekBoard],
])('%s', (_name, View) => {
  it('marks only today with aria-current="date"', () => {
    const { container } = render(createElement(View));
    const marked = [...container.querySelectorAll('[aria-current="date"]')];
    const today = format(new Date(), 'd');

    expect(marked.length).toBeGreaterThan(0);
    for (const element of marked) {
      expect(element.textContent).toContain(today);
    }
    expect(container.querySelectorAll('[aria-current]').length).toBe(marked.length);
  });
});
