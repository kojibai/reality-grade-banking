import {matterPageDevPlugin} from './scripts/matter-page-dev.mjs';
import {bookingGuideDevPlugin} from './scripts/booking-guide-dev.mjs';
import {discoveryPageDevPlugin} from './scripts/discover-page.mjs';
import {feedPageDevPlugin} from './scripts/feed-page.mjs';
import {momentsPageDevPlugin} from './scripts/moments-page-dev.mjs';
import {userGuidePageDevPlugin} from './scripts/user-guide-page-dev.mjs';
import {meetingPageDevPlugin} from './scripts/meeting-page-dev.mjs';
import {originalsQualificationDevPlugin} from './scripts/originals-qualification-assets.mjs';
import {handleOriginalsQualification} from './server/originals-qualification';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import {cooperativeConversationPlugin} from './server/cooperative-conversation-plugin';
import {createHash} from 'node:crypto';
import { readFileSync,readdirSync } from 'node:fs';
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
import {profilePreviewPlugin} from './server/profile-preview-plugin';
import {bookingPreviewPlugin} from './server/booking-preview-plugin';
import {checkoutPreviewPlugin} from './server/checkout-preview-plugin';

export default defineConfig({
  test: { globalSetup:['./tests/setup/server-asset-runtime.mjs'], include: ['tests/**/*.test.{ts,tsx}'], environmentOptions: { happyDOM: { settings: { disableIframePageLoading: true } } } },
  plugins: [discoveryPageDevPlugin(),feedPageDevPlugin(),{name:'bankeiz-meeting-route',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&(/^\/meet\/start\/?(?:\?|$)/.test(req.url)||/^\/meet\/[a-f0-9-]{36}\/[A-Za-z0-9_-]{16,160}\/?(?:\?|$)/i.test(req.url)))req.url='/meet/room.html';next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&(/^\/meet\/start\/?(?:\?|$)/.test(req.url)||/^\/meet\/[a-f0-9-]{36}\/[A-Za-z0-9_-]{16,160}\/?(?:\?|$)/i.test(req.url)))req.url='/meet/room.html';next();});}},{name:'bankeiz-originals-progress',configureServer(server){server.middlewares.use((req,res,next)=>{if(!req.url?.startsWith('/api/bank/originals-qualification/'))return next();void handleOriginalsQualification(new Request(new URL(req.url,'http://localhost'),{method:req.method})).then(async response=>{res.statusCode=response.status;response.headers.forEach((value,key)=>res.setHeader(key,value));res.end(await response.text());}).catch(next);});}},{name:'bankeiz-share-certificate-route',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/shares\/[A-Za-z0-9._:%-]{16,600}\/?(?:\?|$)/.test(req.url))req.url='/explore/index.html';next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/shares\/[A-Za-z0-9._:%-]{16,600}\/?(?:\?|$)/.test(req.url))req.url='/explore/index.html';next();});}},momentsPageDevPlugin(),userGuidePageDevPlugin(),meetingPageDevPlugin(),bookingGuideDevPlugin(),matterPageDevPlugin(),bookingPreviewPlugin(),{name:'bankeiz-booking-route',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/book\/[a-z0-9_]{3,24}\/?(?:\?|$)/.test(req.url))req.url='/booking/index.html';next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/book\/[a-z0-9_]{3,24}\/?(?:\?|$)/.test(req.url))req.url='/booking/index.html';next();});}},cooperativeConversationPlugin(),checkoutPreviewPlugin(),profilePreviewPlugin(),assetPreviewPlugin(),receiptPreviewPlugin(),publicMetadataPlugin(),{name:'bankeiz-explorer-alias',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/explorer\/?(?:\?|$)/.test(req.url))req.url=req.url.replace(/^\/explorer\/?/,'/explore/');next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url&&/^\/explorer\/?(?:\?|$)/.test(req.url))req.url=req.url.replace(/^\/explorer\/?/,'/explore/');next();});}},{name:'bankeiz-opening-shell', async transformIndexHtml(html, context) {
    if (!context.server || !['/', '/index.html'].includes(context.path)) return html;
    const { AccountOpening } = await context.server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
    return openingShellHtml(html, AccountOpening);
  }}, {name:'bankeiz-opaque-ledger-seed',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/receiz-public-ledger.json.gz')req.url='/receiz-public-ledger.json.gz.bin';next();});},configurePreviewServer(server){server.middlewares.use((req,_res,next)=>{if(req.url==='/receiz-public-ledger.json.gz')req.url='/receiz-public-ledger.json.gz.bin';next();});}},react(), originalsQualificationDevPlugin(), valueExplainerDevPlugin(), publicLedgerProofPlugin(), publicMarketPlugin(), publicNetworkPlugin(), nativeAccountPlugin(), accountProofPublicPlugin(), {
    name: 'receiz-receiver-build-provenance',
    resolveId(id) { if (id === 'virtual:receiz-receiver-build') return '\0receiz-receiver-build'; },
    load(id) {
      if (id !== '\0receiz-receiver-build') return;
      const { version, moduleSha256, sourceCommit } = JSON.parse(readFileSync(new URL('./public/native/receiver-verifier.v129.manifest.json', import.meta.url), 'utf8'));
      return `export default ${JSON.stringify({ version, moduleSha256, sourceCommit })};`;
    },
  }, {
    name:'receiz-conformance-suite-identity',
    resolveId(id){if(id==='virtual:receiz-conformance-suite-build')return '\0receiz-conformance-suite-build';},
    load(id){
      if(id!=='\0receiz-conformance-suite-build')return;
      const paths=['src/receiz/note-funding.ts','src/receiz/native-asset-backing.ts','institution/receiver-profile.json','institution/conformance-protocol.json','institution/receiving-standard.md','docs/note-continuity-standard.md','docs/connected-notes-v129.md'];
      for(const dir of ['src/conformance/','docs/conformance/'])for(const entry of readdirSync(new URL(dir,import.meta.url),{withFileTypes:true}))if(entry.isFile()&&(dir.startsWith('src')?/\.(?:ts|tsx|css|json)$/:/\.md$/).test(entry.name))paths.push(dir+entry.name);
      const sha=(source:Buffer|string)=>createHash('sha256').update(source).digest('hex');
      const inputs=paths.sort().map(path=>{const url=new URL(path,import.meta.url);this.addWatchFile(url.pathname);return {path,sha256:sha(readFileSync(url))};});
      return `export default ${JSON.stringify({method:'sha256-path-content-v1',sourceTreeSha256:sha(JSON.stringify(inputs)),inputCount:inputs.length})};`;
    },
  }],
  server: { port: 5173, strictPort: true },
  build: { manifest: true, rollupOptions: { input: { discover:resolve('discover/index.html'), feed:resolve('feed/index.html'), meeting:resolve('meet/room.html'),booking:resolve('booking/index.html'), vault:resolve('vault/index.html'), checkout: resolve('pay/index.html'), bank: resolve('index.html'), conformance: resolve('conformance/index.html'), verify: resolve('verify/index.html'), receipt:resolve('receipt/index.html'), ledger:resolve('ledger/index.html'),explore:resolve('explore/index.html') }, output: { manualChunks(id) { if (id.includes('/vendor/jsqr/')) return 'qr-decoder'; } } }, target: 'es2022', chunkSizeWarningLimit: 1600 },
});
