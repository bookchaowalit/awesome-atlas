import { expect, type Page, test } from '@playwright/test';

const projects = Array.from({ length: 25 }, (_, i) => ({
  id: `atlas/tool-${i}`,
  name: `tool-${i}`,
  owner: 'atlas',
  description: `Useful open source project ${i}`,
  url: `https://github.com/atlas/tool-${i}`,
  categories: ['platforms'],
  source_ids: ['atlas/awesome-tools'],
  kind: 'project',
  discovered_at: '2026-10-04T12:00:00+00:00',
  updated_at: '2026-10-04T12:00:00+00:00',
  stars: null,
  language: null,
}));
const list = { ...projects[0], id: 'atlas/awesome-tools', name: 'awesome-tools', kind: 'list' };

async function fixtureAPI(page: Page, options: { offline?: boolean } = {}) {
  await page.route('**/api/v1/**', async (route) => {
    if (options.offline) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/status'))
      return route.fulfill({
        json: {
          state: 'idle',
          last_synced_at: '2026-10-04T12:00:00+00:00',
          next_sync_at: null,
          sync_interval_seconds: 1800,
          project_count: 25,
          list_count: 1,
          category_count: 1,
          sources_synced: 1,
          sources_total: 1,
          last_error: null,
        },
      });
    if (url.pathname.endsWith('/categories'))
      return route.fulfill({ json: { items: [{ id: 'platforms', name: 'Platforms', count: 25 }] } });
    if (url.pathname.endsWith('/sources'))
      return route.fulfill({
        json: {
          items: [
            {
              id: 'atlas/awesome-tools',
              name: 'awesome-tools',
              owner: 'atlas',
              url: list.url,
              category: 'platforms',
              project_count: 25,
              last_synced_at: '2026-10-04T12:00:00+00:00',
              error: null,
            },
          ],
        },
      });
    const params = url.searchParams;
    const q = params.get('q')?.toLowerCase() || '';
    const ids = params.get('ids')?.split(',');
    let items = params.get('kind') === 'list' ? [list] : params.get('kind') === 'all' ? [...projects, list] : projects;
    items = items.filter((item) => (!ids || ids.includes(item.id)) && item.name.toLowerCase().includes(q));
    const offset = Number(params.get('offset') || 0);
    const limit = Number(params.get('limit') || 24);
    return route.fulfill({ json: { items: items.slice(offset, offset + limit), total: items.length, offset, limit } });
  });
}

test('search, provenance, saved persistence, and list navigation', async ({ page }) => {
  await fixtureAPI(page);
  await page.goto('/');
  await expect(page.locator('.project-card')).toHaveCount(24);
  await page.getByRole('textbox', { name: 'ค้นหาโปรเจกต์' }).fill('tool-17');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.project-title')).toHaveText('tool-17');
  await page.getByRole('button', { name: 'บันทึก tool-17', exact: true }).click();
  await page.locator('.source-toggle').click();
  await expect(page.locator('.provenance a').first()).toHaveAttribute('href', /view=list&source=atlas%2Fawesome-tools/);
  await expect(page.getByRole('link', { name: 'เปิดลิสต์ awesome-tools บน GitHub' })).toHaveAttribute('href', list.url);
  await page.getByRole('button', { name: /ที่บันทึกไว้/ }).click();
  await expect(page.locator('.project-title')).toHaveText('tool-17');
  await page.reload();
  await page.getByRole('button', { name: /ที่บันทึกไว้/ }).click();
  await expect(page.locator('.project-title')).toHaveText('tool-17');
  await page.getByRole('button', { name: /Awesome lists/ }).click();
  await expect(page.locator('.project-title')).toHaveText('awesome-tools');
});

test('saved pagination recovers when removing the only project on the last page', async ({ page }) => {
  await fixtureAPI(page);
  await page.addInitScript(
    (ids) => localStorage.setItem('awesome-atlas-saved-v1', JSON.stringify(ids)),
    projects.map((p) => p.id),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /ที่บันทึกไว้/ }).click();
  await expect(page.locator('.project-card')).toHaveCount(24);
  await page.getByRole('button', { name: 'หน้าถัดไป' }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'เลิกบันทึก tool-24', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(24);
  await expect(page.getByText('ยังไม่พบโปรเจกต์ที่ตรงกัน')).not.toBeVisible();
});

test('mobile navigation, theme, layout, and sources remain usable without overflow', async ({ page }) => {
  await fixtureAPI(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.project-card').first()).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'เปิดเมนู' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'เปลี่ยนเป็นธีมมืด' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'แสดงแบบรายการ' }).click();
  await expect(page.locator('.project-grid')).toHaveClass(/list-layout/);
  await page.getByRole('button', { name: 'เปิดเมนู' }).click();
  await page.getByRole('button', { name: 'แหล่งข้อมูล', exact: true }).click();
  await expect(page.locator('.source-row')).toHaveCount(1);
  await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('backend error offers a working recovery', async ({ page }) => {
  const options = { offline: true };
  await fixtureAPI(page, options);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('เชื่อมต่อข้อมูลไม่ได้');
  options.offline = false;
  await page.getByRole('button', { name: 'ลองอีกครั้ง' }).click();
  await expect(page.locator('.project-card')).toHaveCount(24);
  await expect(page.getByRole('alert')).not.toBeVisible();
});
