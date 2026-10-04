import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, CircleHelp, GitCompareArrows, Trophy } from 'lucide-react';
import { useState } from 'react';
import type { ComparePage, DailyPage, DailySource, Source } from './types';
import type { Navigation } from './state';

export const mentionCount = (project: { source_count?: number; source_ids: string[] }) =>
  project.source_count ?? project.source_ids.filter(id => id !== 'sindresorhus/awesome').length;
const count = (value: number) => new Intl.NumberFormat('en-US').format(value);
export function sourceWarning(source?: Source): string | null {
  if (!source?.last_synced_at) return 'ยังไม่ได้อ่านรายละเอียดลิสต์ ข้อมูลย่อยจะเพิ่มหลังการซิงก์';
  if (source.error) return 'อัปเดตไม่สำเร็จ กำลังใช้ข้อมูลที่เก็บไว้ล่าสุด';
  const lastSynced = new Date(source.last_synced_at).getTime();
  if (Number.isFinite(lastSynced) && Date.now() - lastSynced > 86400000) return 'ไม่ได้อัปเดตใน 24 ชั่วโมง กำลังใช้ข้อมูลที่เก็บไว้ล่าสุด';
  return null;
}
export function SourceCoverage({ source }: { source?: Source }) {
  const warning = sourceWarning(source);
  return warning ? <p className="source-warning"><CircleHelp size={15} /><span>{source?.name ? `${source.name}: ` : ''}{warning}</span></p> : null;
}
function capturedLabel(value: string | null): string {
  if (!value) return 'ยังไม่มีข้อมูล';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) : 'ไม่ทราบเวลา';
}

export function ListPanel({ nav, source, onChange, onBack, onCompare }: {
  nav: Navigation; source?: Source; onChange: (patch: Partial<Navigation>) => void;
  onBack: () => void; onCompare: () => void;
}) {
  return <section className="view-heading list-heading">
    <button className="text-button" onClick={onBack}><ArrowLeft size={15} />กลับไป Awesome lists</button>
    <div className="detail-heading-row"><div><span className="eyebrow"><BookOpen size={14} />ภายใน Awesome list</span><h1>{source?.name || nav.source.split('/')[1] || 'Awesome list'}</h1><p>{source?.owner || nav.source.split('/')[0]} · {count(source?.item_count ?? source?.project_count ?? 0)} รายการที่อ่านแล้ว</p></div>
      <div className="detail-actions"><button className="secondary-button" onClick={onCompare}><GitCompareArrows size={15} />เทียบลิสต์นี้</button><a className="text-button" href={source?.url || `https://github.com/${nav.source}`} target="_blank" rel="noopener noreferrer">เปิดต้นทาง GitHub<ArrowUpRight size={14} /></a></div>
    </div>
    <SourceCoverage source={source} />
    {source?.last_synced_at && <p className="capture-label">อ่านต้นทางล่าสุด {capturedLabel(source.last_synced_at)}</p>}
    {(!!source?.sections?.length || !!nav.section) && <label className="field-label section-select">หมวดย่อยใน README<select value={nav.section} onChange={event => onChange({ section: event.target.value })} aria-label="หมวดย่อยในลิสต์"><option value="">ทุกหมวดย่อย</option>{nav.section && !source?.sections?.some(section => section.name === nav.section) && <option value={nav.section}>{nav.section}</option>}{source?.sections?.map(section => <option value={section.name} key={section.name}>{section.name} ({count(section.count)})</option>)}</select></label>}
  </section>;
}

export function ComparePanel({ nav, sources, comparison, onChange, onSwap }: {
  nav: Navigation; sources: Source[]; comparison: ComparePage | null;
  onChange: (patch: Partial<Navigation>) => void; onSwap: () => void;
}) {
  const [sourceSearch, setSourceSearch] = useState('');
  const matching = sources.filter(source => `${source.name} ${source.id}`.toLowerCase().includes(sourceSearch.toLowerCase()) || source.id === nav.left || source.id === nav.right);
  const left = comparison?.left || sources.find(source => source.id === nav.left);
  const right = comparison?.right || sources.find(source => source.id === nav.right);
  const ready = !!nav.left && !!nav.right && nav.left !== nav.right;
  const modes = [
    { id: 'shared' as const, label: 'ซ้ำกัน', value: comparison?.shared_count },
    { id: 'left_only' as const, label: 'เฉพาะลิสต์ A', value: comparison?.left_only_count },
    { id: 'right_only' as const, label: 'เฉพาะลิสต์ B', value: comparison?.right_only_count },
    { id: 'all' as const, label: 'ทั้งหมดรวมกัน', value: comparison?.union_count },
  ];
  return <section className="view-heading compare-heading"><h1>เปรียบเทียบลิสต์</h1><p>ดู repository ที่ซ้ำกันและรายการเฉพาะของแต่ละลิสต์ รวมชื่อเจ้าของและชื่อ repo เดียวกันเป็นรายการเดียว</p>
    <div className="compare-controls"><label className="field-label source-search">ค้นหาลิสต์<input type="search" value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} placeholder="ชื่อหรือเจ้าของลิสต์…" aria-label="ค้นหาลิสต์เพื่อเปรียบเทียบ" /></label>
      <div className="source-pair"><label className="field-label">ลิสต์ A<select value={nav.left} onChange={event => onChange({ left: event.target.value })} aria-label="ลิสต์ A"><option value="">เลือกลิสต์ A</option>{nav.left && !sources.some(source => source.id === nav.left) && <option value={nav.left}>{nav.left} · ยังไม่พบแหล่งข้อมูล</option>}{matching.map(source => <option key={source.id} value={source.id}>{source.id}{!source.last_synced_at ? ' · รอซิงก์' : source.error ? ' · ข้อมูลล่าสุดที่เก็บไว้' : ''}</option>)}</select></label>
        <button className="icon-button swap-sources" onClick={onSwap} aria-label="สลับลิสต์ A และ B"><ArrowRight size={19} /></button>
        <label className="field-label">ลิสต์ B<select value={nav.right} onChange={event => onChange({ right: event.target.value })} aria-label="ลิสต์ B"><option value="">เลือกลิสต์ B</option>{nav.right && !sources.some(source => source.id === nav.right) && <option value={nav.right}>{nav.right} · ยังไม่พบแหล่งข้อมูล</option>}{matching.map(source => <option key={source.id} value={source.id}>{source.id}{!source.last_synced_at ? ' · รอซิงก์' : source.error ? ' · ข้อมูลล่าสุดที่เก็บไว้' : ''}</option>)}</select></label></div>
    </div>
    {nav.left && nav.left === nav.right && <p className="source-warning" role="alert"><CircleHelp size={15} />เลือกลิสต์ A และ B คนละลิสต์เพื่อเปรียบเทียบ</p>}
    {ready && <><SourceCoverage source={left} /><SourceCoverage source={right} />{(sourceWarning(left) || sourceWarning(right)) && <p className="capture-label">จำนวนที่เห็นครอบคลุมเฉพาะรายการที่อ่านแล้ว การไม่พบรายการซ้ำยังไม่ได้แปลว่าลิสต์ไม่มีรายการร่วมกัน</p>}</>}
    <div className="comparison-summary"><span>ความซ้ำของรายการที่อ่านแล้ว <strong>{comparison ? `${comparison.overlap_percent.toLocaleString('en-US', { maximumFractionDigits: 1 })}%` : '—'}</strong></span><small>รายการร่วมกัน ÷ รายการรวม · จำนวนรวมไม่เปลี่ยนตามคำค้น</small></div>
    <div className="comparison-modes" aria-label="ชุดรายการที่เปรียบเทียบ">{modes.map(mode => <button key={mode.id} className={`comparison-mode ${nav.mode === mode.id ? 'active' : ''}`} onClick={() => onChange({ mode: mode.id })} aria-pressed={nav.mode === mode.id}><span>{mode.label}</span><strong>{mode.value === undefined ? '—' : count(mode.value)}</strong></button>)}</div>
  </section>;
}

export function RankingsPanel({ nav, providers, daily, onChange }: {
  nav: Navigation; providers: DailySource[]; daily: DailyPage | null; onChange: (patch: Partial<Navigation>) => void;
}) {
  const provider = daily?.source || providers[0];
  const dates = [...new Set([...(provider?.dates || []), ...(nav.date ? [nav.date] : [])])].sort().reverse();
  const shownDate = nav.date || daily?.date || provider?.latest_date || '';
  const today = new Date().toISOString().slice(0, 10);
  const historical = !!nav.date && nav.date < today;
  const freshnessLabel = nav.date && ((daily && !daily.captured_at) || nav.date > today) ? 'วันที่เลือกยังไม่มีข้อมูล' : historical ? 'กำลังดูอันดับย้อนหลัง' : shownDate === today ? 'อันดับประจำวันที่มีข้อมูลล่าสุด' : 'ยังไม่มีอันดับของวันนี้';
  return <section className="view-heading ranking-heading"><h1>จัดอันดับโปรเจกต์</h1><p>ดูโปรเจกต์ที่หลายลิสต์รวบรวมไว้ และ repository ที่ติดอันดับรายวัน พร้อมที่มาและขอบเขตข้อมูล</p>
    <div className="ranking-tabs" role="tablist" aria-label="ประเภทอันดับ" onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'mentions' : event.key === 'End' ? 'daily' : nav.ranking === 'mentions' ? 'daily' : 'mentions';
      onChange({ ranking: next });
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next === 'mentions' ? 0 : 1]?.focus();
    }}><button id="mentions-tab" role="tab" aria-controls="ranking-panel" tabIndex={nav.ranking === 'mentions' ? 0 : -1} aria-selected={nav.ranking === 'mentions'} className={nav.ranking === 'mentions' ? 'active' : ''} onClick={() => onChange({ ranking: 'mentions' })}><BookOpen size={16} />พบในหลายลิสต์</button><button id="daily-tab" role="tab" aria-controls="ranking-panel" tabIndex={nav.ranking === 'daily' ? 0 : -1} aria-selected={nav.ranking === 'daily'} className={nav.ranking === 'daily' ? 'active' : ''} onClick={() => onChange({ ranking: 'daily' })}><Trophy size={16} />อันดับรายวัน</button></div>
    <div id="ranking-panel" role="tabpanel" aria-labelledby={nav.ranking === 'mentions' ? 'mentions-tab' : 'daily-tab'}>
    {nav.ranking === 'mentions' ? <div className="ranking-explanation"><p>เรียงตามจำนวน Awesome lists ที่อ้างถึง repository เดียวกัน ลิงก์ซ้ำภายในลิสต์เดียวไม่นับเพิ่ม และไม่รวมลิสต์รวมหลัก</p><label className="field-label">จำนวนลิสต์ขั้นต่ำ<select value={nav.minSources} onChange={event => onChange({ minSources: Number(event.target.value) })} aria-label="จำนวนลิสต์ขั้นต่ำ">{[...new Set([1, 2, 3, 5, 10, nav.minSources])].sort((a, b) => a - b).map(value => <option key={value} value={value}>{value} ลิสต์</option>)}</select></label><small>จำนวนนี้สะท้อนการถูกอ้างถึงในข้อมูลที่อ่านแล้ว ไม่ใช่คะแนนคุณภาพหรือจำนวน stars</small></div>
      : <div className="daily-controls"><div><label className="field-label">วันที่ของอันดับ (UTC)<select value={shownDate} onChange={event => onChange({ date: event.target.value })} aria-label="วันที่อันดับรายวัน"><option value="">ล่าสุดที่มีข้อมูล</option>{dates.map(date => <option key={date} value={date}>{date}</option>)}</select></label><span className="snapshot-label">{freshnessLabel}</span></div><div className="daily-credit"><span>ข้อมูลอันดับจาก repository</span><a href={provider?.url || 'https://github.com/antonkomarev/github-trending-archive'} target="_blank" rel="noopener noreferrer">{provider?.id || 'antonkomarev/github-trending-archive'}<ArrowUpRight size={13} /></a><p>{provider?.description || 'Archive ของ GitHub Trending รายวัน เรียงตามลำดับที่ต้นทางบันทึก'}</p><small>วันที่ต้นทาง {daily?.date || 'ยังไม่มีข้อมูล'} · อ่านเมื่อ {capturedLabel(daily?.captured_at || null)}</small></div>{provider?.error && <p className="source-warning"><CircleHelp size={15} />อัปเดตอันดับไม่สำเร็จ กำลังแสดง snapshot ที่เก็บไว้ล่าสุด</p>}</div>}
    </div>
  </section>;
}
