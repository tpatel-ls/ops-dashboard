// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Content, Domain } from '@ops-dashboard/core';

const { ContentEditor } = await import('./content-board');

afterEach(cleanup);

describe('ContentEditor domain picker', () => {
  it('keeps showing an archived domain the item still belongs to', () => {
    const domains = [
      { id: 'work', name: 'Work' },
      { id: 'old', name: 'Old Show', archivedAt: '2026-10-01T00:00:00.000Z' },
      { id: 'gone', name: 'Gone', archivedAt: '2026-10-01T00:00:00.000Z' },
    ] as Domain[];
    const item = {
      id: 'c-1',
      title: 'Pilot episode',
      type: 'video',
      status: 'idea',
      domainId: 'old',
      checklist: [],
    } as unknown as Content;
    render(createElement(ContentEditor, { item, domains, onClose: () => {} }));

    const select = screen.getByRole('combobox', { name: 'Domain' }) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      'None',
      'Work',
      'Old Show (archived)',
    ]);
    expect(select.value).toBe('old');
  });
});
