// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
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
  }),
}));

const { OrgSwitcher } = await import('./org-switcher');

afterEach(cleanup);

async function openMenu() {
  render(
    createElement('div', null, createElement(OrgSwitcher), createElement('button', null, 'After')),
  );
  await act(async () => {});
  fireEvent.click(screen.getByRole('button', { name: /Switch context/ }));
  return screen.getByRole('menu');
}

describe('OrgSwitcher', () => {
  it('closes the menu when focus leaves it', async () => {
    const menu = await openMenu();
    const item = screen.getByRole('menuitemradio', { name: /All work/ });

    fireEvent.blur(item, { relatedTarget: screen.getByRole('button', { name: 'After' }) });

    expect(menu.isConnected).toBe(false);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open while focus moves between its own items', async () => {
    await openMenu();
    const all = screen.getByRole('menuitemradio', { name: /All work/ });
    const personal = screen.getByRole('menuitemradio', { name: /Personal/ });

    fireEvent.blur(all, { relatedTarget: personal });

    expect(screen.getByRole('menu')).toBeTruthy();
  });
});
