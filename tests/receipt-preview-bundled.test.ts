import {expect,it} from 'vitest';
import {build} from 'esbuild';
import {mkdtemp,mkdir,cp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {readLedgerReceipt} from '../src/receiz/ledger-receipts';

it('renders transfer and Asset Sale share images from emitted Node chunks without unrelated marketing screenshots',async()=>{
 const root=process.cwd(),stage=await mkdtemp(join(tmpdir(),'bank-receipt-image-'));
 const records=[
  readLedgerReceipt({schema:'bankeiz.ledger-receipt.v1',id:'transfer-fixture',kind:'chat_transfer',title:'Payment',source:'wallet',amountUsdCents:'12500',sender:'Alex',recipient:'Sam',pulse:'14895392'}),
  readLedgerReceipt({schema:'bankeiz.ledger-receipt.v1',id:'asset-sale-fixture',kind:'market.share.sell',title:'market share sell',source:'actions',amountUsdCents:null,pulse:'14895392',value:{basis:'payment',amountUsdCents:'106051723',pulse:'14895392',considerationUsdCents:null}}),
 ];
 try{
  await build({entryPoints:[resolve(root,'server/receipt-preview.ts')],outdir:join(stage,'runtime'),entryNames:'receipt-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'silent'});
  await writeFile(join(stage,'package.json'),'{"type":"module"}');await symlink(resolve(root,'node_modules'),join(stage,'node_modules'),'dir');
  await mkdir(join(stage,'scripts/social'),{recursive:true});await cp(resolve(root,'scripts/social/fonts'),join(stage,'scripts/social/fonts'),{recursive:true});
  // The function has its fonts and receipt runtime, with no meeting, product
  // screenshots or static-page build directory. Those cannot gate a receipt.
  const program=`import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
let payload='',reads=0;globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://receiz.com/api/public/display-snapshots/'+createHash('sha256').update(payload).digest('hex'));assert.equal(init.credentials,'omit');reads++;return new Response(payload);};
const {handleReceiptPreview}=await import('./runtime/receipt-preview.mjs');assert.equal(reads,0);
for(const receipt of ${JSON.stringify(records)}){payload=JSON.stringify(receipt);const digest=createHash('sha256').update(payload).digest('hex'),url='https://bankeiz.com/api/receipt?s='+digest+'&image=1';
const head=await handleReceiptPreview(new Request(url,{method:'HEAD'}));assert.equal(head.status,200);assert.equal(reads,receipt.kind==='chat_transfer'?0:1);
const response=await handleReceiptPreview(new Request(url));assert.equal(response.status,200,receipt.kind+' PNG must render in the deployed Node module graph');assert.equal(response.headers.get('content-type'),'image/png');const png=new Uint8Array(await response.arrayBuffer());assert.deepEqual([...png.slice(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(new DataView(png.buffer).getUint32(16),1730);assert.equal(new DataView(png.buffer).getUint32(20),909);}
assert.equal(reads,2);console.log('PASS two emitted-Node receipt PNGs; exactly one digest-bound source read each; no screenshot files or account calls.');`;
  await writeFile(join(stage,'run.mjs'),program);
  const result=spawnSync(process.execPath,[join(stage,'run.mjs')],{cwd:stage,encoding:'utf8',timeout:30000});
  expect(result.error).toBeUndefined();expect(result.status,result.stdout+result.stderr).toBe(0);expect(result.stdout).toContain('PASS two emitted-Node receipt PNGs');
 }finally{await rm(stage,{recursive:true,force:true});}
},15000);
