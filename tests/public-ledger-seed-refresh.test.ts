import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {describe,expect,it} from 'vitest';
import * as refresh from '../scripts/public-ledger-seed-refresh';
import type {PublicRecord,PublicSource} from '../src/receiz/public-network';

const generation='a'.repeat(64);
const oldCapture='2026-11-18T12:00:00.000Z',nextCapture='2026-11-20T12:00:00.000Z';
const row=(source:PublicSource,id:string,extra:Partial<PublicRecord>={}):PublicRecord=>({
 id:source+':'+id,sourceId:id,source,kind:'example',title:'Example',detail:'',
 time:oldCapture,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,
 authority:'public-source-projection',evidence:{entryHash:(id==='first'?'1':'2').repeat(64)},...extra,
});
const financial=['actions','wallet','graph'] as const;
const proof=row('proofs','original');
const originalTrade=row('actions','first',{kind:'market.share.buy',details:{assetTrade:{
 side:'buy',tradeId:'11111111-1111-4111-8111-111111111111',priceUsdCents:'20',shareQuantityMicro:'1000000',notionalUsdCents:'20',
}}});
const second=row('actions','second');
const archive=(capturedAt:string,records:readonly PublicRecord[],sources:readonly PublicSource[]=financial)=>JSON.stringify({
 schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',capturedAt,inspectionVersion:5,records,
 coverage:sources.map(source=>({source,complete:true,observedAt:Date.parse(capturedAt)})),
});
const held=gzipSync(archive(oldCapture,[originalTrade,proof],[...financial,'proofs']));
const readiness=(body:string,coordinate=generation,exact=true)=>{
 const document='<script id="public-ledger-document-seed" type="application/json">'+JSON.stringify({
  schema:'bank.public-ledger.document.v1',path:'observatory',generation:coordinate,snapshotGzip:[
   {bytes:Buffer.byteLength(body),gzipB64u:gzipSync(body).toString('base64url')},
   {bytes:0,gzipB64u:''},
  ],
 })+'</script>';
 return new Response(document,{headers:{'content-type':'text/html','x-receiz-public-html-state':'current',
  'x-receiz-public-material-revision':generation,'x-receiz-public-render-build':'b'.repeat(64),
  'x-receiz-public-state-coordinate':generation,'x-receiz-public-html-sha256':createHash('sha256').update(exact?document:'different').digest('hex')}});
};

describe('background public Ledger seed refresh',()=>{
 it('appends the ready financial history while keeping exact held trade facts and the existing proof packet',async()=>{
  const result=await refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[{...originalTrade,details:{}},second])),held);
  expect(result?.capturedAt).toBe(nextCapture);
  const rows=JSON.parse(gunzipSync(result!.bytes).toString()).records;
  expect(rows.map((item:PublicRecord)=>item.id).sort()).toEqual([originalTrade.id,second.id,proof.id].sort());
  expect(rows.find((item:PublicRecord)=>item.id===originalTrade.id).details.assetTrade).toEqual(originalTrade.details?.assetTrade);
 });
 it('can advance from an accepted retained snapshot while a newer public document is being prepared',async()=>{
  const response=readiness(archive(nextCapture,[originalTrade,second]));
  response.headers.set('x-receiz-public-html-state','retained');
  response.headers.set('x-receiz-public-pending-state-coordinate','c'.repeat(64));
  await expect(refresh.refreshPublicLedgerSeed(response,held)).resolves.toMatchObject({capturedAt:nextCapture,added:1});
 });
 it('keeps the seed unchanged when the selected financial history does not advance',async()=>{
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[originalTrade])),held)).resolves.toBeNull();
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(oldCapture,[originalTrade])),held)).resolves.toBeNull();
 });
 it('refuses changed provenance, a missing retained action, incomplete source coverage and altered content',async()=>{
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[second])),held)).rejects.toThrow('PUBLIC_LEDGER_SEED_HISTORY_CONFLICT');
  const altered={...originalTrade,evidence:{entryHash:'3'.repeat(64)}};
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[altered,second])),held)).rejects.toThrow('PUBLIC_LEDGER_SEED_HISTORY_CONFLICT');
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[originalTrade,second],['actions','wallet'])),held)).rejects.toThrow('PUBLIC_LEDGER_SEED_INCOMPLETE');
  await expect(refresh.refreshPublicLedgerSeed(readiness(archive(nextCapture,[originalTrade,second]),generation,false),held)).rejects.toThrow('PUBLIC_LEDGER_SEED_DOCUMENT_INVALID');
 });
});
