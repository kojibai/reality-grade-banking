import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const receizPackages = ['@receiz/sdk', '@receiz/mcp-server', '@receiz/ai-skills'];
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** One coordinated, exact package release. A new SDK alone cannot relabel the
 * MCP/Skills or the retained native distribution as the new release. */
export function validateReceizRelease({ application, lock, installed, native, nativeSdk }) {
  const version = application.dependencies?.['@receiz/sdk'];
  if (typeof version !== 'string' || !/^[1-9][0-9]*\.\d+\.\d+$/.test(version)) throw Error('RECEIZ_RELEASE_EXACT_VERSION_REQUIRED');
  for (const name of receizPackages) {
    if (application.dependencies?.[name] !== version || lock.packages?.['']?.dependencies?.[name] !== version || lock.packages?.[`node_modules/${name}`]?.version !== version || installed[name]?.name !== name || installed[name]?.version !== version) throw Error(`RECEIZ_RELEASE_VERSION_MISMATCH: ${name}`);
  }
  if (native.receizVersion !== version || nativeSdk?.name !== '@receiz/sdk' || nativeSdk.version !== version) throw Error('RECEIZ_RELEASE_NATIVE_SOURCE_MISMATCH');
  const generation = `v${version.split('.')[0]}`;
  return { version, generation, basePath: `/schemas/sdk/${generation}` };
}
export async function readReceizRelease(directory = root) {
  const json = async path => JSON.parse(await readFile(resolve(directory, path), 'utf8'));
  const [application, lock, native, nativeSdk, packages] = await Promise.all([
    json('package.json'), json('package-lock.json'), json('native/manifest.json'), json('native/receiz/packages/receiz-sdk/package.json'),
    Promise.all(receizPackages.map(name => json(`node_modules/${name}/package.json`))),
  ]);
  return validateReceizRelease({ application, lock, native, nativeSdk, installed: Object.fromEntries(receizPackages.map((name, i) => [name, packages[i]])) });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = await readReceizRelease();
  console.log(`Receiz ${release.version}: application, lockfile, installed SDK/MCP/AI Skills and native source versions agree.`);
}
