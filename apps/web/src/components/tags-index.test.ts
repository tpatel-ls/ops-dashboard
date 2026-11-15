// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@ops-dashboard/core';

const mocks = vi.hoisted(() => ({ tasks: undefined as Task[] | undefined }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.tasks }));

const { TagsIndex } = await import('./tags-index');

afterEach(() => {
  cleanup();
  mocks.tasks = undefined;
});

const task = (id: string, tags: string[]) => ({ id, title: id, status: 'todo', tags }) as Task;

describe('TagsIndex', () => {
  it('names each tag chip with what its count means', () => {
    mocks.tasks = [task('a', ['urgent', 'home']), task('b', ['urgent'])];
    render(createElement(TagsIndex));

    expect(screen.getByRole('button', { name: '#urgent, 2 tasks' })).toBeTruthy();
    const home = screen.getByRole('button', { name: '#home, 1 task' });

    fireEvent.click(home);
    expect(home.getAttribute('aria-pressed')).toBe('true');
  });
});
