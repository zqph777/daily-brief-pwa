import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const path = `${prefix}/${entry.name}`;
    return entry.isDirectory() ? files(join(directory, entry.name), path) : path;
  }))).flat();
}

const assets = (await files('dist')).filter((path) => /\.(?:html|js|css|svg|png|json)$/u.test(path) && path !== '/sw.js').sort();
const worker = await readFile('dist/sw.js', 'utf8');
const hash = createHash('sha256').update(worker);
for (const asset of assets) hash.update(asset).update(await readFile(`dist${asset}`));
await writeFile('dist/sw.js', worker.replace('/* PRECACHE_ASSETS */ []', JSON.stringify(assets)).replace('__BUILD_HASH__', hash.digest('hex').slice(0, 16)));
