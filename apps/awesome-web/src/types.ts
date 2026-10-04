export interface Project {
  id: string;
  name: string;
  owner: string;
  description: string;
  url: string;
  categories: string[];
  source_ids: string[];
  source_count?: number;
  sections?: string[];
  kind: 'project' | 'list';
  discovered_at: string;
  updated_at: string;
  stars: number | null;
  language: string | null;
}
export interface Category { id: string; name: string; count: number }
export interface Source {
  id: string; name: string; owner: string; url: string; category: string;
  project_count: number; last_synced_at: string | null; error: string | null;
  item_count?: number;
  sections?: { name: string; count: number }[];
}
export interface SyncStatus {
  state: 'idle' | 'syncing' | 'degraded'; last_synced_at: string | null;
  next_sync_at: string | null; sync_interval_seconds: number;
  project_count: number; list_count: number; category_count: number;
  sources_synced: number; sources_total: number; last_error: string | null;
}
export interface ProjectPage { items: Project[]; total: number; limit: number; offset: number }
export type CompareMode = 'shared' | 'left_only' | 'right_only' | 'all';
export interface ComparePage extends ProjectPage {
  left: Source; right: Source;
  shared_count: number; left_only_count: number; right_only_count: number;
  union_count: number; overlap_percent: number;
}
export interface DailySource {
  id: string; name: string; url: string; description: string;
  last_synced_at: string | null; latest_date: string | null;
  error: string | null; dates: string[];
}
export interface DailyEntry { rank: number; project: Project; source_count: number }
export interface DailyPage {
  items: DailyEntry[]; total: number; limit: number; offset: number;
  source: DailySource; date: string | null; captured_at: string | null;
}
