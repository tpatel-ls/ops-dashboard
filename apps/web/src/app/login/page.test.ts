// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./actions', () => ({ login: vi.fn() }));

const { default: LoginPage } = await import('./page');

async function renderLogin(searchParams: { error?: string; next?: string }) {
  render(await LoginPage({ searchParams: Promise.resolve(searchParams) }));
}

afterEach(cleanup);

describe('LoginPage', () => {
  it('announces a failed sign-in and ties it to both fields', async () => {
    await renderLogin({ error: 'invalid' });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Incorrect email or password.');
    for (const field of [screen.getByLabelText('Email'), screen.getByLabelText('Password')]) {
      expect(field.getAttribute('aria-invalid')).toBe('true');
      expect(field.getAttribute('aria-describedby')).toBe(alert.id);
    }
  });

  it('marks no field invalid before a sign-in attempt', async () => {
    await renderLogin({});

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Email').hasAttribute('aria-invalid')).toBe(false);
    expect(screen.getByLabelText('Password').hasAttribute('aria-describedby')).toBe(false);
  });
});
