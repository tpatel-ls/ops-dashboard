// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { OrgLaneLegend } = await import('./org-legend');

afterEach(cleanup);

describe('OrgLaneLegend', () => {
  it('groups the lane toggles under a name that says what they control', () => {
    const onToggle = vi.fn();
    render(
      createElement(OrgLaneLegend, {
        lanes: [
          { id: 'org-1', label: 'Acme', color: '#f00' },
          { id: 'personal', label: 'Personal', color: '#0f0' },
        ],
        hidden: new Set(['personal']),
        onToggle,
      }),
    );

    const group = screen.getByRole('group', { name: 'Lanes shown' });
    const acme = within(group).getByRole('button', { name: 'Acme' });
    expect(acme.getAttribute('aria-pressed')).toBe('true');
    const personal = within(group).getByRole('button', { name: 'Personal' });
    expect(personal.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(personal);
    expect(onToggle).toHaveBeenCalledWith('personal');
  });
});
