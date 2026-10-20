import assert from 'node:assert/strict';
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {deflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

// Run after `vercel build --prod`. Tests the emitted function and its traced
// template/fonts/native renderer. Synthetic display data; no account access.
const root=new URL('../.vercel/output/',import.meta.url);
const routing=JSON.parse(await readFile(new URL('config.json',root),'utf8'));
assert.ok(routing.routes.some(route=>route.dest?.split('?')[0]==='/api/receipt'&&route.has?.some(condition=>condition.type==='query'&&condition.key==='r')),'Compact receipts must reach the crawler-facing function.');
const functionRoot=new URL('functions/api/receipt.func/',root);
// Current CLI versions defer these exact file copies to deployment assembly.
// Materialize its generated map locally, rather than relying on the checkout's
// working directory to accidentally supply the receipt template or fonts.
const config=JSON.parse(await readFile(new URL('.vc-config.json',functionRoot),'utf8'));
for(const [bundlePath,sourcePath] of Object.entries(config.filePathMap??{})){
 const target=new URL(bundlePath,functionRoot);await mkdir(dirname(fileURLToPath(target)),{recursive:true});await copyFile(resolve(sourcePath),target);
}
const {default:api}=await import(new URL('api/receipt.js',functionRoot));
const raw=Buffer.from(JSON.stringify(['synthetic','chat_transfer','Payment','wallet','public-source-projection','','12500','123',null,'2026-10-19T20:00:00Z','Alex','Sam',null,{},null,null,{},null,false]));
const header=Buffer.from([1,raw.length>>>8,raw.length&255]);
const packet=Buffer.concat([header,deflateRawSync(raw)]).toString('base64url');
const url='https://bankeiz.com/receipt/?r='+packet,previous=process.cwd(),fetch=globalThis.fetch;
try{
 process.chdir(fileURLToPath(functionRoot));
 globalThis.fetch=()=>{throw Error('Receipt previews must never fetch account data or ledger sources.');};
 const html=await api.fetch(new Request(url));assert.equal(html.status,200);const body=await html.text();assert.ok(body.includes('$125.00')&&body.includes('property="og:image"')&&body.includes('/assets/'),'The emitted function must use the built receipt entry with specific metadata.');
 const png=await api.fetch(new Request(url+'&image=1'));assert.equal(png.status,200);assert.equal(png.headers.get('content-type'),'image/png');const bytes=Buffer.from(await png.arrayBuffer());assert.equal(bytes.readUInt32BE(16),1730);assert.equal(bytes.readUInt32BE(20),909);
 const head=await api.fetch(new Request(url+'&image=1',{method:'HEAD'}));assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
 console.log('PASS: emitted receipt route, carried metadata, built app template, traced fonts/native PNG, bounded HEAD and zero upstream access.');
}finally{process.chdir(previous);globalThis.fetch=fetch;}
