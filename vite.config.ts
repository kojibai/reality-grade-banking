import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { publicMarketPlugin } from './server/public-market';
import { nativeAccountPlugin } from './server/native-account';
import { publicNetworkPlugin } from './server/public-network';
import { learnAssets } from './scripts/learn-assets.mjs';

export default defineConfig({
  test: { include: ['tests/**/*.test.{ts,tsx}'], environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } } },
  plugins: [react(), publicMarketPlugin(), publicNetworkPlugin(), nativeAccountPlugin(), {
    name: 'receiz-receiver-build-provenance',
    resolveId(id) { if (id === 'virtual:receiz-receiver-build') return '\0receiz-receiver-build'; },
    load(id) {
      if (id !== '\0receiz-receiver-build') return;
      const { version, moduleSha256, sourceCommit } = JSON.parse(readFileSync(new URL('./public/native/receiver-verifier.v129.manifest.json', import.meta.url), 'utf8'));
      return `export default ${JSON.stringify({ version, moduleSha256, sourceCommit })};`;
    },
  }, { name: 'receiz-bank-offline-shell', async generateBundle(_, bundle) {
    const files = Object.values(bundle).filter(file => !file.fileName.includes('conformance') && (file.type === 'asset' && /\.(css|wasm)$/.test(file.fileName) || file.type === 'chunk' && !file.fileName.includes('qr-decoder'))).map(file => `/${file.fileName}`);
    const template = readFileSync(new URL('./src/pwa/sw.template.js', import.meta.url), 'utf8');
    const version = createHash('sha256').update(files.join('|') + template + ['public/learn/learn.css', 'public/learn/learn.js', 'scripts/learn-template.mjs', 'scripts/build-public-pages.mjs', 'scripts/account-notice-pages.mjs', 'src/receiz/config.ts'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('|')).digest('hex').slice(0, 12);
    const learn = await learnAssets();
    const shell = ['/learn/learn.css', '/learn/learn.js', learn.cssUrl, learn.jsUrl, '/learn/proof-glass.webp', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/zk/document-seal.wasm', '/zk/document-seal.zkey', '/zk/kai-sigil.wasm', '/zk/kai-sigil.zkey', ...files];
    const source = template.replace('__CACHE_VERSION__', version).replace('__SHELL_ASSETS__', JSON.stringify(shell));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  } }],
  server: { port: 5173, strictPort: true },
  build: { manifest: true, rollupOptions: { input: { bank: resolve('index.html'), conformance: resolve('conformance/index.html') }, output: { manualChunks(id) { if (id.includes('/vendor/jsqr/')) return 'qr-decoder'; } } }, target: 'es2022', chunkSizeWarningLimit: 1600 },
});
