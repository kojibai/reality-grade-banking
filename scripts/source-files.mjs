import { readdir, lstat, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Deliberate release allowlist. Never archive a checkout, home directory,
// operator environment, installed dependencies or an arbitrary git status list.
const directories = ['src', 'server', 'api', 'scripts', 'tests', 'conformance', 'verify', 'receipt', 'ledger', 'explore', 'pay', 'institution', 'branding', 'public', 'docs', 'native', '.github'];
const files = ['package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json', 'vercel.json', '.gitignore', '.gitattributes', 'README.md', 'CHANGELOG.md', 'LICENSE', 'NOTICE', 'LICENSING.md', 'LICENSE-PROPOSAL.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md', 'TRADEMARKS.md', 'CONFORMANCE.md', 'CONTRIBUTING.md', 'GOVERNANCE.md', 'SECURITY.md'];
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function sourceFiles() {
  const paths = [];
  async function visit(path) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw Error(`Source archive rejects symlink: ${path}`);
    const name = path.split('/').at(-1);
    if (/^(?:\.env(?:\..*)?|\.git|\.aws|\.npmrc|id_rsa|id_ed25519)$/.test(name) && path !== '.env.example') throw Error(`Source archive rejects private/config path: ${path}`);
    if (/\.(?:pem|p12|pfx|key)$/i.test(name)) throw Error(`Source archive rejects private-key container: ${path}`);
    if (stat.isDirectory()) {
      for (const entry of await readdir(path)) {
        if (entry === '.DS_Store') continue;
        await visit(`${path}/${entry}`);
      }
    } else if (stat.isFile()) paths.push(path);
    else throw Error(`Source archive requires regular files: ${path}`);
  }
  for (const path of [...directories, ...files]) await visit(path);
  return Promise.all(paths.sort().map(async path => { const bytes = await readFile(path); return { path, bytes, sha256: hash(bytes), mode: (await lstat(path)).mode & 0o111 ? 0o755 : 0o644 }; }));
}
