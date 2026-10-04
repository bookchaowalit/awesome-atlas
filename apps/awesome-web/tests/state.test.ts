import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVIGATION, navigationQuery, projectQuery, readNavigation, readSaved, toggleSaved } from '../src/state';
import { mentionCount, sourceWarning } from '../src/CatalogPanels';

describe('saved projects survive malformed or outdated browser storage', () => {
  it('ignores corrupted JSON and non-array values', () => {
    expect(readSaved('{bad')).toEqual([]);
    expect(readSaved('{"id":"owner/repo"}')).toEqual([]);
  });
  it('validates repository IDs, deduplicates, and bounds the saved collection', () => {
    expect(readSaved('["owner/repo","owner/repo",null,3,"javascript:bad"]')).toEqual(['owner/repo']);
    const many = Array.from({ length: 250 }, (_, i) => `owner/repo-${i}`);
    expect(readSaved(JSON.stringify(many))).toHaveLength(200);
    expect(toggleSaved(many.slice(0, 200), 'other/repo')).toHaveLength(200);
  });
});

describe('catalog deep links preserve their selected source and snapshot', () => {
  it('roundtrips list sections, comparison modes, and daily dates', () => {
    for (const change of [
      { view: 'list' as const, source: 'atlas/awesome-tools', section: 'Data & tools / SQL' },
      { view: 'compare' as const, left: 'atlas/awesome-tools', right: 'atlas/awesome-data', mode: 'right_only' as const },
      { view: 'rankings' as const, ranking: 'daily' as const, date: '2026-10-04' },
    ]) {
      const nav = { ...DEFAULT_NAVIGATION, ...change };
      expect(readNavigation(navigationQuery(nav))).toMatchObject(change);
    }
  });
  it('rejects invalid views and repository IDs in incoming links', () => {
    expect(readNavigation('?view=unknown&source=javascript:bad&left=https://example.com&mode=invalid&min_sources=-2&date=bad')).toEqual(DEFAULT_NAVIGATION);
    expect(readNavigation('?view=list&source=Atlas%2FAwesome-Tools').source).toBe('atlas/awesome-tools');
  });
  it('queries sections and distinct list counts while excluding the root list from fallback scores', () => {
    const params = new URLSearchParams(projectQuery({ q: '', category: '', kind: 'all', source: 'atlas/awesome-tools', section: 'Data & SQL', sort: 'mentions', minSources: 3, page: 0 }));
    expect(params.get('section')).toBe('Data & SQL');
    expect(params.get('source')).toBe('atlas/awesome-tools');
    expect(params.get('sort')).toBe('mentions');
    expect(params.get('min_sources')).toBe('3');
    expect(mentionCount({ source_ids: ['sindresorhus/awesome', 'atlas/awesome-tools'] })).toBe(1);
    expect(mentionCount({ source_count: 0, source_ids: ['atlas/awesome-tools'] })).toBe(0);
  });
  it('distinguishes pending, failed, and older source captures', () => {
    const source = { id: 'atlas/tools', name: 'tools', owner: 'atlas', url: 'https://github.com/atlas/tools', category: 'platforms', project_count: 0, last_synced_at: null, error: null };
    expect(sourceWarning(source)).toContain('ยังไม่ได้อ่าน');
    expect(sourceWarning({ ...source, last_synced_at: new Date().toISOString(), error: 'failed' })).toContain('อัปเดตไม่สำเร็จ');
    expect(sourceWarning({ ...source, last_synced_at: '2000-01-01T00:00:00Z' })).toContain('24 ชั่วโมง');
    expect(sourceWarning({ ...source, last_synced_at: new Date().toISOString() })).toBeNull();
  });
});

describe('queries preserve user intent across pages and saved views', () => {
  it('encodes search input and requests the chosen kind and page', () => {
    const query = new URLSearchParams(projectQuery({ q: 'C++ & tools', kind: 'list', category: 'data', sort: 'name', page: 2 }));
    expect(query.get('q')).toBe('C++ & tools');
    expect(query.get('offset')).toBe('48');
    expect(query.get('kind')).toBe('list');
    expect(query.get('category')).toBe('data');
  });
  it('uses all kinds for saved projects and passes the selected IDs', () => {
    const query = new URLSearchParams(projectQuery({ q: '', kind: 'project', category: '', sort: 'recent', page: 0, saved: ['owner/repo'] }));
    expect(query.get('kind')).toBe('all');
    expect(query.get('ids')).toBe('owner/repo');
  });
});
