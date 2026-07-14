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
}

async function verifyResponsiveLayouts(page) {
  const routes = ['/dashboard', '/today', '/tasks', '/projects'];
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
    await page.keyboard.press('i');
    const dialog = page.getByRole('dialog', { name: 'Put work in the right place' });
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
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    if (scenario === 'project-org' || scenario === 'all') {
      await verifyProjectOrganization(page);
    }
    if (scenario === 'responsive' || scenario === 'all') {
      await verifyResponsiveLayouts(page);
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
