// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_query: unknown, _deps: unknown, initial: unknown) => initial,
}));

const { Sidebar } = await import('./sidebar');

afterEach(cleanup);

describe('Sidebar', () => {
  it('names every navigation landmark it renders', () => {
    const { container } = render(createElement(Sidebar));
    const navs = Array.from(container.querySelectorAll('nav'));

    expect(navs.length).toBeGreaterThan(0);
    expect(navs.map((nav) => nav.getAttribute('aria-label'))).toEqual(['Tasks', 'More']);
    expect(screen.getByRole('navigation', { name: 'Tasks' }).textContent).toContain('Today');
  });
});
