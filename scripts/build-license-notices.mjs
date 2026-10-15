import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { learnHeader } from './learn-template.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
await mkdir('dist/legal', { recursive: true });
for (const name of ['LICENSE', 'NOTICE', 'LICENSING.md', 'TRADEMARKS.md', 'CONFORMANCE.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md']) {
  await copyFile(name, `dist/legal/${name === 'LICENSE' || name === 'NOTICE' ? `${name}.txt` : name}`);
}
await mkdir('dist/legal/vendor', { recursive: true });
await copyFile('src/vendor/jsqr/LICENSE', 'dist/legal/vendor/jsqr-Apache-2.0.txt');
await copyFile('public/notes/fonts/OFL.txt', 'dist/legal/vendor/Cinzel-OFL.txt');

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
  institutionConformance: 'not-assessed', nativeSourceMaterials: 'external-matching-source-required',
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
const dependencies = packages.map(pkg => `<li><strong>${escape(pkg.name)} ${escape(pkg.version)}</strong><span>${escape(pkg.declaredLicense ?? 'License field not supplied')}</span><div>${pkg.notices.length ? pkg.notices.map(notice => `<a href="${escape(notice.url)}">${escape(notice.name)}</a>`).join(' · ') : 'No standalone top-level notice file supplied in this installed package. See third-party notices.'}</div></li>`).join('');
const bundledNotices = ['<a href="/legal/vendor/jsqr-Apache-2.0.txt">jsQR · Apache-2.0</a>', '<a href="/legal/vendor/Cinzel-OFL.txt">Cinzel · SIL Open Font License</a>', ...(await readdir('public/native/licenses')).filter(name => name.endsWith('.txt')).sort().map(name => `<a href="/native/licenses/${escape(name)}">${escape(name)}</a>`)];
await writeFile('dist/legal/index.html', `<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>License &amp; notices | Bankeiz</title><meta name="description" content="Software license, copyright, source materials and third-party notices for the Bankeiz reference implementation."><meta name="robots" content="noindex,follow"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/learn/learn.css"><style>html.learn-surface .legal-main{max-width:1000px;padding-block:65px 90px}html.learn-surface .legal-main h1{font-size:clamp(36px,6vw,64px);line-height:1.12;margin-bottom:25px}html.learn-surface .legal-main>p{font-size:17px;margin-bottom:20px;max-width:760px}html.learn-surface .legal-main p a,html.learn-surface .legal-main details a{color:var(--cobalt);text-decoration:underline;text-underline-offset:3px}html.learn-surface .legal-list{margin-top:42px;border-top:1px solid var(--line)}html.learn-surface .legal-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 0;border-bottom:1px solid var(--line)}html.learn-surface .legal-row h2{font-size:21px;letter-spacing:-.02em;margin-bottom:8px}html.learn-surface .legal-row p{font-size:14px}html.learn-surface .legal-row>span{font-size:24px;color:var(--cobalt)}html.learn-surface .legal-main details{margin-top:35px;line-height:1.6}html.learn-surface .legal-main summary{cursor:pointer;font-weight:600}html.learn-surface .legal-main pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.65;background:#eef2f8;padding:20px;border-radius:6px}html.learn-surface .legal-main ul{padding:0;list-style:none}html.learn-surface .legal-main li{padding:18px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere;font-size:14px}html.learn-surface .legal-main li>span{display:block;color:var(--muted)}html.learn-surface .legal-main .legal-small{font-size:14px;margin-top:30px}</style></head><body data-bank-surface="learn">${learnHeader()}<main id="main" class="learn-shell legal-main"><h1>License &amp; notices.</h1><p>Copyright © 2026 Brian Joseph Klock (BJ Klock).</p><p>The original software and documentation in this repository are licensed under <a href="/legal/LICENSE.txt">GNU GPL version 3 only</a>, except where separate existing terms apply. You may use, modify, rebrand and redistribute covered work under its terms. The software comes without warranty to the extent permitted by law; see sections 15–17 of the license.</p><p><a href="https://bankeiz.com/">Bankeiz.com</a> is the designated official reference implementation. Independent implementations may use their own branding. Brand identity and truthful conformance claims are separate from GPL software permissions.</p><div class="legal-list">${list}</div><details><summary>Read the complete GNU GPL version 3</summary><pre>${escape(await readFile('LICENSE', 'utf8'))}</pre></details><details><summary>Notices from ${packages.length} locked production dependencies</summary><p>This observed inventory preserves supplied notice files. It does not replace complete source delivery or determine legal compliance.</p><ul>${dependencies}</ul></details><details><summary>Additional bundled code &amp; font notices</summary><ul>${bundledNotices.map(link => `<li>${link}</li>`).join('')}</ul></details><p class="legal-small"><a href="https://github.com/kojibai/reality-grade-banking">Source repository</a> · <a href="/legal/dependencies.json">Dependency inventory</a> · <a href="/legal/release.json">Build metadata</a></p></main></body></html>`);
console.log(`Published GPLv3, ownership, policies and supplied notices for ${packages.length} production dependencies at /legal/.`);
