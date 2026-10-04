import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, BookOpen, Box,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Code2,
  Compass, Database, ExternalLink, FolderHeart, Grid2X2, Layers,
  GitCompareArrows, List, Menu, Moon, RefreshCw, Search, Sparkles, Sun, Trophy, X,
} from 'lucide-react';
import { DAILY_SOURCE, DEFAULT_NAVIGATION, navigationQuery, projectQuery, readNavigation, readSaved, toggleSaved, PAGE_SIZE, SAVED_KEY } from './state';
import type { Navigation, View } from './state';
import { ComparePanel, ListPanel, mentionCount, RankingsPanel } from './CatalogPanels';
import type { Category, ComparePage, DailyPage, DailySource, Project, ProjectPage, Source, SyncStatus } from './types';

function Github({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.543 0-.267-.01-.974-.015-1.911-3.13.68-3.79-1.508-3.79-1.508-.512-1.3-1.25-1.646-1.25-1.646-1.023-.7.078-.686.078-.686 1.13.08 1.725 1.16 1.725 1.16 1.006 1.723 2.639 1.225 3.282.936.102-.728.394-1.225.716-1.507-2.498-.285-5.124-1.249-5.124-5.56 0-1.229.439-2.233 1.16-3.021-.117-.284-.503-1.429.11-2.978 0 0 .945-.302 3.094 1.154A10.79 10.79 0 0 1 12 6.186c.957.005 1.92.129 2.817.378 2.148-1.456 3.09-1.154 3.09-1.154.616 1.549.23 2.694.114 2.978.723.788 1.158 1.792 1.158 3.022 0 4.322-2.63 5.272-5.136 5.55.404.349.764 1.035.764 2.086 0 1.507-.014 2.723-.014 3.093 0 .302.203.653.774.542A11.252 11.252 0 0 0 12 .75Z" /></svg>;
}
const EMPTY_PAGE: ProjectPage = { items: [], total: 0, limit: PAGE_SIZE, offset: 0 };
const LABELS: Record<string, string> = {
  platforms: 'แพลตฟอร์ม', 'programming-languages': 'ภาษาโปรแกรม',
  'front-end-development': 'พัฒนา Frontend', 'back-end-development': 'พัฒนา Backend',
  'computer-science': 'วิทยาการคอมพิวเตอร์', 'big-data': 'ข้อมูลขนาดใหญ่',
  databases: 'ฐานข้อมูล', security: 'ความปลอดภัย', gaming: 'เกม',
  'development-environment': 'เครื่องมือพัฒนา', learn: 'การเรียนรู้',
  'machine-learning': 'Machine Learning', miscellaneous: 'หมวดอื่น ๆ',
  media: 'สื่อและครีเอทีฟ', business: 'ธุรกิจ', work: 'การทำงาน',
  testing: 'การทดสอบ', networking: 'เครือข่าย', books: 'หนังสือ',
  editors: 'โปรแกรมแก้ไขโค้ด', hardware: 'ฮาร์ดแวร์',
};
const number = (n: number) => new Intl.NumberFormat('en-US').format(n);
const categoryLabel = (c: Category) => LABELS[c.id] || c.name;
function categoryIcon(id: string) {
  if (/data/.test(id)) return Database;
  if (/language|development|computer|testing/.test(id)) return Code2;
  if (/learn|book/.test(id)) return BookOpen;
  return Layers;
}
function timeLabel(value: string | null): string {
  if (!value) return 'ยังไม่ซิงก์';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'ไม่ทราบเวลา';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} ชม. ที่แล้ว`;
  return date.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short' });
}
function avatarClass(name: string): string {
  return `tone-${[...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 6}`;
}
async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { signal });
  if (!response.ok) throw new Error(`API ตอบกลับ ${response.status}`);
  return response.json() as Promise<T>;
}

function ProjectCard({ project, saved, onSave, categories, sources, compact, onOpenList, rank, dailySource }: {
  project: Project; saved: boolean; onSave: () => void;
  categories: Category[]; sources: Source[]; compact: boolean;
  onOpenList: (id: string) => void; rank?: number; dailySource?: DailySource;
}) {
  const [expanded, setExpanded] = useState(false);
  const category = categories.find(c => c.id === project.categories[0]);
  const source = sources.find(s => project.source_ids.includes(s.id));
  const label = category ? categoryLabel(category) : 'โอเพนซอร์ส';
  return (
    <article className={`project-card ${compact ? 'compact' : ''}`}>
      <div className="card-top">
        {rank !== undefined && <span className="rank-number" aria-label={`อันดับ ${rank}`}>#{rank}</span>}
        <span className={`project-avatar ${avatarClass(project.owner)}`} aria-hidden="true">
          {project.name.replace(/^awesome-/, '').slice(0, 2).toUpperCase()}
        </span>
        <div className="project-identity">
          {project.kind === 'list' ? <button className="project-title internal-list" onClick={() => onOpenList(project.id)}>{project.name}<ArrowRight size={14} /></button> : <a href={project.url} target="_blank" rel="noopener noreferrer" className="project-title">{project.name}<ArrowUpRight size={14} /></a>}
          <span className="project-owner">{project.owner}</span>
        </div>
        <button className={`icon-button save-button ${saved ? 'saved' : ''}`} onClick={onSave}
          aria-label={`${saved ? 'เลิกบันทึก' : 'บันทึก'} ${project.name}`} aria-pressed={saved} title={saved ? 'เลิกบันทึก' : 'บันทึกโปรเจกต์'}>
          <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className="project-description">{project.description || (dailySource ? 'ต้นทางอันดับไม่ให้คำอธิบาย เปิด GitHub เพื่อดูรายละเอียด' : !project.source_ids.length ? 'ต้นทางไม่ได้ให้คำอธิบาย เปิด GitHub เพื่อดูรายละเอียด' : 'ค้นพบโปรเจกต์นี้ใน Awesome list บน GitHub เปิดต้นทางเพื่อดูรายละเอียดเพิ่มเติม')}</p>
      <div className="project-tags"><span className={`category-tag ${avatarClass(project.categories[0] || '')}`}>{label}</span>
        {project.kind === 'list' && <span className="plain-tag">Awesome list</span>}
        {project.language && <span className="plain-tag">{project.language}</span>}
        {mentionCount(project) > 0 && <span className="plain-tag mention-tag">พบใน {mentionCount(project)} ลิสต์</span>}
        {rank !== undefined && !mentionCount(project) && <span className="plain-tag">ยังไม่พบในลิสต์ที่อ่านแล้ว</span>}
        {project.sections?.[0] && <span className="plain-tag section-tag" title={project.sections.join(' · ')}>{project.sections[0]}</span>}
      </div>
      <div className="card-footer">
        {!project.source_ids.length ? <a className="source-toggle" href={dailySource?.url || project.url} target="_blank" rel="noopener noreferrer">{dailySource ? <Trophy size={13} /> : <Github size={13} />}<span>{dailySource?.name || 'Repository บน GitHub'}</span><ExternalLink size={12} /></a> : <button className="source-toggle" onClick={() => setExpanded(!expanded)} aria-label={`${expanded ? 'ซ่อน' : 'ดู'}ที่มาของ ${project.name}`} aria-expanded={expanded}>
          <BookOpen size={13} /><span>{source?.name || 'GitHub Awesome'}</span><ChevronDown size={12} className={expanded ? 'rotate' : ''} />
        </button>}
        <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`เปิด ${project.name} บน GitHub`} className="repo-link"><Github size={16} /></a>
      </div>
      {expanded && !!project.source_ids.length && <div className="provenance">
        <strong>พบใน Awesome lists</strong>
        {project.source_ids.map(id => {
          const item = sources.find(s => s.id === id);
          return <div key={id} className="provenance-row"><a href={`?${navigationQuery({ ...DEFAULT_NAVIGATION, view: id === 'sindresorhus/awesome' ? 'lists' : 'list', source: id })}`} onClick={event => { event.preventDefault(); onOpenList(id); }}>{item?.name || id}<ArrowRight size={12} /></a><a href={item?.url || `https://github.com/${id}`} target="_blank" rel="noopener noreferrer" aria-label={`เปิดลิสต์ ${item?.name || id} บน GitHub`}><ExternalLink size={12} /></a></div>;
        })}
        <span>ตรวจข้อมูล {timeLabel(project.updated_at)}</span>
      </div>}
    </article>
  );
}

export default function App() {
  const [nav, setNav] = useState<Navigation>(() => readNavigation(window.location.search));
  const view = nav.view;
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [page, setPage] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [results, setResults] = useState<ProjectPage>(EMPTY_PAGE);
  const [comparison, setComparison] = useState<ComparePage | null>(null);
  const [daily, setDaily] = useState<DailyPage | null>(null);
  const [dailySources, setDailySources] = useState<DailySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [dailyMetadataError, setDailyMetadataError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [allCategories, setAllCategories] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [compact, setCompact] = useState(false);
  const [toast, setToast] = useState('');
  const [saved, setSaved] = useState<string[]>(() => {
    try { return readSaved(localStorage.getItem(SAVED_KEY)); } catch { return []; }
  });
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('awesome-atlas-theme') === 'dark'; } catch { return false; }
  });
  const searchRef = useRef<HTMLInputElement>(null);
  const requestKey = useRef('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 250);
    return () => window.clearTimeout(timer);
  }, [q]);
  useEffect(() => { setPage(0); }, [debouncedQ, category, sourceFilter, sort, nav]);
  useEffect(() => {
    const query = navigationQuery(nav);
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [nav]);
  useEffect(() => {
    const onPop = () => {
      setNav(readNavigation(window.location.search)); setQ(''); setDebouncedQ(''); setPage(0);
      setCategory(''); setSourceFilter(''); setResults(EMPTY_PAGE); setComparison(null); setDaily(null); setError(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('awesome-atlas-theme', dark ? 'dark' : 'light'); } catch { /* Theme still works without storage. */ }
  }, [dark]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault(); searchRef.current?.focus();
      }
      if (event.key === 'Escape') setMobileMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    async function loadMetadata() {
      try {
        const [cats, lists, sync] = await Promise.all([
          getJSON<{ items: Category[] }>('categories', controller.signal),
          getJSON<{ items: Source[] }>('sources', controller.signal),
          getJSON<SyncStatus>('status', controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setCategories(cats.items); setSources(lists.items); setStatus(sync); setMetadataError(null);
      } catch (err) {
        if (!cancelled) setMetadataError(controller.signal.aborted ? 'โหลดแหล่งข้อมูลใช้เวลานาน' : err instanceof Error ? err.message : 'เชื่อมต่อไม่สำเร็จ');
      } finally { window.clearTimeout(timeout); }
    }
    let cancelled = false;
    void loadMetadata();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [refresh]);

  useEffect(() => {
    if (view !== 'rankings' || nav.ranking !== 'daily') return;
    const controller = new AbortController();
    let cancelled = false;
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    getJSON<{ items: DailySource[] }>('daily/sources', controller.signal).then(data => {
      if (!controller.signal.aborted) { setDailySources(data.items); setDailyMetadataError(null); }
    }).catch(err => {
      if (!cancelled) setDailyMetadataError(controller.signal.aborted ? 'โหลดวันที่อันดับใช้เวลานาน' : err instanceof Error ? err.message : 'โหลดแหล่งอันดับไม่ได้');
    }).finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [view, nav.ranking, refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setRefresh(n => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    if (q !== debouncedQ && view !== 'sources') {
      setResults(EMPTY_PAGE); setLoading(true); setError(null); window.clearTimeout(timeout);
      return () => controller.abort();
    }
    const compareReady = !!nav.left && !!nav.right && nav.left !== nav.right;
    if (view === 'sources' || (view === 'saved' && !saved.length) || (view === 'compare' && !compareReady) || (view === 'list' && !nav.source)) {
      setResults(EMPTY_PAGE); setLoading(false); setError(null);
      window.clearTimeout(timeout);
      return () => controller.abort();
    }
    const query = projectQuery({ q: debouncedQ, category: view === 'list' ? '' : category, source: view === 'list' ? nav.source : sourceFilter,
      kind: view === 'lists' ? 'list' : view === 'list' ? 'all' : 'project', sort: view === 'rankings' ? 'mentions' : sort, page,
      ...(view === 'list' ? { section: nav.section } : {}),
      ...(view === 'rankings' ? { minSources: nav.minSources } : {}),
      ...(view === 'saved' ? { saved } : {}),
    });
    const params = new URLSearchParams({ q: debouncedQ, limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    let endpoint = `projects?${query}`;
    if (view === 'compare') {
      params.set('left', nav.left); params.set('right', nav.right); params.set('mode', nav.mode); params.set('kind', 'all');
      endpoint = `compare?${params}`;
    } else if (view === 'rankings' && nav.ranking === 'daily') {
      params.set('source', DAILY_SOURCE);
      if (nav.date) params.set('date', nav.date);
      endpoint = `daily?${params}`;
    }
    if (requestKey.current !== endpoint) { setResults(EMPTY_PAGE); requestKey.current = endpoint; }
    setLoading(true); setError(null);
    getJSON<ProjectPage | ComparePage | DailyPage>(endpoint, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        if (page > 0 && data.offset >= data.total) {
          setPage(Math.max(0, Math.ceil(data.total / PAGE_SIZE) - 1));
          return;
        }
        if (view === 'compare') setComparison(data as ComparePage);
        if (view === 'rankings' && nav.ranking === 'daily') {
          const dailyPage = data as DailyPage;
          setDaily(dailyPage);
          setResults({ ...dailyPage, items: dailyPage.items.map(item => ({ ...item.project, source_count: item.source_count })) });
        } else setResults(data as ProjectPage);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'เชื่อมต่อไม่สำเร็จ');
        else if (!cancelled) setError('การเชื่อมต่อใช้เวลานาน กรุณาลองอีกครั้ง');
      })
      .finally(() => { if (!cancelled) setLoading(false); window.clearTimeout(timeout); });
    let cancelled = false;
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [q, debouncedQ, category, sourceFilter, nav, sort, page, saved, refresh]);

  function changeNav(patch: Partial<Navigation>) {
    setNav(current => ({ ...current, ...patch })); setPage(0); setResults(EMPTY_PAGE); setError(null);
    if ('left' in patch || 'right' in patch) setComparison(null);
    if ('date' in patch || 'ranking' in patch) setDaily(null);
  }
  function navigate(next: View, patch: Partial<Navigation> = {}) {
    const target = { ...DEFAULT_NAVIGATION, view: next, ...patch };
    const query = navigationQuery(target);
    window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    setNav(target); setCategory(''); setSourceFilter(''); setQ(''); setDebouncedQ(''); setPage(0); setMobileMenu(false);
    setResults(EMPTY_PAGE); setComparison(null); setDaily(null); setError(null); setLoading(true);
  }
  const openList = (id: string) => id === 'sindresorhus/awesome' ? navigate('lists') : navigate('list', { source: id });
  function save(id: string) {
    const next = toggleSaved(saved, id);
    if (next.length === saved.length && !saved.includes(id)) {
      setToast('บันทึกได้สูงสุด 200 โปรเจกต์'); return;
    }
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      setToast(saved.includes(id) ? 'นำออกจากรายการที่บันทึกแล้ว' : 'บันทึกโปรเจกต์แล้ว');
    } catch { setToast('บันทึกไว้ชั่วคราว เบราว์เซอร์ไม่อนุญาตให้เก็บข้อมูล'); }
  }
  function pickCategory(id: string) {
    setCategory(id); setSourceFilter(''); setPage(0); setMobileMenu(false);
    if (['sources', 'list', 'compare'].includes(view) || (view === 'rankings' && nav.ranking === 'daily')) navigate('explore');
    setCategory(id);
  }
  const activeCategory = categories.find(c => c.id === category);
  const names: Record<View, string> = { explore: 'สำรวจโปรเจกต์', lists: 'Awesome lists', list: 'รายละเอียดลิสต์', saved: 'ที่บันทึกไว้', sources: 'แหล่งข้อมูล', compare: 'เปรียบเทียบลิสต์', rankings: 'จัดอันดับ' };
  const featured = sources.find(s => /awesome-selfhosted/.test(s.id) && s.project_count > 0) || sources.find(s => s.project_count > 0);
  const sourceResults = sources.filter(s => `${s.name} ${s.owner} ${s.category}`.toLowerCase().includes(q.toLowerCase()) && (!category || s.category === category));
  const pageCount = Math.ceil(results.total / PAGE_SIZE);
  const statusText = status?.state === 'syncing' ? 'กำลังซิงก์จาก GitHub' : status?.state === 'degraded' ? 'บางแหล่งซิงก์ไม่สำเร็จ' : status?.last_synced_at ? 'อัปเดตอัตโนมัติเปิดอยู่' : 'กำลังรอข้อมูล';
  const activeSource = sources.find(source => source.id === nav.source);
  const isDaily = view === 'rankings' && nav.ranking === 'daily';
  const isCompareReady = !!nav.left && !!nav.right && nav.left !== nav.right;
  const currentError = error || (view === 'sources' ? metadataError : null);

  return <div className="app-shell">
    <a href="#main-content" className="skip-link">ข้ามไปเนื้อหา</a>
    {mobileMenu && <button className="sidebar-backdrop" onClick={() => setMobileMenu(false)} aria-label="ปิดเมนู" />}
    <aside className={`sidebar ${mobileMenu ? 'open' : ''}`} aria-label="เมนูหลัก">
      <button className="brand" onClick={() => navigate('explore')} aria-label="Awesome Atlas หน้าแรก">
        <span className="brand-mark"><Sparkles size={21} /></span><span>awesome<span className="brand-light">atlas</span><small>สิ่งดี ๆ ในโลกโอเพนซอร์ส</small></span>
      </button>
      <div className="sidebar-body">
        <nav className="primary-nav">
          <button onClick={() => navigate('explore')} className={view === 'explore' ? 'active' : ''}><Compass size={19} />สำรวจโปรเจกต์</button>
          <button onClick={() => navigate('lists')} className={view === 'lists' || view === 'list' ? 'active' : ''}><Layers size={19} />Awesome lists<span className="nav-count">{number(status?.list_count || 0)}</span></button>
          <button onClick={() => navigate('compare')} className={view === 'compare' ? 'active' : ''}><GitCompareArrows size={19} />เปรียบเทียบลิสต์</button>
          <button onClick={() => navigate('rankings')} className={view === 'rankings' ? 'active' : ''}><Trophy size={19} />จัดอันดับ</button>
          <button onClick={() => navigate('saved')} className={view === 'saved' ? 'active' : ''}><Bookmark size={19} />ที่บันทึกไว้<span className="nav-count">{saved.length}</span></button>
          <button onClick={() => navigate('sources')} className={view === 'sources' ? 'active' : ''}><Database size={19} />แหล่งข้อมูล</button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-label"><span>ค้นหาตามหมวดหมู่</span><span>{categories.length}</span></div>
        <nav className="category-nav" aria-label="หมวดหมู่">
          <button className={!category ? 'selected' : ''} onClick={() => pickCategory('')}><Grid2X2 size={16} /><span>ทุกหมวดหมู่</span></button>
          {(allCategories ? categories : categories.slice(0, 9)).map(c => {
            const Icon = categoryIcon(c.id);
            return <button key={c.id} className={category === c.id ? 'selected' : ''} onClick={() => pickCategory(c.id)}><Icon size={16} /><span>{categoryLabel(c)}</span><small>{number(c.count)}</small></button>;
          })}
        </nav>
        {categories.length > 9 && <button className="more-categories" onClick={() => setAllCategories(!allCategories)}>{allCategories ? 'แสดงหมวดน้อยลง' : 'ดูหมวดหมู่ทั้งหมด'}<ChevronDown size={14} className={allCategories ? 'rotate' : ''} /></button>}
      </div>
      <div className="sidebar-bottom">
        <div className="sync-status"><span className={`status-dot ${status?.state === 'degraded' ? 'warning' : ''}`} /><strong>{statusText}</strong><span>ซิงก์ทุก {Math.round((status?.sync_interval_seconds || 1800) / 60)} นาที</span></div>
        <a href="https://github.com/sindresorhus/awesome" target="_blank" rel="noopener noreferrer" className="sidebar-github"><Github size={16} />ขอบคุณชุมชน Awesome<ArrowUpRight size={13} /></a>
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileMenu(!mobileMenu)} aria-label="เปิดเมนู" aria-expanded={mobileMenu}><Menu size={21} /></button>
        <div className="breadcrumb"><Compass size={16} /><span>ค้นพบ</span><ChevronRight size={13} /><strong>{names[view]}</strong></div>
        <div className="topbar-actions"><span className="github-data"><span className="status-dot" />ข้อมูลจาก GitHub</span><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></div>
      </header>
      <main id="main-content">
        {view === 'explore' && <section className="hero">
          <div className="hero-copy"><h1>โลกโอเพนซอร์สกว้างใหญ่<br /><span>เจอโปรเจกต์ที่ใช่ได้ที่นี่</span></h1><p>รวมสิ่งดี ๆ จาก Awesome lists ทั่ว GitHub<br className="desktop-break" /> เลือกหมวดที่สนใจ แล้วเริ่มค้นพบไอเดียใหม่ ๆ</p>
            <div className="hero-facts"><span><Box size={15} /><strong>{number(status?.project_count || 0)}</strong> โปรเจกต์</span><i /><span><Layers size={15} /><strong>{number(status?.list_count || 0)}</strong> awesome lists</span><i /><span><span className="status-dot" />{timeLabel(status?.last_synced_at || null)}</span></div>
          </div>
          <button className="feature-panel" onClick={() => { if (featured) openList(featured.id); else navigate('lists'); }}>
            <div className="feature-orbit" aria-hidden="true"><span className="orbit-one" /><span className="orbit-two" /><span className="orbit-center"><Compass size={37} strokeWidth={1.3} /></span><span className="orbit-spark"><Sparkles size={16} /></span><span className="orbit-code"><Code2 size={19} /></span></div>
            <span className="feature-content"><strong>{featured ? featured.name : 'มีอะไรให้ค้นพบอีกเยอะ'}</strong><span>{featured ? `${number(featured.project_count)} โปรเจกต์ที่ชุมชนคัดมาให้` : 'สำรวจ Awesome lists จากทั่ว GitHub'}</span><span className="feature-cta">เริ่มสำรวจ<ArrowRight size={15} /></span></span>
            <ArrowUpRight size={18} className="feature-arrow" />
          </button>
        </section>}
        {['lists', 'saved', 'sources'].includes(view) && <section className="view-heading"><h1>{names[view]}</h1><p>{view === 'lists' ? 'เปิดลิสต์เพื่อดูโปรเจกต์และหมวดย่อยภายในเว็บ หรือเปรียบเทียบกับลิสต์อื่น' : view === 'saved' ? 'เก็บโปรเจกต์ที่อยากกลับมาดูอีกครั้ง รายการนี้บันทึกในเบราว์เซอร์ของคุณ' : 'ตรวจสอบลิสต์ต้นทางและสถานะการอัปเดตของแต่ละแหล่ง'}</p></section>}
        {view === 'list' && <ListPanel nav={nav} source={activeSource} onChange={changeNav} onBack={() => navigate('lists')} onCompare={() => navigate('compare', { left: nav.source })} />}
        {view === 'compare' && <ComparePanel nav={nav} sources={sources} comparison={comparison} onChange={changeNav} onSwap={() => changeNav({ left: nav.right, right: nav.left })} />}
        {view === 'rankings' && <RankingsPanel nav={nav} providers={dailySources} daily={daily} onChange={changeNav} />}
        <section className="discovery" aria-label="ค้นหาและรายการโปรเจกต์">
          <div className="search-box"><Search size={20} /><input ref={searchRef} value={q} maxLength={256} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder={view === 'sources' ? 'ค้นหาแหล่งข้อมูล…' : 'ค้นหาโปรเจกต์ เครื่องมือ หรือไอเดีย…'} aria-label="ค้นหาโปรเจกต์" />{q ? <button className="icon-button" onClick={() => { setQ(''); setPage(0); }} aria-label="ล้างคำค้นหา"><X size={16} /></button> : <kbd>Ctrl K</kbd>}</div>
          <div className="filter-row"><div className="filter-chips">{!['list', 'compare'].includes(view) && !isDaily && <><button className={!category && !sourceFilter ? 'chip active' : 'chip'} onClick={() => { setCategory(''); setSourceFilter(''); }}>ทั้งหมด</button>{categories.filter(c => /platforms|front-end-development|back-end-development|databases|computer-science/.test(c.id)).slice(0, 4).map(c => <button className={`chip ${category === c.id ? 'active' : ''}`} onClick={() => pickCategory(c.id)} key={c.id}>{categoryLabel(c)}</button>)}</>}
            {sourceFilter && <button className="chip active" onClick={() => setSourceFilter('')}>{sources.find(s => s.id === sourceFilter)?.name || sourceFilter}<X size={12} /></button>}
          </div><button className="refresh-button" onClick={() => setRefresh(n => n + 1)} aria-label="รีเฟรชรายการ"><RefreshCw size={15} className={loading ? 'spinning' : ''} /><span>รีเฟรช</span></button></div>
          <div className="results-heading"><div><h2>{activeCategory ? categoryLabel(activeCategory) : view === 'explore' ? 'ค้นพบสิ่งที่น่าสนใจ' : names[view]}</h2><span>{number(view === 'sources' ? sourceResults.length : results.total)} {view === 'sources' ? 'แหล่งข้อมูล' : 'รายการ'}{q && ` สำหรับ “${q}”`}</span></div>
            {view !== 'sources' && <div className="result-tools">{view !== 'compare' && view !== 'rankings' && <label className="sort-select"><ArrowDownUp size={14} /><select value={sort} onChange={e => { setSort(e.target.value as 'recent' | 'name'); setPage(0); }} aria-label="เรียงรายการ"><option value="recent">ค้นพบล่าสุด</option><option value="name">ชื่อ A–Z</option></select><ChevronDown size={13} /></label>}<div className="layout-toggle" aria-label="รูปแบบการแสดง"><button className={!compact ? 'active' : ''} onClick={() => setCompact(false)} aria-label="แสดงแบบการ์ด" aria-pressed={!compact}><Grid2X2 size={16} /></button><button className={compact ? 'active' : ''} onClick={() => setCompact(true)} aria-label="แสดงแบบรายการ" aria-pressed={compact}><List size={17} /></button></div></div>}
          </div>
          {view === 'explore' && status && status.sources_synced < status.sources_total && <div className="coverage-note"><BookOpen size={14} /><span>อ่านรายละเอียดแล้ว {number(status.sources_synced)} จาก {number(status.sources_total)} ลิสต์ · ระบบจะทยอยเพิ่มโปรเจกต์ในแต่ละรอบ</span><button onClick={() => navigate('sources')}>ดูแหล่งข้อมูล<ArrowUpRight size={12} /></button></div>}
          {view === 'rankings' && !isDaily && status && <div className="coverage-note"><BookOpen size={14} /><span>อันดับจาก {number(status.sources_synced)} ลิสต์ที่อ่านแล้ว จาก {number(status.sources_total)} ลิสต์ที่ค้นพบ</span></div>}
          {metadataError && view !== 'sources' && <div className="inline-notice" role="status"><CircleHelp size={17} /><span>โหลดสถานะแหล่งข้อมูลไม่ได้ · {metadataError}</span><button onClick={() => setRefresh(n => n + 1)}>โหลดแหล่งข้อมูลใหม่</button></div>}
          {isDaily && dailyMetadataError && <div className="inline-notice" role="status"><CircleHelp size={17} /><span>โหลดรายการวันที่ไม่ได้ · {dailyMetadataError}</span><button onClick={() => setRefresh(n => n + 1)}>โหลดวันที่ใหม่</button></div>}
          {status?.state === 'degraded' && <div className="inline-notice"><CircleHelp size={17} /><span>บางแหล่งยังอัปเดตไม่สำเร็จ กำลังแสดงข้อมูลที่เก็บไว้ล่าสุด</span><button onClick={() => navigate('sources')}>ดูสถานะ</button></div>}
          {currentError ? <div className="empty-state" role="alert"><CircleHelp size={36} /><h3>เชื่อมต่อข้อมูลไม่ได้</h3><p>ตรวจว่า backend เปิดอยู่ แล้วลองโหลดข้อมูลอีกครั้ง</p><small>{currentError}</small><button className="primary-button" onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16} />ลองอีกครั้ง</button></div>
            : view === 'sources' ? <div className="sources-list">{sourceResults.map(s => <article className="source-row" key={s.id}><span className={`project-avatar ${avatarClass(s.name)}`}><BookOpen size={21} /></span><div className="source-main"><button className="source-title" onClick={() => openList(s.id)}>{s.name}<ArrowRight size={14} /></button><span>{s.owner} · {categoryLabel(categories.find(c => c.id === s.category) || { id: s.category, name: s.category, count: 0 })}</span></div><span className="source-count">{number(s.project_count)}<small>โปรเจกต์</small></span><span className={`source-state ${s.error ? 'error' : ''}`}>{s.error ? 'รอลองใหม่' : s.last_synced_at ? 'ซิงก์แล้ว' : 'รอซิงก์'}<small>{timeLabel(s.last_synced_at)}</small></span><button className="icon-button" onClick={() => openList(s.id)} aria-label={`ดูโปรเจกต์จาก ${s.name}`}><ArrowRight size={18} /></button></article>)}{!sourceResults.length && <div className="empty-state"><Search size={36} /><h3>ไม่พบแหล่งข้อมูล</h3><p>ลองเปลี่ยนคำค้นหรือเลือกทุกหมวดหมู่</p></div>}</div>
            : loading && !results.items.length ? <div className="project-grid" aria-busy="true" aria-label="กำลังโหลดโปรเจกต์">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton-card"><div /><span /><span /><span /></div>)}</div>
            : results.items.length ? <div className={`project-grid ${compact ? 'list-layout' : ''} ${loading ? 'loading' : ''}`} aria-busy={loading}>{results.items.map((project, index) => <ProjectCard key={project.id} project={project} saved={saved.includes(project.id)} onSave={() => save(project.id)} categories={categories} sources={sources} compact={compact} onOpenList={openList} rank={view === 'rankings' ? isDaily ? daily?.items[index]?.rank : page * PAGE_SIZE + index + 1 : undefined} dailySource={isDaily ? daily?.source : undefined} />)}</div>
            : view === 'compare' && !isCompareReady ? <div className="empty-state"><GitCompareArrows size={38} /><h3>เลือกสองลิสต์ที่อยากเทียบ</h3><p>เลือกจากชื่อ repository ด้านบน เพื่อดูรายการร่วมกันและรายการเฉพาะ</p></div>
            : view === 'list' && !activeSource?.last_synced_at ? <div className="empty-state"><BookOpen size={38} /><h3>กำลังรอรายละเอียดของลิสต์นี้</h3><p>ระบบจะทยอยอ่านต้นทาง รายการและหมวดย่อยจะแสดงหลังซิงก์สำเร็จ</p></div>
            : isDaily ? <div className="empty-state"><Trophy size={38} /><h3>{q ? 'ไม่พบ repository ในอันดับวันนี้' : 'ยังไม่มี snapshot ของวันที่เลือก'}</h3><p>ลองเปลี่ยนคำค้นหรือเลือกวันที่ที่ต้นทางมีข้อมูล อันดับคงลำดับเดิมจากต้นทาง</p></div>
            : <div className="empty-state">{view === 'saved' ? <FolderHeart size={42} /> : <Search size={38} />}<h3>{view === 'saved' && !saved.length ? 'โปรเจกต์ที่ถูกใจ เก็บไว้ตรงนี้ได้เลย' : status?.state === 'syncing' && !status.project_count ? 'กำลังเปิดแผนที่โอเพนซอร์ส' : 'ยังไม่พบโปรเจกต์ที่ตรงกัน'}</h3><p>{view === 'saved' && !saved.length ? 'กดไอคอนบุ๊กมาร์กบนโปรเจกต์ แล้วกลับมาดูได้ทุกเมื่อ' : status?.state === 'syncing' && !status.project_count ? 'backend กำลังดึง Awesome lists ครั้งแรก หน้านี้จะอัปเดตให้อัตโนมัติ' : 'ลองใช้คำค้นอื่น หรือเปลี่ยนหมวดหมู่ที่เลือก'}</p><button className="primary-button" onClick={() => { navigate('explore'); setRefresh(n => n + 1); }}><Compass size={16} />สำรวจโปรเจกต์</button></div>}
          {view !== 'sources' && results.total > PAGE_SIZE && <div className="pagination"><span>แสดง {number(page * PAGE_SIZE + 1)}–{number(Math.min((page + 1) * PAGE_SIZE, results.total))} จาก {number(results.total)} รายการ</span><div><button disabled={page === 0 || loading} onClick={() => { setPage(p => p - 1); document.querySelector('.discovery')?.scrollIntoView({ block: 'start' }); }} aria-label="หน้าก่อนหน้า"><ChevronLeft size={17} /></button><span>{page + 1} / {pageCount}</span><button disabled={page + 1 >= pageCount || loading} onClick={() => { setPage(p => p + 1); document.querySelector('.discovery')?.scrollIntoView({ block: 'start' }); }} aria-label="หน้าถัดไป"><ChevronRight size={17} /></button></div></div>}
        </section>
        <footer className="page-footer"><span><Sparkles size={14} />คัดสรรโดยชุมชน ค้นพบโดยคุณ</span><span>ข้อมูลจาก Awesome lists และอันดับรายวัน · เคารพเครดิตเจ้าของโปรเจกต์</span></footer>
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
  </div>;
}
