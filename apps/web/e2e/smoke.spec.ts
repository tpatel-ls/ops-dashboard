import { expect, test } from '@playwright/test';

test('renders the sign-in entry point', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Taskify' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('serves an installable web manifest', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    name: 'Taskify',
    start_url: '/',
    display: 'standalone',
  });
});
