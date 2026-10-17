import type { CompareMode } from './types';

export const PAGE_SIZE = 24;
export const SAVED_KEY = 'awesome-atlas-saved-v1';
const REPO_ID = /^[a-z\d][a-z\d-]*\/[a-z\d_.-]+$/i;

export function readSaved(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [
      ...new Set(
        value.filter((id): id is string => typeof id === 'string' && REPO_ID.test(id)).map((id) => id.toLowerCase()),
      ),
    ].slice(0, 200);
  } catch {
    return [];
  }
}

export function toggleSaved(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((value) => value !== id);
  return current.length >= 200 ? current : [...current, id];
}

export function projectQuery(filters: {
  q: string;
  category: string;
  source?: string;
  kind: 'project' | 'list' | 'all';
  sort: 'recent' | 'name' | 'mentions';
  page: number;
  saved?: string[];
  section?: string;
  minSources?: number;
}): string {
  const params = new URLSearchParams({
    q: filters.q,
    kind: filters.saved ? 'all' : filters.kind,
    sort: filters.sort,
    limit: String(PAGE_SIZE),
    offset: String(Math.max(0, filters.page) * PAGE_SIZE),
  });
  if (filters.category) params.set('category', filters.category);
  if (filters.source) params.set('source', filters.source);
  if (filters.saved) params.set('ids', filters.saved.join(','));
  if (filters.section) params.set('section', filters.section);
  if (filters.minSources) params.set('min_sources', String(filters.minSources));
  return params.toString();
}
export type View = 'explore' | 'lists' | 'list' | 'saved' | 'sources' | 'compare' | 'rankings';
export interface Navigation {
  view: View;
  source: string;
  section: string;
  left: string;
  right: string;
  mode: CompareMode;
  ranking: 'mentions' | 'daily';
  date: string;
  minSources: number;
}
export const DAILY_SOURCE = 'antonkomarev/github-trending-archive';
export const DEFAULT_NAVIGATION: Navigation = {
  view: 'explore',
  source: '',
  section: '',
  left: '',
  right: '',
  mode: 'shared',
  ranking: 'mentions',
  date: '',
  minSources: 2,
};
export function readNavigation(search: string): Navigation {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  const mode = params.get('mode');
  const repo = (key: string) => {
    const id = params.get(key) || '';
    return REPO_ID.test(id) ? id.toLowerCase() : '';
  };
  const minimum = Number(params.get('min_sources') || 2);
  return {
    ...DEFAULT_NAVIGATION,
    view: ['explore', 'lists', 'list', 'saved', 'sources', 'compare', 'rankings'].includes(view || '')
      ? (view as View)
      : 'explore',
    source: repo('source'),
    left: repo('left'),
    right: repo('right'),
    section: (params.get('section') || '').slice(0, 256),
    mode: ['shared', 'left_only', 'right_only', 'all'].includes(mode || '') ? (mode as CompareMode) : 'shared',
    ranking: params.get('ranking') === 'daily' ? 'daily' : 'mentions',
    date: /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date')! : '',
    minSources: Number.isInteger(minimum) && minimum >= 1 && minimum <= 1000 ? minimum : 2,
  };
}
export function navigationQuery(nav: Navigation): string {
  const params = new URLSearchParams();
  if (nav.view !== 'explore') params.set('view', nav.view);
  if (nav.view === 'list') {
    if (nav.source) params.set('source', nav.source);
    if (nav.section) params.set('section', nav.section);
  }
  if (nav.view === 'compare') {
    if (nav.left) params.set('left', nav.left);
    if (nav.right) params.set('right', nav.right);
    params.set('mode', nav.mode);
  }
  if (nav.view === 'rankings') {
    params.set('ranking', nav.ranking);
    if (nav.ranking === 'daily' && nav.date) params.set('date', nav.date);
    if (nav.ranking === 'mentions') params.set('min_sources', String(nav.minSources));
  }
  return params.toString();
}
