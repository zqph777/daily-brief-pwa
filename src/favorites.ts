import { useEffect, useState } from 'react';
import { normalizeBrief, type NewsItem, type SectionId } from './data';
import { isDateKey, ZONE } from './dates';

export type Favorite = { item: NewsItem; date: string; section: SectionId; zone: string };
const storageKey = 'morning-edition:favorites:v1';

export function favoriteKey({ date, section, item }: Favorite) {
  return `${date}:${section}:${item.id}`;
}

function readFavorites(storage: Storage): Favorite[] {
  const raw: unknown = JSON.parse(storage.getItem(storageKey) ?? '[]');
  const entries = new Map<string, Favorite>();
  if (!Array.isArray(raw)) return [];
  for (const record of raw) {
    if (!record || !isDateKey(record.date) || !['ai', 'world'].includes(record.section)) continue;
    const section: SectionId = record.section;
    const brief = normalizeBrief({ date: record.date, sections: [{ id: section, items: [record.item] }] }, record.date);
    const item = brief.sections[section][0];
    if (!item) continue;
    const entry = { item, date: record.date, section, zone: typeof record.zone === 'string' ? record.zone : ZONE };
    entries.set(favoriteKey(entry), entry);
  }
  return [...entries.values()];
}

export function useFavorites() {
  const [entries, setEntries] = useState(() => {
    try { return readFavorites(window.localStorage); } catch { return []; }
  });
  const [message, setMessage] = useState<{ text: string; error: boolean }>();

  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      try { setEntries(readFavorites(window.localStorage)); } catch { return; }
    };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  function toggle(entry: Favorite) {
    try {
      const storage = window.localStorage;
      const current = readFavorites(storage);
      const key = favoriteKey(entry);
      const removing = current.some((saved) => favoriteKey(saved) === key);
      const next = removing ? current.filter((saved) => favoriteKey(saved) !== key) : [entry, ...current];
      storage.setItem(storageKey, JSON.stringify(next));
      setEntries(next);
      setMessage({ text: removing ? '已取消收藏' : '已添加到收藏', error: false });
      return removing ? 'removed' : 'added';
    } catch {
      setMessage({ text: '无法保存收藏，请检查浏览器的站点存储。', error: true });
      return 'failed';
    }
  }

  return { entries, keys: new Set(entries.map(favoriteKey)), toggle, message };
}
