// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ stats: undefined as unknown }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.stats }));

const { TodayStats } = await import('./today-stats');

afterEach(() => {
  cleanup();
  mocks.stats = undefined;
});

function shownValues(): string[] {
  return ['Brief', 'Done', 'Overdue'].map(
    (label) => screen.getByText(label).previousElementSibling?.textContent ?? '',
  );
}

describe('TodayStats', () => {
  it('shows a placeholder, not zero, while the tasks are still loading', () => {
    render(createElement(TodayStats));

    expect(shownValues()).toEqual(['-', '-', '-']);
  });

  it('shows the counts once the tasks load, including a real zero', () => {
    mocks.stats = { total: 4, done: 1, overdue: 0 };
    render(createElement(TodayStats));

    expect(shownValues()).toEqual(['4', '1', '0']);
  });
});
