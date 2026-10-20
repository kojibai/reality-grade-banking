import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publicMarketPlugin } from './server/public-market';
import { nativeAccountPlugin } from './server/native-account';
import { publicNetworkPlugin } from './server/public-network';
import {publicLedgerProofPlugin} from './server/public-ledger-proof';
import {valueExplainerDevPlugin} from './scripts/value-explainer-assets.mjs';
import { accountProofPublicPlugin } from './server/account-proof-public';
import { openingShellHtml } from './scripts/opening-shell.mjs';
import {publicMetadataPlugin} from './scripts/public-metadata-plugin.mjs';
import {receiptPreviewPlugin} from './server/receipt-preview-plugin';
import {assetPreviewPlugin} from './server/asset-preview-plugin';

export default defineConfig({
  test: { include: ['tests/**/*.test.{ts,tsx}'], environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } } },
  plugins: [assetPreviewPlugin(),receiptPreviewPlugin(),publicMetadataPlugin(),{name:'bankeiz-explorer-alias',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/explorer\/?(?:\?|$)/.test(req.url))req.url=req.url.replace(/^\/explorer\/?/,'/explore/');next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/explorer\/?(?:\?|$)/.test(req.url))req.url=req.url.replace(/^\/explorer\/?/,'/explore/');next();});}},{name:'bankeiz-opening-shell', async transformIndexHtml(html, context) {
    if (!context.server || !['/', '/index.html'].includes(context.path)) return html;
    const { AccountOpening } = await context.server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
    return openingShellHtml(html, AccountOpening);
  }}, {name:'bankeiz-opaque-ledger-seed',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/receiz-public-ledger.json.gz')req.url='/receiz-public-ledger.json.gz.bin';next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/receiz-public-ledger.json.gz')req.url='/receiz-public-ledger.json.gz.bin';next();});}},react(), valueExplainerDevPlugin(), publicLedgerProofPlugin(), publicMarketPlugin(), publicNetworkPlugin(), nativeAccountPlugin(), accountProofPublicPlugin(), {
    name: 'receiz-receiver-build-provenance',
    resolveId(id) { if (id === 'virtual:receiz-receiver-build') return '\0receiz-receiver-build'; },
    load(id) {
      if (id !== '\0receiz-receiver-build') return;
      const { version, moduleSha256, sourceCommit } = JSON.parse(readFileSync(new URL('./public/native/receiver-verifier.v129.manifest.json', import.meta.url), 'utf8'));
      return `export default ${JSON.stringify({ version, moduleSha256, sourceCommit })};`;
    },
  }],
  server: { port: 5173, strictPort: true },
  build: { manifest: true, rollupOptions: { input: { bank: resolve('index.html'), conformance: resolve('conformance/index.html'), verify: resolve('verify/index.html'), receipt:resolve('receipt/index.html'), ledger:resolve('ledger/index.html'),explore:resolve('explore/index.html') }, output: { manualChunks(id) { if (id.includes('/vendor/jsqr/')) return 'qr-decoder'; } } }, target: 'es2022', chunkSizeWarningLimit: 1600 },
});
