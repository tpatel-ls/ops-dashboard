// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({ blocks: undefined as Task[] | undefined }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.blocks }));
vi.mock('@/lib/use-settings', () => ({ useLiveSettings: () => DEFAULT_SETTINGS }));
vi.mock('@/lib/use-today', () => ({ useToday: () => '2026-09-21' }));
vi.mock('@/lib/use-page-visibility', () => ({ usePageVisibility: () => 'visible' }));

const { TodayRail } = await import('./today-rail');

const at = (hour: number) => new Date(2026, 8, 21, hour, 0, 0).toISOString();
const block = (id: string, hour: number, status: Task['status'] = 'todo') =>
  ({ id, title: id, status, startAt: at(hour), endAt: at(hour + 1) }) as Task;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 21, 12, 0, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  mocks.blocks = undefined;
});

describe('TodayRail', () => {
  it('marks a finished block as done and names the next open one', () => {
    mocks.blocks = [block('Write report', 13, 'done'), block('Call vendor', 15)];
    render(createElement(TodayRail));

    const doneTitle = screen.getByText('Write report');
    expect(doneTitle.className).toContain('line-through');
    expect(doneTitle.nextElementSibling?.textContent).toBe('13:00 to 14:00 · done');
    expect(screen.getByText('Call vendor').nextElementSibling?.textContent).toBe('15:00 to 16:00');
    expect(screen.getByText('Next block').nextElementSibling?.textContent).toBe(
      '15:00 · Call vendor',
    );
  });
});
