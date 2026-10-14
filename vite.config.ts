import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { publicMarketPlugin } from './server/public-market';
import { nativeAccountPlugin } from './server/native-account';
import { publicNetworkPlugin } from './server/public-network';

export default defineConfig({
  test: { environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } } },
  plugins: [react(), publicMarketPlugin(), publicNetworkPlugin(), nativeAccountPlugin(), { name: 'receiz-bank-offline-shell', generateBundle(_, bundle) {
    const files = Object.values(bundle).filter(file => file.type === 'asset' && /\.(css|wasm)$/.test(file.fileName) || file.type === 'chunk' && !file.fileName.includes('qr-decoder')).map(file => `/${file.fileName}`);
    const template = readFileSync(new URL('./src/pwa/sw.template.js', import.meta.url), 'utf8');
    const version = createHash('sha256').update(files.join('|') + template).digest('hex').slice(0, 12);
    const shell = ['/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/zk/document-seal.wasm', '/zk/document-seal.zkey', '/zk/kai-sigil.wasm', '/zk/kai-sigil.zkey', ...files];
    const source = template.replace('__CACHE_VERSION__', version).replace('__SHELL_ASSETS__', JSON.stringify(shell));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  } }],
  server: { port: 5173, strictPort: true },
  build: { rollupOptions: { output: { manualChunks(id) { if (id.includes('/vendor/jsqr/')) return 'qr-decoder'; } } }, target: 'es2022', chunkSizeWarningLimit: 1600 },
});
