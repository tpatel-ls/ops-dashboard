// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const live = vi.hoisted(() => ({ pathname: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => live.pathname }));

const { MobileNav } = await import('./mobile-nav');

afterEach(() => {
  cleanup();
  live.pathname = '/dashboard';
});

describe('MobileNav', () => {
  it('marks the tab for a nested route as the current page', () => {
    live.pathname = '/projects/abc';
    render(createElement(MobileNav));

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const current = Array.from(nav.querySelectorAll('[aria-current="page"]'));
    expect(current.map((link) => link.textContent)).toEqual(['Projects']);
  });

  // The caption under the add button sat outside it, so a screen reader read
  // "Add task, button" followed by a stray "Add".
  it('announces the add button once', () => {
    render(createElement(MobileNav));

    expect(screen.getByRole('button', { name: 'Add task' })).toBeTruthy();
    expect(screen.getByText('Add').closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
