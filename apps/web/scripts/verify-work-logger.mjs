import { chromium } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const scenario = process.argv.includes('--scenario')
  ? process.argv[process.argv.indexOf('--scenario') + 1]
  : 'all';

async function openApp(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  const localLogin = page.getByRole('link', { name: 'Continue locally' });
  if (await localLogin.isVisible().catch(() => false)) {
    await localLogin.click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  }
}

async function verifyProjectOrganization(page) {
  await openApp(page, '/projects');
  await page.getByRole('button', { name: 'New' }).click();

  const createProjectForm = page.getByRole('form', { name: 'Create project' });
  const organization = createProjectForm.getByLabel('Organization');
  if (!(await organization.waitFor({ state: 'visible' }).then(() => true).catch(() => false))) {
    throw new Error('Project form is missing the organization selector');
  }

  await organization.locator('option').nth(1).waitFor({ state: 'attached' });
  const optionCount = await organization.locator('option').count();
  if (optionCount < 2) throw new Error('No work organization is available in the project form');

  const projectName = `Org visibility ${Date.now()}`;
  await createProjectForm.getByLabel('Project name').fill(projectName);
  await organization.selectOption({ index: 1 });
  const selectedLabel = await organization.locator('option:checked').textContent();
  await createProjectForm.getByRole('button', { name: 'Create project' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('heading', { name: projectName, exact: true }).waitFor({ state: 'hidden' });

  const cardRoot = page.locator('[data-project-card]').filter({ hasText: projectName });
  await cardRoot.waitFor({ state: 'visible' });
  if (!(await cardRoot.getByText(selectedLabel?.trim() ?? '').isVisible().catch(() => false))) {
    throw new Error('Created project is missing its organization label');
  }
  return { projectName, organizationName: selectedLabel?.trim() ?? '' };
}

async function addRapidTask(page, title) {
  const form = page.getByRole('form', { name: 'Quick task entry' });
  const input = form.getByLabel('Task title');
  await input.fill(title);
  await input.press('Enter');
  await form.locator('..').getByRole('status').waitFor({ state: 'visible' });
  await page.waitForFunction(
    ([inputId]) => {
      const element = document.getElementById(inputId);
      return element instanceof HTMLInputElement && element.value === '' && document.activeElement === element;
    },
    [await input.getAttribute('id')],
  );
}

async function verifyRapidTaskEntry(page, projectTarget) {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/dashboard');
  const stamp = Date.now();
  const firstTask = `Rapid task one ${stamp}`;
  const secondTask = `Rapid task two ${stamp}`;
  await addRapidTask(page, firstTask);
  await addRapidTask(page, secondTask);

  await openApp(page, '/tasks');
  await page.getByText(firstTask, { exact: true }).waitFor({ state: 'visible' });
  await page.getByText(secondTask, { exact: true }).waitFor({ state: 'visible' });

  if (!projectTarget) return;
  await openApp(page, '/dashboard');
  const form = page.getByRole('form', { name: 'Quick task entry' });
  await form.getByRole('button', { name: 'Details' }).click();
  await form.getByLabel('Organization').selectOption({ label: projectTarget.organizationName });
  await form.getByLabel('Project').locator('option', { hasText: projectTarget.projectName }).waitFor({ state: 'attached' });
  await form.getByLabel('Project').selectOption({ label: projectTarget.projectName });
  const projectTask = `Project task ${stamp}`;
  await addRapidTask(page, projectTask);

  await openApp(page, '/projects');
  const cardRoot = page.locator('[data-project-card]').filter({ hasText: projectTarget.projectName });
  await cardRoot.getByRole('button').first().click();
  await page.getByRole('heading', { name: projectTarget.projectName, exact: true }).waitFor({ state: 'visible' });
  await page.getByText(projectTask, { exact: true }).waitFor({ state: 'visible' });
}

async function verifyResponsiveLayouts(page) {
  const routes = ['/dashboard', '/tasks', '/projects', '/calendar'];
  const widths = [360, 390, 412, 768, 1024, 1440];

  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
    for (const route of routes) {
      await openApp(page, route);
      const geometry = await page.evaluate(() => ({
        viewport: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      }));
      if (geometry.documentWidth > geometry.viewport) {
        throw new Error(
          `${route} overflows at ${width}px: ${geometry.documentWidth}px document`,
        );
      }
    }

    await page.keyboard.press('g');
    await page.keyboard.press('a');
    const dialog = page.getByRole('dialog', { name: 'Add work' });
    await dialog.waitFor({ state: 'visible' });
    const dialogGeometry = await dialog.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      right: element.getBoundingClientRect().right,
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    if (
      dialogGeometry.width > Math.min(680, dialogGeometry.viewport) ||
      dialogGeometry.right > dialogGeometry.viewport ||
      dialogGeometry.documentWidth > dialogGeometry.viewport
    ) {
      throw new Error(`Logger overflows at ${width}px`);
    }
    await page.keyboard.press('Escape');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/dashboard');
  const mobileNav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Home', 'Tasks', 'Add task', 'Projects', 'Calendar']) {
    await mobileNav.getByRole(label === 'Add task' ? 'button' : 'link', { name: label, exact: true }).waitFor({ state: 'visible' });
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  try {
    let projectTarget;
    if (scenario === 'project-org' || scenario === 'all') {
      projectTarget = await verifyProjectOrganization(page);
    }
    if (scenario === 'rapid-entry' || scenario === 'all') {
      await verifyRapidTaskEntry(page, projectTarget);
    }
    if (scenario === 'responsive' || scenario === 'all') {
      await verifyResponsiveLayouts(page);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`);
    }
    console.log(`work logger verification passed: ${scenario}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
