type Name = 'back' | 'external' | 'next' | 'down' | 'warning' | 'page' | 'offline' | 'refresh' | 'share';

const paths: Record<Name, string> = {
  back: 'M18 12H6m5-5-5 5 5 5', external: 'M6 18 18 6M8 6h10v10', next: 'm10 6 6 6-6 6', down: 'm6 9 6 6 6-6',
  warning: 'M11.15 4.4 3.2 18a1 1 0 0 0 .86 1.5h15.88a1 1 0 0 0 .86-1.5L12.85 4.4a1 1 0 0 0-1.7 0ZM12 9v4m0 3h.01',
  page: 'M7 3h8l4 4v14H5V3h2Zm8 0v5h4M8 12h8m-8 4h6',
  offline: 'm3 3 18 18M2 8.8a15 15 0 0 1 2.8-1.9m3.6-1.4A15 15 0 0 1 22 8.8M5 12.5a10.5 10.5 0 0 1 3.5-2.1m4-0.6a10.5 10.5 0 0 1 6.5 2.7m-11 3.6a6 6 0 0 1 4.9-1.5m-1 5h.1',
  refresh: 'M20 7v5h-5m4.3 0a7.4 7.4 0 1 0-2.1 5.2',
  share: 'M12 15V3M8 7l4-4 4 4M8 10H5v11h14V10h-3',
};

export function Icon({ name, size = 16 }: { name: Name; size?: number }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}
