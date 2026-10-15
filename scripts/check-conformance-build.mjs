import { readFile } from 'node:fs/promises';
const html = await readFile('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]+?)<\/head>/)?.[1] ?? '';
if (/(?:src|href)="[^\"]*\/conformance-[^\"]*"/.test(head)) throw Error('Bank first paint imports Conformance UI or styles.');
const manifest = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
const bank = manifest['index.html'], consoleEntry = manifest['conformance/index.html'];
if (!bank?.isEntry || !consoleEntry?.isEntry || !consoleEntry.file.includes('conformance')) throw Error('Separate Bank and Conformance entries are required.');
const visited = new Set();
function visit(key) {
  if (visited.has(key)) return; visited.add(key);
  const item = manifest[key]; if (!item) throw Error('Missing build manifest dependency.');
  if ([item.file, ...(item.css ?? [])].some(path => path.includes('conformance'))) throw Error('Bank import graph includes Conformance.');
  for (const dependency of item.imports ?? []) visit(dependency);
}
visit('index.html');
const serviceWorker = await readFile('dist/sw.js', 'utf8');
const shell = JSON.parse(serviceWorker.match(/const SHELL = (\[[\s\S]*?\]);/)?.[1] ?? 'null');
if (!Array.isArray(shell) || shell.some(path => path.includes('conformance'))) throw Error('Bank shell precaches Conformance-specific assets.');
console.log(`Verified separate Conformance entry; Bank import graph (${visited.size} chunks) and shell exclude console code/styles.`);
