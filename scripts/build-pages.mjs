import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const output = 'dist-pages';
const source = process.env.PWA_NEWS_FILE || 'news.json';
const bundle = JSON.parse(await readFile(source, 'utf8'));
if (bundle.version !== 1 || !bundle.editions || Array.isArray(bundle.editions) || typeof bundle.editions !== 'object') {
  throw new Error('Invalid news bundle');
}
const dates = [];
await mkdir(join(output, 'editions'), { recursive: true });

for (const [date, report] of Object.entries(bundle.editions)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || report?.date !== date || !Array.isArray(report.sections) || report.sections.length !== 2 ||
      report.sections[0]?.id !== 'ai' || report.sections[1]?.id !== 'world' ||
      !report.sections.every((section) => Array.isArray(section.items))) {
    throw new Error(`Invalid report: ${date}`);
  }
  await writeFile(join(output, 'editions', `${date}.json`), `${JSON.stringify(report)}\n`);
  dates.push(date);
}

await writeFile(join(output, 'editions', 'index.json'), `${JSON.stringify({ dates: dates.sort().reverse() })}\n`);
await copyFile(source, join(output, 'news.json'));
await writeFile(join(output, '.nojekyll'), '');
for (const route of ['about', 'history', ...dates.flatMap((date) => [`history/${date}`, `briefs/${date}`])]) {
  const folder = join(output, route);
  await mkdir(folder, { recursive: true });
  await copyFile(join(output, 'index.html'), join(folder, 'index.html'));
}
console.log(`Exported ${dates.length} editions`);
