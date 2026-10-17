import { expect, type Page, test } from '@playwright/test';
import type { Project, Source } from '../../src/types';

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const synced = `${today}T12:00:00+00:00`;
const leftId = 'atlas/awesome-tools';
const rightId = 'atlas/awesome-data';
const nestedId = 'atlas/awesome-nested';
const providerId = 'antonkomarev/github-trending-archive';
function project(
  name: string,
  source_ids: string[],
  sections: string[] = [],
  kind: 'project' | 'list' = 'project',
): Project {
  return {
    id: `atlas/${name}`,
    name,
    owner: 'atlas',
    url: `https://github.com/atlas/${name}`,
    description: `Useful ${name}`,
    categories: ['platforms'],
    source_ids,
    source_count: source_ids.filter((id) => id !== 'sindresorhus/awesome').length,
    sections,
    kind,
    discovered_at: synced,
    updated_at: synced,
    stars: null,
    language: null,
  };
}
const entries = [
  project('alpha', [leftId, rightId], ['Utilities']),
  project('beta', [leftId, rightId], ['Databases']),
  project('left-tool', [leftId], ['Utilities']),
  project('right-tool', [rightId], ['Databases']),
  project('awesome-nested', [leftId], ['Nested lists'], 'list'),
  project('awesome-tools', ['sindresorhus/awesome'], [], 'list'),
  project('awesome-data', ['sindresorhus/awesome'], [], 'list'),
];
const sources: Source[] = [
  {
    id: leftId,
    name: 'awesome-tools',
    owner: 'atlas',
    url: `https://github.com/${leftId}`,
    category: 'platforms',
    project_count: 3,
    item_count: 4,
    last_synced_at: synced,
    error: null,
    sections: [
      { name: 'Utilities', count: 2 },
      { name: 'Databases', count: 1 },
      { name: 'Nested lists', count: 1 },
    ],
  },
  {
    id: rightId,
    name: 'awesome-data',
    owner: 'atlas',
    url: `https://github.com/${rightId}`,
    category: 'platforms',
    project_count: 3,
    item_count: 3,
    last_synced_at: synced,
    error: null,
    sections: [
      { name: 'Databases', count: 2 },
      { name: 'Utilities', count: 1 },
    ],
  },
  {
    id: nestedId,
    name: 'awesome-nested',
    owner: 'atlas',
    url: `https://github.com/${nestedId}`,
    category: 'platforms',
    project_count: 0,
    item_count: 0,
    last_synced_at: null,
    error: null,
    sections: [],
  },
];
const provider = {
  id: providerId,
  name: 'GitHub Trending Archive',
  url: `https://github.com/${providerId}`,
  description: 'Daily GitHub Trending archive',
  last_synced_at: synced,
  latest_date: today,
  error: null,
  dates: [today, yesterday],
};
const dailyEntries = Array.from({ length: 25 }, (_, index) => ({
  rank: index + 1,
  project: index === 0 ? entries[0] : { ...project(`daily-tool-${index}`, []), description: '' },
  source_count: index === 0 ? 2 : 0,
}));

async function fixture(page: Page, options: { dailyOffline?: boolean; datesOffline?: boolean } = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const params = url.searchParams;
    const q = (params.get('q') || '').toLowerCase();
    const offset = Number(params.get('offset') || 0);
    const limit = Number(params.get('limit') || 24);
    const pageData = <T>(items: T[]) => ({
      items: items.slice(offset, offset + limit),
      total: items.length,
      offset,
      limit,
    });
    if (url.pathname.endsWith('/daily/sources'))
      return route.fulfill({
        status: options.datesOffline ? 503 : 200,
        json: options.datesOffline ? { error: 'unavailable' } : { items: [provider] },
      });
    if (url.pathname.endsWith('/daily')) {
      if (options.dailyOffline) return route.fulfill({ status: 503, json: { error: 'unavailable' } });
      const date = params.get('date') || today;
      const items = (
        date === today ? dailyEntries : date === yesterday ? [dailyEntries[4], dailyEntries[9]] : []
      ).filter((entry) => entry.project.name.toLowerCase().includes(q));
      return route.fulfill({ json: { ...pageData(items), source: provider, date, captured_at: synced } });
    }
    if (url.pathname.endsWith('/status'))
      return route.fulfill({
        json: {
          state: 'idle',
          last_synced_at: synced,
          next_sync_at: null,
          sync_interval_seconds: 1800,
          project_count: 4,
          list_count: 3,
          category_count: 1,
          sources_synced: 2,
          sources_total: 3,
          last_error: null,
        },
      });
    if (url.pathname.endsWith('/categories'))
      return route.fulfill({ json: { items: [{ id: 'platforms', name: 'Platforms', count: 4 }] } });
    if (url.pathname.endsWith('/sources')) return route.fulfill({ json: { items: sources } });
    if (url.pathname.endsWith('/compare')) {
      const left = sources.find((source) => source.id === params.get('left'));
      const right = sources.find((source) => source.id === params.get('right'));
      if (!left || !right || left.id === right.id)
        return route.fulfill({ status: 422, json: { error: 'invalid sources' } });
      const shared = entries.filter(
        (entry) => entry.source_ids.includes(left.id) && entry.source_ids.includes(right.id),
      );
      const leftOnly = entries.filter(
        (entry) => entry.source_ids.includes(left.id) && !entry.source_ids.includes(right.id),
      );
      const rightOnly = entries.filter(
        (entry) => entry.source_ids.includes(right.id) && !entry.source_ids.includes(left.id),
      );
      const all = [...shared, ...leftOnly, ...rightOnly];
      const mode = params.get('mode');
      const items = (
        mode === 'left_only' ? leftOnly : mode === 'right_only' ? rightOnly : mode === 'all' ? all : shared
      ).filter((entry) => entry.name.includes(q));
      return route.fulfill({
        json: {
          ...pageData(items),
          left,
          right,
          shared_count: shared.length,
          left_only_count: leftOnly.length,
          right_only_count: rightOnly.length,
          union_count: all.length,
          overlap_percent: all.length ? (shared.length / all.length) * 100 : 0,
        },
      });
    }
    const ids = params.get('ids')?.split(',');
    const catalog = ids
      ? [
          ...new Map(
            [...entries, ...dailyEntries.map((item) => ({ ...item.project, source_count: item.source_count }))].map(
              (item) => [item.id, item],
            ),
          ).values(),
        ]
      : entries;
    let items = catalog.filter(
      (entry) =>
        (!ids || ids.includes(entry.id)) &&
        (params.get('kind') === 'all' || entry.kind === (params.get('kind') || 'project')),
    );
    if (params.get('source')) items = items.filter((entry) => entry.source_ids.includes(params.get('source')!));
    if (params.get('section')) items = items.filter((entry) => entry.sections?.includes(params.get('section')!));
    if (params.get('min_sources'))
      items = items.filter((entry) => (entry.source_count || 0) >= Number(params.get('min_sources')));
    if (params.get('sort') === 'mentions')
      items = [...items].sort((a, b) => (b.source_count || 0) - (a.source_count || 0) || a.id.localeCompare(b.id));
    items = items.filter((entry) => entry.name.toLowerCase().includes(q));
    return route.fulfill({ json: pageData(items) });
  });
}

test('list drilldown filters README sections, opens nested lists, and restores browser history', async ({ page }) => {
  await fixture(page);
  await page.goto('/?view=lists');
  const rootListCard = page
    .locator('.project-card')
    .filter({ has: page.locator('.project-title', { hasText: /^awesome-tools$/ }) });
  await rootListCard.locator('.source-toggle').click();
  await rootListCard.locator('.provenance a').first().click();
  await expect(page).toHaveURL(/view=lists$/);
  await page.getByRole('button', { name: 'awesome-tools', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(4);
  await expect(page.locator('h1')).toHaveText('awesome-tools');
  await expect(page.locator('.capture-label')).toContainText('อ่านต้นทางล่าสุด');
  await page.getByRole('combobox', { name: 'หมวดย่อยในลิสต์' }).selectOption('Utilities');
  await expect(page.locator('.project-card')).toHaveCount(2);
  await expect(page).toHaveURL(/section=Utilities/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'หมวดย่อยในลิสต์' })).toHaveValue('Utilities');
  await expect(page.locator('.project-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'หมวดย่อยในลิสต์' }).selectOption('Nested lists');
  await page.getByRole('button', { name: 'awesome-nested', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('awesome-nested');
  await expect(page.getByText('กำลังรอรายละเอียดของลิสต์นี้')).toBeVisible();
  await page.goBack();
  await expect(page.locator('h1')).toHaveText('awesome-tools');
  await expect(page.getByRole('combobox', { name: 'หมวดย่อยในลิสต์' })).toHaveValue('Nested lists');
  await expect(page.locator('.project-card')).toHaveCount(1);
});

test('comparison keeps overlap counts independent of search and warns about incomplete or identical sources', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/?view=compare');
  await page.getByRole('combobox', { name: 'ลิสต์ A', exact: true }).selectOption(leftId);
  await page.getByRole('combobox', { name: 'ลิสต์ B', exact: true }).selectOption(rightId);
  await expect(page.locator('.project-card')).toHaveCount(2);
  await expect(page.locator('.comparison-summary')).toContainText('40%');
  await expect(page.getByRole('button', { name: 'ทั้งหมดรวมกัน 5', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'ค้นหาโปรเจกต์' }).fill('alpha');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'ซ้ำกัน 2', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ล้างคำค้นหา' }).click();
  await page.getByRole('button', { name: 'เฉพาะลิสต์ A 2', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(2);
  await expect(page.locator('.project-title')).toHaveText(['left-tool', 'awesome-nested']);
  await page.getByRole('button', { name: 'เฉพาะลิสต์ B 1', exact: true }).click();
  await expect(page.locator('.project-title')).toHaveText('right-tool');
  await page.getByRole('combobox', { name: 'ลิสต์ B', exact: true }).selectOption(nestedId);
  await expect(page.locator('.source-warning')).toContainText('ยังไม่ได้อ่านรายละเอียดลิสต์');
  await expect(page.getByText(/การไม่พบรายการซ้ำยังไม่ได้แปล/)).toBeVisible();
  await page.getByRole('combobox', { name: 'ลิสต์ B', exact: true }).selectOption(leftId);
  await expect(page.getByRole('alert')).toContainText('คนละลิสต์');
  await expect(page.locator('.project-card')).toHaveCount(0);
});

test('mentions ranking uses the selected minimum, while daily ranking preserves provider rank through search and date changes', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/?view=rankings');
  await expect(page.locator('.project-title')).toHaveText(['alpha', 'beta']);
  await expect(page.locator('.mention-tag').first()).toHaveText('พบใน 2 ลิสต์');
  await expect(page.locator('.coverage-note')).toContainText('2 ลิสต์ที่อ่านแล้ว จาก 3');
  await page.getByRole('combobox', { name: 'จำนวนลิสต์ขั้นต่ำ' }).selectOption('1');
  await expect(page.locator('.project-card')).toHaveCount(4);
  await page.getByRole('tab', { name: 'พบในหลายลิสต์' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'อันดับรายวัน' })).toBeFocused();
  await expect(page.locator('.project-card')).toHaveCount(24);
  await expect(page.locator('.daily-credit')).toContainText(providerId);
  await expect(page.locator('.daily-credit')).toContainText(today);
  await page.getByRole('button', { name: 'หน้าถัดไป' }).click();
  await expect(page.locator('.project-title')).toHaveText('daily-tool-24');
  await expect(page.locator('.rank-number')).toHaveText('#25');
  await expect(page.locator('.project-card')).toContainText('ยังไม่พบในลิสต์ที่อ่านแล้ว');
  await expect(page.locator('.project-description')).toContainText('ต้นทางอันดับไม่ให้คำอธิบาย');
  await expect(page.locator('.source-toggle')).toHaveAttribute('href', provider.url);
  await page.getByRole('textbox', { name: 'ค้นหาโปรเจกต์' }).fill('daily-tool-24');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await expect(page.locator('.rank-number')).toHaveText('#25');
  await page.getByRole('button', { name: 'ล้างคำค้นหา' }).click();
  await page.getByRole('combobox', { name: 'วันที่อันดับรายวัน' }).selectOption(yesterday);
  await expect(page.locator('.project-card')).toHaveCount(2);
  await expect(page.locator('.rank-number')).toHaveText(['#5', '#10']);
  await expect(page.getByText('กำลังดูอันดับย้อนหลัง')).toBeVisible();
  await expect(page.getByText('ยังไม่มีอันดับของวันนี้')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'วันที่อันดับรายวัน' })).toHaveValue(yesterday);
  await expect(page.locator('.project-card')).toHaveCount(2);
});

test('daily endpoint and date metadata failures recover separately without hiding valid results', async ({ page }) => {
  const options = { dailyOffline: true, datesOffline: false };
  await fixture(page, options);
  await page.goto('/?view=rankings&ranking=daily');
  await expect(page.getByRole('alert')).toContainText('เชื่อมต่อข้อมูลไม่ได้');
  options.dailyOffline = false;
  await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(24);
  options.datesOffline = true;
  await page.getByRole('button', { name: 'รีเฟรชรายการ' }).click();
  await expect(page.getByRole('status')).toContainText('โหลดรายการวันที่ไม่ได้');
  await expect(page.locator('.project-card')).toHaveCount(24);
  options.datesOffline = false;
  await page.getByRole('button', { name: 'โหลดวันที่ใหม่' }).click();
  await expect(page.getByText(/โหลดรายการวันที่ไม่ได้/)).not.toBeVisible();
});

test('analysis views remain usable on mobile with source selection and snapshots', async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?view=compare&left=${encodeURIComponent(leftId)}&right=${encodeURIComponent(rightId)}`);
  await expect(page.locator('.project-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'เปลี่ยนเป็นธีมมืด' }).click();
  await page.getByRole('button', { name: 'เปิดเมนู' }).click();
  await page.getByRole('button', { name: 'จัดอันดับ', exact: true }).click();
  await page.getByRole('tab', { name: 'อันดับรายวัน' }).click();
  await expect(page.locator('.project-card')).toHaveCount(24);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a daily repository absent from Awesome remains visible after bookmarking and reloading saved projects', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/?view=rankings&ranking=daily');
  await page.getByRole('textbox', { name: 'ค้นหาโปรเจกต์' }).fill('daily-tool-24');
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'บันทึก daily-tool-24', exact: true }).click();
  await page.getByRole('button', { name: /ที่บันทึกไว้/ }).click();
  await expect(page.locator('.project-title')).toHaveText('daily-tool-24');
  await expect(page.locator('.source-toggle')).toContainText('Repository บน GitHub');
  await expect(page.locator('.project-description')).not.toContainText('Awesome list');
  await page.reload();
  await expect(page.locator('.project-title')).toHaveText('daily-tool-24');
  await page.getByRole('button', { name: 'เลิกบันทึก daily-tool-24', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(0);
});
