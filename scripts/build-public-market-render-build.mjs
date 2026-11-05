import {createHash} from 'node:crypto';
import {access,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';

// This identifies the actual renderer, template and browser code. Changing a
// deployment alias or route without changing these bytes keeps the same key.
const root=process.cwd(),files=new Map(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function include(path){
 if(files.has(path))return;const bytes=await readFile(resolve(root,path));files.set(path,{path,sha256:sha(bytes),bytes:bytes.byteLength});return bytes;
}
async function renderer(path){
 if(files.has(path))return;const bytes=await include(path),text=bytes.toString('utf8');
 for(const match of text.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["'](\.\/[A-Za-z0-9_.-]+\.mjs)["']/g))await renderer(relative(root,resolve(root,dirname(path),match[1])));
}
for(const path of ['server/public-market-preparation.ts','server/prepared-public-market-state.ts','server/public-ledger-preparation.ts','server/prepared-public-material.ts','server/public-market.ts','src/receiz/prepared-public-page-path.ts','public/receiz-public-share-chart-history.json'])await include(path);
await renderer('server/profile-runtime/public-market-document.mjs');
await renderer('server/profile-runtime/public-page-preparation.mjs');
try{await access('server/profile-runtime/prepared-dependent-documents.mjs');await renderer('server/profile-runtime/prepared-dependent-documents.mjs');}catch(error){if(error?.code!=='ENOENT')throw error;}
const paths=['explore',...['music','images','videos','books','essays','moments','collectibles','documents'].map(category=>'explore/'+category),'market-cap'];
for(const path of paths){const bytes=await include('dist/'+path+'/index.html');for(const match of bytes.toString('utf8').matchAll(/(?:src|href)="(\/assets\/[A-Za-z0-9_.-]+\.(?:js|css))"/g))await include('dist'+match[1]);}
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8')),seen=new Set();
async function browser(key){if(seen.has(key))return;seen.add(key);const entry=manifest[key];if(!entry)throw Error('PUBLIC_MARKET_RENDER_BROWSER_GRAPH_INVALID');await include('dist/'+entry.file);for(const css of entry.css??[])await include('dist/'+css);for(const child of [...(entry.imports??[]),...(entry.dynamicImports??[])])await browser(child);}
await browser('explore/index.html');
for(const entry of ['index.html','ledger/index.html','feed/index.html','discover/index.html'])if(manifest[entry]){await include('dist/'+entry);await browser(entry);}
const inputs=[...files.values()].sort((a,b)=>a.path.localeCompare(b.path)),digest=sha(JSON.stringify(inputs));
await writeFile('server/profile-runtime/public-market-render-build.json',JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:digest,files:inputs}));
console.log(JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:digest,files:inputs.length}));
