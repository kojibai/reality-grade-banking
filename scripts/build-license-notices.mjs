import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { learnHeader } from './learn-template.mjs';
import { learnAssets } from './learn-assets.mjs';
import {applyPublicMetadata,publicPage} from './public-page-metadata.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
await mkdir('dist/legal', { recursive: true });
for (const name of ['LICENSE', 'NOTICE', 'LICENSING.md', 'TRADEMARKS.md', 'CONFORMANCE.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(name, `dist/legal/${name === 'LICENSE' || name === 'NOTICE' ? `${name}.txt` : name}`);
}
await mkdir('dist/legal/vendor', { recursive: true });
await copyFile('src/vendor/jsqr/LICENSE', 'dist/legal/vendor/jsqr-Apache-2.0.txt');
await copyFile('public/notes/fonts/OFL.txt', 'dist/legal/vendor/Cinzel-OFL.txt');
await copyFile('scripts/social/fonts/OFL.txt', 'dist/legal/vendor/Inter-OFL.txt');

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packages = [];
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  const installed = JSON.parse(await readFile(`${path}/package.json`, 'utf8'));
  if (installed.version !== entry.version) throw Error(`Installed version differs from lockfile: ${path}`);
  const directory = `${installed.name.replaceAll(/[^a-zA-Z0-9._-]/g, '-')}-${entry.version}-${hash(path).slice(0, 8)}`;
  const notices = [];
  await mkdir(`dist/legal/dependencies/${directory}`, { recursive: true });
  for (const file of (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!file.isFile() || !/^(license|copying|notice|copyright)(\.|$|-)/i.test(file.name)) continue;
    const bytes = await readFile(`${path}/${file.name}`);
    const url = `/legal/dependencies/${directory}/${file.name}`;
    await writeFile(`dist${url}`, bytes);
    notices.push({ name: file.name, sha256: hash(bytes), url });
  }
  packages.push({ name: installed.name, path, version: entry.version, declaredLicense: entry.license ?? null, standaloneNoticeSupplied: notices.length > 0, notices });
}
await writeFile('dist/legal/dependencies.json', JSON.stringify({
  schema: 'bankeiz.observed-dependency-notices.v1',
  scope: 'Locked production npm packages and their supplied top-level notice files. Not a complete Corresponding Source archive or legal clearance.',
  packages,
}, null, 2) + '\n');

let baseRevision = null, workingTreeModified = null;
try {
  baseRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  workingTreeModified = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim());
} catch {
  if (/^[a-f0-9]{40}$/i.test(process.env.VERCEL_GIT_COMMIT_SHA ?? '')) baseRevision = process.env.VERCEL_GIT_COMMIT_SHA;
}
const metadata = {
  schema: 'bankeiz.license-release.v1', license: 'GPL-3.0-only',
  copyrightHolder: 'Brian Joseph Klock', referenceImplementation: 'https://bankeiz.com/',
  licenseSha256: hash(await readFile('LICENSE')), baseRevision, workingTreeModified,
  institutionConformance: 'not-assessed', nativeSourceMaterials: 'included-pinned-source',
  correspondingSource: JSON.parse(await readFile('dist/source/index.json', 'utf8')),
};
await writeFile('dist/legal/release.json', JSON.stringify(metadata, null, 2) + '\n');

const links = [
  ['LICENSE.txt', 'GNU GPL version 3', 'The complete software license.'],
  ['NOTICE.txt', 'Copyright & attribution', 'Ownership and retained notices.'],
  ['LICENSING.md', 'License guide', 'Use, modification and distribution.'],
  ['TRADEMARKS.md', 'Brand identity', 'Attribution, independent branding and endorsement.'],
  ['CONFORMANCE.md', 'Conformance claims', 'Evidence, scope and accurate statements.'],
  ['SOURCE.md', 'Source & build materials', 'Corresponding Source and native release requirements.'],
  ['THIRD_PARTY_NOTICES.md', 'Third-party notices', 'Upstream code, assets and separate terms.'],
];
const list = links.map(([file, label, copy]) => `<a class="legal-row" href="/legal/${file}"><div><h2>${label}</h2><p>${copy}</p></div><span aria-hidden="true">↗</span></a>`).join('');
const sourceDownload = `<a class="legal-row" href="${metadata.correspondingSource.url}" download><div><h2>Download this build’s source</h2><p>Application, matching v129 native/SDK source, cryptographic dependency source and build materials · ${(metadata.correspondingSource.bytes / 1024 / 1024).toFixed(1)} MiB</p></div><span aria-hidden="true">↓</span></a>`;
const dependencies = packages.map(pkg => `<li><strong>${escape(pkg.name)} ${escape(pkg.version)}</strong><span>${escape(pkg.declaredLicense ?? 'License field not supplied')}</span><div>${pkg.notices.length ? pkg.notices.map(notice => `<a href="${escape(notice.url)}">${escape(notice.name)}</a>`).join(' · ') : 'No standalone top-level notice file supplied in this installed package. See third-party notices.'}</div></li>`).join('');
const bundledNotices = ['<a href="/legal/vendor/jsqr-Apache-2.0.txt">jsQR · Apache-2.0</a>', '<a href="/legal/vendor/Cinzel-OFL.txt">Cinzel · SIL Open Font License</a>', '<a href="/legal/vendor/Inter-OFL.txt">Inter · SIL Open Font License</a>', ...(await readdir('public/native/licenses')).filter(name => name.endsWith('.txt')).sort().map(name => `<a href="/native/licenses/${escape(name)}">${escape(name)}</a>`)];
const { cssUrl, jsUrl } = await learnAssets();
const legalHtml = `<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcfe"><title>License &amp; notices | Bankeiz</title><meta name="description" content="Software license, copyright, source materials and third-party notices for the Bankeiz reference implementation."><meta name="robots" content="noindex,follow"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script></head><body data-bank-surface="learn">${learnHeader()}<main id="main" class="learn-shell legal-main"><h1>License &amp; notices.</h1><p>Copyright © 2026 Brian Joseph Klock (BJ Klock).</p><p>The original software and documentation in this repository are licensed under <a href="/legal/LICENSE.txt">GNU GPL version 3 only</a>, except where separate existing terms apply. You may use, modify, rebrand and redistribute covered work under its terms. The software comes without warranty to the extent permitted by law; see sections 15–17 of the license.</p><p><a href="https://bankeiz.com/">Bankeiz.com</a> is the designated official reference implementation. Independent implementations may use their own branding. Brand identity and truthful conformance claims are separate from GPL software permissions.</p><div class="legal-list">${sourceDownload}${list}</div><details><summary>Read the complete GNU GPL version 3</summary><pre>${escape(await readFile('LICENSE', 'utf8'))}</pre></details><details><summary>Notices from ${packages.length} locked production dependencies</summary><p>This observed inventory preserves supplied notice files. It does not replace complete source delivery or determine legal compliance.</p><ul>${dependencies}</ul></details><details><summary>Additional bundled code &amp; font notices</summary><ul>${bundledNotices.map(link => `<li>${link}</li>`).join('')}</ul></details><p class="legal-small"><a href="https://github.com/kojibai/reality-grade-banking">Source repository</a> · <a href="/legal/dependencies.json">Dependency inventory</a> · <a href="/legal/release.json">Build metadata</a></p></main></body></html>`;
// Legal notices share the public shell. Bundle them after their source archive
// link is known; every entry remains a complete readable document without JS.
const publicLegalHtml=applyPublicMetadata(legalHtml,publicPage('/legal/'),socialImages.images['/legal/']);
const bankHtml = await readFile('dist/index.html', 'utf8');
const navigationPattern = /<script id="receiz-navigation" type="application\/json">[\s\S]*?<\/script>/;
const navigationScript = bankHtml.match(navigationPattern)?.[0];
if (!navigationScript) throw Error('Build public pages before legal notices.');
const navigation = JSON.parse(navigationScript.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
navigation.pages['/legal/'] = {
  head: publicLegalHtml.match(/<head>([\s\S]*?)<\/head>/)[1],
  content: publicLegalHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1],
};
const bundle = `<script id="receiz-navigation" type="application/json">${JSON.stringify(navigation).replaceAll('<', '\\u003c')}</script>`;
await writeFile('dist/legal/index.html', publicLegalHtml.replace(/<body([^>]*)>([\s\S]*?)<\/body>/, (_, attributes, content) => `<body${attributes}><div id="public-learn-root">${content}</div>${bundle}</body>`));
for (const file of ['dist/index.html', ...Object.keys(navigation.pages).filter(path => path !== '/legal/').map(path => `dist${path}index.html`)]) {
  await writeFile(file, (await readFile(file, 'utf8')).replace(navigationPattern, () => bundle));
}
console.log(`Published GPLv3, ownership, policies and supplied notices for ${packages.length} production dependencies at /legal/.`);
