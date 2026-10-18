import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Window } from 'happy-dom';
// @ts-expect-error Static release builders are plain ESM.
import { writePublicSdkSchemas } from '../scripts/build-public-schemas.mjs';

// @ts-expect-error Static reference renderer is plain ESM.
import { publicSdkSchemasPage } from '../scripts/public-sdk-schemas-page.mjs';

const sdkRoot = new URL('../node_modules/@receiz/sdk/', import.meta.url);
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
type SchemaFile = { path: string; url: string; sourcePath: string; bytes: number; sha256: string; schemaId: string; title: string };
let directory: string;
let manifest: { package: { name: string; version: string }; files: SchemaFile[]; archive: { url: string; sha256: string; bytes: number } };
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'bankeiz-public-sdk-schemas-'));
  await writePublicSdkSchemas(directory);
  manifest = JSON.parse(await readFile(join(directory, 'schemas/sdk/v129/manifest.json'), 'utf8'));
});
afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

describe('public canonical SDK schema distribution', () => {
  it('publishes every installed schema as exact bytes with independently checked sizes and digests', async () => {
    const sourceFiles = (await readdir(new URL('schemas/', sdkRoot), { recursive: true })).filter(path => path.endsWith('.schema.json')).sort();
    expect(manifest.package).toMatchObject({ name: '@receiz/sdk', version: '129.0.0' });
    expect(manifest.files.map(file => file.path)).toEqual(sourceFiles);
    expect(sourceFiles.length).toBeGreaterThan(40);
    for (const file of manifest.files) {
      const original = await readFile(new URL(`schemas/${file.path}`, sdkRoot));
      const published = await readFile(join(directory, file.url));
      expect(published.equals(original), file.path).toBe(true);
      expect(file.sourcePath).toBe(`schemas/${file.path}`);
      expect(file.bytes).toBe(original.length);
      expect(file.sha256).toBe(digest(original));
      expect(file.schemaId).toBe(JSON.parse(original.toString()).$id);
    }
  });

  it('keeps relative and canonical-id references closed within the published schema set', async () => {
    const schemas = new Map<string, Record<string, unknown>>();
    for (const file of manifest.files) schemas.set(file.path, JSON.parse(await readFile(join(directory, file.url), 'utf8')));
    const ids = new Map([...schemas].map(([path, schema]) => [schema.$id, path]));
    let references = 0;
    for (const [path, schema] of schemas) {
      function visit(value: unknown): void {
        if (!value || typeof value !== 'object') return;
        if ('$ref' in value && typeof value.$ref === 'string') {
          references++;
          const [target, fragment = ''] = value.$ref.split('#');
          const targetPath = !target ? path : /^https?:/.test(target) ? ids.get(target) : posix.normalize(posix.join(posix.dirname(path), target));
          expect(targetPath, `${path}: ${value.$ref}`).toBeTruthy();
          let resolved: unknown = schemas.get(targetPath!);
          expect(resolved, `${path}: ${value.$ref}`).toBeDefined();
          for (const token of fragment.replace(/^\//, '').split('/').filter(Boolean)) {
            expect(resolved, `${path}: ${value.$ref}`).toBeTypeOf('object');
            resolved = (resolved as Record<string, unknown>)[decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~')];
            expect(resolved, `${path}: ${value.$ref}`).toBeDefined();
          }
        }
        Object.values(value).forEach(visit);
      }
      visit(schema);
    }
    expect(references).toBeGreaterThan(400);
  });

  it('ships only schema bytes in a valid deterministic archive with no private or signing material', async () => {
    const archivePath = join(directory, manifest.archive.url);
    const archive = await readFile(archivePath);
    expect(archive.length).toBe(manifest.archive.bytes);
    expect(digest(archive)).toBe(manifest.archive.sha256);
    const names = execFileSync('unzip', ['-Z', '-1', archivePath], { encoding: 'utf8' }).trim().split('\n');
    expect(names).toEqual(manifest.files.map(file => file.path));
    execFileSync('unzip', ['-t', archivePath]);
    for (const file of manifest.files) {
      expect(execFileSync('unzip', ['-p', archivePath, file.path]).equals(await readFile(new URL(file.sourcePath, sdkRoot)))).toBe(true);
    }
    const published = (await readdir(join(directory, 'schemas'), { recursive: true })).filter(path => /\.[^/]+$/.test(path)).sort();
    expect(published).toEqual(['index.html', 'schemas.css', 'sdk/v129/manifest.json', 'sdk/v129/schemas.zip', ...manifest.files.map(file => `sdk/v129/${file.path}`)].sort());
    expect(Buffer.concat(await Promise.all(manifest.files.map(file => readFile(join(directory, file.url))))).toString()).not.toMatch(/-----BEGIN (?:ENCRYPTED |RSA |EC )?PRIVATE KEY-----|(?:sk-proj-|receivingSecret|privateKeyPkcs8B64u)\s*["']?\s*:/);
    await writePublicSdkSchemas(directory);
    expect((await readFile(archivePath)).equals(archive)).toBe(true);
  });

  it('offers working schema downloads and canonical package workflows without loading an application runtime', async () => {
    const html = await readFile(join(directory, 'schemas/index.html'), 'utf8');
    const window = new Window();
    window.document.write(html);
    const links = [...window.document.querySelectorAll('a[href]')];
    for (const file of manifest.files) {
      const download = links.find(link => link.getAttribute('href') === file.url && link.hasAttribute('download'));
      expect(download?.textContent?.trim(), file.path).toBeTruthy();
    }
    for (const url of ['/ledger/', '/source/index.json', '/schemas/sdk/v129/manifest.json', '/schemas/sdk/v129/schemas.zip']) {
      expect(links.some(link => link.getAttribute('href') === url && link.textContent?.trim()), url).toBe(true);
    }
    for (const name of ['sdk', 'mcp-server', 'ai-skills']) {
      expect(links.some(link => link.getAttribute('href')?.startsWith(`https://unpkg.com/@receiz/${name}@129.0.0/`)), name).toBe(true);
    }
    expect(window.document.querySelector('main h1')?.textContent).toBeTruthy();
    expect(window.document.querySelector('script')).toBeNull();
    const css = window.document.querySelector('link[rel="stylesheet"]')?.getAttribute('href');
    expect(css).toBe('/schemas/schemas.css');
    expect((await readFile(join(directory, css!), 'utf8')).length).toBeGreaterThan(1000);
    await window.happyDOM.close();
  });
});

it('updates every generated package instruction, schema path and release label for the coordinated next release', async () => {
  const current = JSON.parse(await readFile(join(directory, 'schemas/sdk/v129/manifest.json'), 'utf8'));
  // Upgrade metadata simulation only: no v130 package or schema bytes are invented.
  const next = JSON.parse(JSON.stringify(current).replaceAll('129.0.0', '130.0.0').replaceAll('/sdk/v129', '/sdk/v130'));
  const page = publicSdkSchemasPage(next);
  expect(page).not.toContain('129.0.0');
  expect(page).not.toContain('v129');
  for (const name of ['sdk','mcp-server','ai-skills']) expect(page).toContain(`@receiz/${name}@130.0.0`);
  expect(page).toContain('/schemas/sdk/v130/manifest.json');
  expect(page).toContain('/schemas/sdk/v130/schemas.zip');
  expect(page).toContain('Original schema generation');
});
