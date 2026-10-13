import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { publicMarketPlugin } from './server/public-market';
import { publicNetworkPlugin } from './server/public-network';

export default defineConfig({
  plugins: [react(), publicMarketPlugin(), publicNetworkPlugin(), { name: 'receiz-bank-offline-shell', generateBundle(_, bundle) {
    const files = Object.values(bundle).filter(file => file.type === 'asset' && /\.(css|wasm)$/.test(file.fileName) || file.type === 'chunk').map(file => `/${file.fileName}`);
    const template = readFileSync(new URL('./src/pwa/sw.template.js', import.meta.url), 'utf8');
    const version = createHash('sha256').update(files.join('|') + template).digest('hex').slice(0, 12);
    const shell = ['/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', ...files];
    const source = template.replace('__CACHE_VERSION__', version).replace('__SHELL_ASSETS__', JSON.stringify(shell));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  } }],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 1600 },
});
