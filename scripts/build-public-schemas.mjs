import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReceizRelease } from './receiz-release.mjs';
import { publicSdkSchemasPage, publicSdkSchemasCss } from './public-sdk-schemas-page.mjs';

const require = createRequire(import.meta.url);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const packageRoot = name => dirname(require.resolve(`${name}/package.json`));

function references(schema) {
  const refs = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string') refs.push(value.$ref);
    Object.values(value).forEach(visit);
  }
  visit(schema);
  return [...new Set(refs)].sort();
}

function checkReferenceClosure(entries) {
  const byPath = new Map(entries.map(entry => [entry.path, entry.document]));
  const byId = new Map(entries.map(entry => [entry.document.$id, entry.path]));
  for (const entry of entries) for (const ref of entry.refs) {
    const [target, fragment = ''] = ref.split('#');
    const path = !target ? entry.path : /^https?:/.test(target) ? byId.get(target) : posix.normalize(posix.join(posix.dirname(entry.path), target));
    let node = byPath.get(path);
    if (node === undefined) throw Error(`PUBLIC_SDK_SCHEMA_REFERENCE_MISSING: ${entry.path}: ${ref}`);
    if (fragment && !fragment.startsWith('/')) throw Error(`PUBLIC_SDK_SCHEMA_REFERENCE_UNSUPPORTED: ${entry.path}: ${ref}`);
    for (const token of fragment.slice(1).split('/').filter(Boolean)) {
      node = node?.[decodeURIComponent(token).replaceAll('~1', '/').replaceAll('~0', '~')];
      if (node === undefined) throw Error(`PUBLIC_SDK_SCHEMA_REFERENCE_MISSING: ${entry.path}: ${ref}`);
    }
  }
}

// Deterministic, uncompressed ZIP. Only the exact schema tree enters this file;
// no package runtime, fixture, proving resource, credential or custody directory.
function schemaZip(entries) {
  const locals = [], central = [];
  let offset = 0;
  const crc32 = bytes => {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  for (const entry of entries) {
    const name = Buffer.from(entry.path), crc = crc32(entry.bytes), size = entry.bytes.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x21, 12); // 1980-01-01, fixed reproducible DOS date.
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(size, 18); local.writeUInt32LE(size, 22); local.writeUInt16LE(name.length, 26);
    locals.push(local, name, entry.bytes);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6);
    record.writeUInt16LE(0x21, 14); record.writeUInt32LE(crc, 16); record.writeUInt32LE(size, 20); record.writeUInt32LE(size, 24);
    record.writeUInt16LE(name.length, 28); record.writeUInt32LE(offset, 42);
    central.push(record, name); offset += local.length + name.length + size;
  }
  const centralBytes = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

/** Publish exact installed SDK schema bytes. This is static distribution,
 * never proof construction, canonical verification, or an admission authority. */
export async function writePublicSdkSchemas(directory = 'dist') {
  const { version, basePath } = await readReceizRelease();
  const packages = [];
  for (const name of ['@receiz/sdk', '@receiz/mcp-server', '@receiz/ai-skills']) {
    const bytes = await readFile(join(packageRoot(name), 'package.json'));
    const metadata = JSON.parse(bytes.toString('utf8'));
    if (metadata.name !== name || metadata.version !== version) throw Error(`PUBLIC_SDK_SCHEMA_VERSION_MISMATCH: ${name}`);
    packages.push({ name, version: metadata.version, license: metadata.license, packageJsonSha256: sha256(bytes) });
  }
  const sdk = packageRoot('@receiz/sdk'), entries = [];
  for (const generation of (await readdir(join(sdk, 'schemas'), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!generation.isDirectory() || !/^v[0-9]+$/.test(generation.name)) throw Error(`PUBLIC_SDK_SCHEMA_PATH_UNSUPPORTED: ${generation.name}`);
    for (const file of (await readdir(join(sdk, 'schemas', generation.name), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!file.isFile() || !/^[a-z0-9-]+\.schema\.json$/.test(file.name)) throw Error(`PUBLIC_SDK_SCHEMA_PATH_UNSUPPORTED: ${generation.name}/${file.name}`);
      const path = `${generation.name}/${file.name}`, bytes = await readFile(join(sdk, 'schemas', path));
      const document = JSON.parse(bytes.toString('utf8'));
      if (typeof document.$id !== 'string' || typeof document.title !== 'string') throw Error(`PUBLIC_SDK_SCHEMA_METADATA_MISSING: ${path}`);
      if (/-----BEGIN (?:ENCRYPTED |RSA |EC )?PRIVATE KEY-----/.test(bytes.toString('utf8'))) throw Error(`PUBLIC_SDK_SCHEMA_PRIVATE_MATERIAL: ${path}`);
      entries.push({ path, bytes, document, refs: references(document) });
    }
  }
  if (!entries.length) throw Error('PUBLIC_SDK_SCHEMAS_MISSING');
  checkReferenceClosure(entries);
  const documentation = [];
  for (const [name, path] of [
    ['@receiz/sdk', 'README.md'], ['@receiz/sdk', 'docs/artifact-verification.md'], ['@receiz/sdk', 'docs/offline-sealing.md'],
    ['@receiz/mcp-server', 'README.md'], ['@receiz/mcp-server', 'docs/mcp-uploaded-artifact-verification.md'],
    ['@receiz/ai-skills', 'receiz-proof-skill/SKILL.md'], ['@receiz/ai-skills', 'receiz-offline-verifier-skill/SKILL.md'],
  ]) {
    const bytes = await readFile(join(packageRoot(name), path));
    documentation.push({ package: name, path, url: `https://unpkg.com/${name}@${version}/${path}`, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const archive = schemaZip(entries);
  const manifest = {
    schema: 'bankeiz.public-sdk-schema-distribution.v1',
    package: packages[0], ecosystemPackages: packages, basePath,
    sourceDirectory: '@receiz/sdk/schemas',
    bytePolicy: 'Exact installed package bytes. Original paths, $id, $schema and $ref values are unchanged.',
    authority: 'Developer shape references only. Canonical enclosing-artifact verification and existing domain admission remain required.',
    files: entries.map(entry => ({ path: entry.path, sourcePath: `schemas/${entry.path}`, url: `${basePath}/${entry.path}`, bytes: entry.bytes.length, sha256: sha256(entry.bytes), schemaId: entry.document.$id, title: entry.document.title, refs: entry.refs })),
    archive: { url: `${basePath}/schemas.zip`, bytes: archive.length, sha256: sha256(archive), contents: 'Original schema-relative paths and exact schema bytes only.' },
    documentation,
  };
  const output = join(directory, basePath.slice(1));
  for (const entry of entries) {
    await mkdir(dirname(join(output, entry.path)), { recursive: true });
    await writeFile(join(output, entry.path), entry.bytes);
  }
  await writeFile(join(output, 'schemas.zip'), archive);
  await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(directory, 'schemas/schemas.css'), publicSdkSchemasCss);
  await writeFile(join(directory, 'schemas/index.html'), publicSdkSchemasPage(manifest));
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await writePublicSdkSchemas(process.argv[2] ?? 'dist');
  console.log(`Published ${manifest.files.length} byte-exact @receiz/sdk@${manifest.package.version} schemas at /schemas/.`);
}
