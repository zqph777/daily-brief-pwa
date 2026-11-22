import { asTimestamp, DAY, inRetention, isDateKey, shiftDate, todayKey, ZONE } from './dates';
import { mockBrief, mockHistory } from './mock';
import { parseScoreInputs, type ScoreInputs } from './rating';

export const SECTIONS = [{ id: 'ai', title: 'AI', limit: 10 }, { id: 'world', title: '世界', limit: 20 }] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];
export type SectionNotice = 'no_qualified_news' | 'source_coverage_incomplete';
export type NewsImage = { url: string; alt: string; caption?: string; credit?: string };
export type NewsSource = { source_name: string; source_url: string; published_at?: string };
export type NewsItem = {
  id: string; title: string; what_happened?: string; possible_impact?: string;
  uncertainty_note?: string; source_name: string; source_url?: string; published_at?: string; importance?: number;
  images?: NewsImage[];
  editorial_score?: ScoreInputs;
  supporting_sources?: NewsSource[];
};
export type Brief = {
  date: string; timezone: string; generated_at?: string; coverage_start?: string; coverage_end?: string;
  sections: Record<SectionId, NewsItem[]>;
  sectionNotices?: Partial<Record<SectionId, SectionNotice>>;
};

export const IS_IOS_BUILD = import.meta.env.MODE === 'ios';
export const IS_PAGES_BUILD = import.meta.env.MODE === 'pages';
export const IS_PRIVATE_BUILD = import.meta.env.MODE === 'private' || IS_IOS_BUILD;
export const IS_MOCK = !IS_PRIVATE_BUILD && !IS_PAGES_BUILD && import.meta.env.VITE_DATA_MODE !== 'api';
const API = IS_PAGES_BUILD ? `${import.meta.env.BASE_URL}editions` : `${IS_PRIVATE_BUILD ? '' : (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')}/api/v1/brief`;
const PREFIX = `daily-brief:${IS_MOCK ? 'demo' : API}:v1:`;
const BRIEF_PREFIX = `${PREFIX}brief:`;
const HISTORY_PREFIX = `${PREFIX}history:`;

export type Failure = 'missing' | 'network' | 'offline' | 'format' | 'auth';
export class DataError extends Error {
  constructor(public readonly kind: Failure) { super(kind); }
}

async function iosBridge(message: Record<string, string>) {
  const host = window as Window & { webkit?: { messageHandlers?: { newsbrief?: { postMessage: (body: unknown) => Promise<unknown> } } } };
  const handler = host.webkit?.messageHandlers?.newsbrief;
  if (!handler) throw new DataError('auth');
  let result: Record<string, unknown> | undefined;
  try { result = object(await handler.postMessage(message)); }
  catch { throw new DataError('network'); }
  if (result?.ok === true) return result.data;
  const error = result?.error;
  throw new DataError(error === 'auth' || error === 'missing' || error === 'format' ? error : 'network');
}

export async function configurePrivateAccess() {
  if (!IS_IOS_BUILD || await iosBridge({ action: 'configure' })) window.location.reload();
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function externalLink(value: unknown) {
  try {
    const url = new URL(text(value) ?? '');
    return /^(http|https):$/.test(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function normalizeImages(value: unknown): NewsImage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images = new Map<string, NewsImage>();
  for (const entry of value) {
    const image = object(entry);
    const path = text(image?.url);
    const alt = text(image?.alt);
    const url = path && /^\/(?![\/\\])/.test(path) && !path.includes('\\') ? path : externalLink(path);
    if (!url || !alt || images.has(url)) continue;
    images.set(url, { url, alt, caption: text(image?.caption), credit: text(image?.credit) });
    if (images.size === 4) break;
  }
  return images.size ? [...images.values()] : undefined;
}

function normalizeSources(value: unknown): NewsSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources = new Map<string, NewsSource>();
  for (const entry of value) {
    const source = object(entry);
    const source_name = text(source?.source_name);
    const source_url = externalLink(source?.source_url);
    if (!source_name || !source_url) continue;
    sources.set(source_url, { source_name, source_url, published_at: asTimestamp(source?.published_at) });
    if (sources.size === 3) break;
  }
  return sources.size ? [...sources.values()] : undefined;
}

export function normalizeBrief(raw: unknown, date: string): Brief {
  const input = object(raw);
  if (!input || (input.date != null && (!isDateKey(input.date) || input.date !== date)) ||
      (input.sections != null && !Array.isArray(input.sections))) throw new DataError('format');
  const sections: Brief['sections'] = { ai: [], world: [] };
  const sectionNotices: NonNullable<Brief['sectionNotices']> = {};
  for (const entry of Array.isArray(input.sections) ? input.sections : []) {
    const section = object(entry);
    const spec = SECTIONS.find((candidate) => candidate.id === section?.id);
    if (!spec || !Array.isArray(section?.items)) continue;
    if (section.notice_code === 'source_coverage_incomplete' || section.notice_code === 'no_qualified_news') {
      sectionNotices[spec.id] = section.notice_code;
    }
    for (const item of section.items) {
      const record = object(item);
      if (!record || sections[spec.id].length >= spec.limit) continue;
      const title = text(record.title);
      const source_name = text(record.source_name);
      if (!title || !source_name) continue;
      const id = text(record.id) ?? `${spec.id}-${sections[spec.id].length}`;
      sections[spec.id].push({
        id, title, source_name, what_happened: text(record.what_happened), possible_impact: text(record.possible_impact),
        uncertainty_note: text(record.uncertainty_note), source_url: externalLink(record.source_url),
        published_at: asTimestamp(record.published_at), importance: typeof record.importance === 'number' ? record.importance : undefined,
        images: normalizeImages(record.images),
        editorial_score: parseScoreInputs(record.editorial_score),
        supporting_sources: normalizeSources(record.supporting_sources),
      });
    }
  }
  return { date, sections, sectionNotices, timezone: text(input.timezone) ?? ZONE, generated_at: asTimestamp(input.generated_at),
    coverage_start: asTimestamp(input.coverage_start), coverage_end: asTimestamp(input.coverage_end) };
}

async function json(path: string, signal: AbortSignal) {
  if (IS_IOS_BUILD) {
    signal.throwIfAborted();
    const result = await iosBridge({ action: 'read', path });
    signal.throwIfAborted();
    return result;
  }
  const response = await fetch(path, { signal, cache: IS_PRIVATE_BUILD ? 'no-store' : 'no-cache',
    redirect: IS_PRIVATE_BUILD ? 'manual' : 'follow', headers: { Accept: 'application/json' } });
  if (IS_PRIVATE_BUILD && (response.type === 'opaqueredirect' || response.status === 401 || response.status === 403)) {
    throw new DataError('auth');
  }
  if (!response.ok) throw new DataError(response.status === 404 ? 'missing' : 'network');
  try { return await response.json() as unknown; }
  catch { throw new DataError('format'); }
}

function storageKeys(prefix: string) {
  try { return Object.keys(localStorage).filter((key) => key.startsWith(prefix)); }
  catch { return []; }
}

function cached<Value>(key: string): Value | undefined {
  if (IS_PRIVATE_BUILD) return undefined;
  try {
    const entry = JSON.parse(localStorage.getItem(key) ?? 'null') as { savedAt: number; value: Value } | null;
    if (entry && Number.isFinite(entry.savedAt) && Date.now() - entry.savedAt < 30 * DAY) return entry.value;
    localStorage.removeItem(key);
  } catch { /* Offline storage may be blocked or full. */ }
}

function save<Value>(key: string, value: Value) {
  if (IS_PRIVATE_BUILD) return;
  try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value })); }
  catch { /* The online reading experience does not depend on storage. */ }
}

export function pruneCache() {
  if (IS_PRIVATE_BUILD) {
    try { storageKeys(PREFIX).forEach((key) => localStorage.removeItem(key)); }
    catch { return; }
    return;
  }
  storageKeys(PREFIX).forEach((key) => {
    if (!inRetention(key.slice(-10))) {
      try { localStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
    } else cached(key);
  });
}

export function readBrief(date: string) { return inRetention(date) ? cached<Brief>(`${BRIEF_PREFIX}${date}`) : undefined; }

function cachedBriefDates() {
  return storageKeys(BRIEF_PREFIX).map((key) => key.slice(BRIEF_PREFIX.length)).filter(isDateKey).sort().reverse();
}

export function latestBrief(maxDate = todayKey()) {
  for (const date of cachedBriefDates()) {
    if (date > maxDate) continue;
    const brief = readBrief(date);
    if (brief) return brief;
  }
}

export async function loadBrief(date: string, signal: AbortSignal, allowLatest = false) {
  if (!navigator.onLine) throw new DataError('offline');
  if (IS_PAGES_BUILD) {
    const selected = allowLatest ? (await publishedDates(signal)).find((entry) => inRetention(entry, date)) : date;
    if (!selected) throw new DataError('missing');
    const brief = normalizeBrief(await json(`${API}/${selected}.json`, signal), selected);
    if (!signal.aborted) save(`${BRIEF_PREFIX}${selected}`, brief);
    return brief;
  }
  try {
    const raw = IS_MOCK ? await mockBrief(date, signal) : await json(`${API}/${date}`, signal);
    const brief = normalizeBrief(raw, date);
    if (!signal.aborted) save(`${BRIEF_PREFIX}${date}`, brief);
    return brief;
  } catch (error) {
    if (!IS_PRIVATE_BUILD || !allowLatest || !(error instanceof DataError) || error.kind !== 'missing') throw error;
    const raw = await json(`${API}/latest${IS_IOS_BUILD ? `?through=${date}` : ''}`, signal);
    const latest = object(raw)?.date;
    if (!isDateKey(latest) || latest > date) throw new DataError('format');
    return normalizeBrief(raw, latest);
  }
}

export type HistoryEntry = { date: string; available: boolean };
const historyKey = (date: string) => `${HISTORY_PREFIX}${date}`;

export function readHistory(end: string, start: string): HistoryEntry[] | undefined {
  const known = Array.from({ length: Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1 }, (_, index) => shiftDate(end, -index))
    .map((date) => ({ date, status: readBrief(date) ? true : cached<boolean>(historyKey(date)) }));
  if (known.every((entry) => entry.status === undefined)) return undefined;
  return known.map(({ date, status }) => ({ date, available: status === true }));
}

async function publishedDates(signal: AbortSignal): Promise<string[]> {
  const dates = object(await json(`${API}/index.json`, signal))?.dates;
  if (!Array.isArray(dates) || !dates.every(isDateKey)) throw new DataError('format');
  return dates.sort().reverse();
}

async function apiDates(end: string, start: string, signal: AbortSignal) {
  if (IS_PAGES_BUILD) return new Set((await publishedDates(signal)).filter((date) => date >= start && date <= end));
  const found = new Set<string>();
  const limit = 30;
  for (let offset = 0; offset < 1000;) {
    const raw = await json(`${API}/list?${new URLSearchParams({ from: start, to: end, offset: String(offset), limit: String(limit) })}`, signal);
    const rows = Array.isArray(raw) ? raw : object(raw)?.dates;
    if (!Array.isArray(rows) || !rows.every(isDateKey)) throw new DataError('format');
    if (!rows.length) return found;
    for (const date of rows) if (date >= start && date <= end) found.add(date);
    if (rows.some((date) => date <= start)) return found;
    const hasMore = object(raw)?.has_more;
    if (hasMore === false || (hasMore == null && rows.length < limit)) return found;
    offset += rows.length;
  }
  throw new DataError('format');
}

export async function loadHistory(end: string, start: string, signal: AbortSignal) {
  if (!navigator.onLine) throw new DataError('offline');
  const found = IS_MOCK ? await mockHistory(end, start, signal) : await apiDates(end, start, signal);
  const entries = Array.from({ length: Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1 }, (_, index) => {
    const date = shiftDate(end, -index);
    const available = found.has(date);
    if (!signal.aborted) save(historyKey(date), available);
    return { date, available };
  });
  return entries;
}
