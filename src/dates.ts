export const ZONE = 'Asia/Shanghai';
export const DAY = 86_400_000;

const calendar = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function todayKey(now = Date.now()) {
  const parts = calendar.formatToParts(now);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function shiftDate(key: string, days: number) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function dateLabel(key: string, full = false) {
  const [year, month, day] = key.split('-').map(Number);
  return `${full ? `${year} 年 ` : ''}${month} 月 ${day} 日`;
}

export function asTimestamp(value: unknown): string | undefined {
  return typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)) ? value : undefined;
}

function validZone(zone: string) {
  try { new Intl.DateTimeFormat('zh-CN', { timeZone: zone }); return zone; }
  catch { return ZONE; }
}

function timestampDate(value: string, zone: string, year = false, clock = false) {
  const options: Intl.DateTimeFormatOptions = { timeZone: validZone(zone), month: 'numeric', day: 'numeric' };
  if (year) options.year = 'numeric';
  if (clock) Object.assign(options, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = new Intl.DateTimeFormat('zh-CN', options).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${year ? `${get('year')} 年 ` : ''}${get('month')} 月 ${get('day')} 日${clock ? ` ${get('hour')}:${get('minute')}` : ''}`;
}

export function publishedLabel(value: string, zone: string, now: number) {
  const elapsed = now - Date.parse(value);
  if (elapsed < 0) return timestampDate(value, zone, false, true);
  if (elapsed < 60_000) return '刚刚';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`;
  if (elapsed < DAY) return `${Math.floor(elapsed / 3_600_000)} 小时前`;
  return timestampDate(value, zone, elapsed > 7 * DAY);
}

export function updateLabel(value: string, zone: string) {
  return timestampDate(value, zone, false, true);
}
