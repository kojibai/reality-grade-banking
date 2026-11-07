// @vitest-environment happy-dom
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {readFileSync,writeFileSync} from 'node:fs';
import {renderToString} from 'react-dom/server';
import {createElement} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {renderPreparedDependentDocument} from '../server/prepared-dependent-documents';
import {readPublicLedgerDocumentSeed} from '../src/receiz/public-ledger-document-seed';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {publicNetworkCacheWire} from '../src/receiz/public-network-cache-wire';
const target='imported-'+('c'.repeat(64)),title='New accepted public Original';
const member=(id:string,label:string)=>({id:'profile:artist:'+id,receizId:id,title:label,visibility:'public',ownerUsername:'artist',createdAt:'2026-11-02T13:42:03.000Z',pulse:'14955302',profileOriginal:{hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64),media:{kind:'image',originalDownloadSha256Hex:'a'.repeat(64)},verifyPath:'/v/20261102_0942/21188918/14955302?c=rpb2.carried'}});
const transaction={id:'wallet:existing',sourceId:'existing',source:'wallet',kind:'transfer',title:'Existing transfer',detail:'A recorded movement',time:'2026-11-03T00:01:00.000Z',actor:null,sender:'Public sender',recipient:'Public recipient',amountUsdCents:'1200',kaiUpulse:'14960000000000',pulse:'14960000',sourceUrl:null,evidence:{entryHash:'b'.repeat(64)},authority:'public-source-projection',privateKey:'MUST_NOT_CARRY'};
const cache={schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[transaction],capturedAt:'2026-11-03T00:01:00.000Z',inspectionVersion:5,coverage:[{source:'wallet',complete:true,anchorIds:['wallet:existing'],observedAt:1}]};
const template='<!doctype html><html><head></head><body><div id="public-ledger-root"><p>Old first paint</p></div><script id="receiz-navigation" type="application/json">'+JSON.stringify({pages:{'/explore/':{content:'explore'},'/ledger/':{content:'old ledger'}},bank:{content:'bank'},styles:[]})+'</script></body></html>';
function input(gzip=false){const rows=[member('old','Existing proof'),member(target,title)],membership={ok:true,transport:{generatedAt:'2026-11-04T20:19:15.000Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:2},publicOriginals:rows}},material=JSON.stringify({membership,...(gzip?{ledgerCacheGzipB64u:gzipSync(JSON.stringify(cache)).toString('base64url')}:{ledgerCache:cache})});return{material,generation:createHash('sha256').update(material).digest('hex'),path:'ledger/proofs',template};}
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('prepared public Ledger',()=>{
 it.each([false,true])('carries the new proof before JavaScript, keeps existing financial history and requires no reads (%s)',async gzip=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));const html=await renderPreparedDependentDocument(input(gzip));document.body.innerHTML=html;
  expect(document.querySelector('#public-ledger-root')?.textContent).toContain(title);expect(document.querySelector('#public-ledger-root')?.textContent).toContain('Existing proof');
  const seed=await readPublicLedgerDocumentSeed();expect(seed?.snapshot.records.map(row=>row.id)).toContain('wallet:existing');expect(seed?.snapshot.records.filter(row=>row.sourceId==='profile:artist:'+target)).toHaveLength(1);expect(html).not.toContain('MUST_NOT_CARRY');expect(fetch).not.toHaveBeenCalled();expect(await readPublicLedgerDocumentSeed()).toBe(seed);
  expect(seed?.snapshot.records.find(row=>row.id==='wallet:existing')?.evidence.entryHash).toBe('b'.repeat(64));
  const first=renderToString(createElement(PublicLedgerApp,{active:false,initialSnapshot:seed!.snapshot,initialHref:'https://bankeiz.com/ledger/proofs/',initialFilter:'proofs',initialFormat:seed!}));expect(first).toContain(title);expect(fetch).not.toHaveBeenCalled();
 });
 it('refuses changed material, incomplete membership and missing retained history without fabricating it',async()=>{
  const good=input();await expect(renderPreparedDependentDocument({...good,generation:'0'.repeat(64)})).rejects.toThrow(/INPUT_INVALID/);
  for(const change of ['incomplete','no-history']){const value=JSON.parse(good.material);if(change==='incomplete')value.membership.transport.publicMembership.isComplete=false;else delete value.ledgerCache;const material=JSON.stringify(value);await expect(renderPreparedDependentDocument({...good,material,generation:createHash('sha256').update(material).digest('hex')})).rejects.toThrow(/COMPLETE_MEMBERSHIP_REQUIRED|PREPARED_HISTORY_REQUIRED/);}
 });
 it('hydrates the held rows in place without reconstructing history or losing the selected proof',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
  document.body.innerHTML=await renderPreparedDependentDocument(input());const seed=(await readPublicLedgerDocumentSeed())!,container=document.querySelector('#public-ledger-root')!,before=[...container.querySelectorAll('.public-ledger-row')];expect(before.length).toBe(2);
  const errors:unknown[]=[],root=hydrateRoot(container,createElement('div',{},createElement(PublicLedgerApp,{active:false,initialSnapshot:seed.snapshot,initialHref:'https://bankeiz.com/ledger/proofs/',initialFilter:'proofs',initialFormat:seed})),{identifierPrefix:'public-ledger-',onRecoverableError:error=>errors.push(error)});
  await new Promise(resolve=>setTimeout(resolve,30));expect(errors).toEqual([]);expect([...container.querySelectorAll('.public-ledger-row')]).toEqual(before);expect(container.textContent).toContain(title);expect(fetch).not.toHaveBeenCalled();root.unmount();
 });
 it('keeps prepared rows in place when the browser uses the WebKit date-time connector',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
  document.body.innerHTML=await renderPreparedDependentDocument(input());const seed=(await readPublicLedgerDocumentSeed())!,container=document.querySelector('#public-ledger-root')!,before=[...container.querySelectorAll('.public-ledger-row')];
  const native=Date.prototype.toLocaleString;vi.spyOn(Date.prototype,'toLocaleString').mockImplementation(function(this:Date,...args){return native.apply(this,args).replace(/, (?=\d{1,2}:\d{2})/,' at ');});
  const errors:unknown[]=[],root=hydrateRoot(container,createElement('div',{},createElement(PublicLedgerApp,{active:false,initialSnapshot:seed.snapshot,initialHref:'https://bankeiz.com/ledger/proofs/',initialFilter:'proofs',initialFormat:seed})),{identifierPrefix:'public-ledger-',onRecoverableError:error=>errors.push(error)});
  try{await new Promise(resolve=>setTimeout(resolve,30));expect(errors).toEqual([]);expect([...container.querySelectorAll('.public-ledger-row')]).toEqual(before);expect(container.querySelector('.public-ledger-event small')?.textContent).toContain(' at ');expect(fetch).not.toHaveBeenCalled();}finally{root.unmount();}
 });
 it('does not mark retained legacy transactions as having completed a newer inspection',async()=>{
  const value=JSON.parse(input().material);value.ledgerCache.inspectionVersion=3;const material=JSON.stringify(value);document.body.innerHTML=await renderPreparedDependentDocument({...input(),material,generation:createHash('sha256').update(material).digest('hex')});expect((await readPublicLedgerDocumentSeed())?.snapshot.inspectionVersion).toBe(3);
 });
 it('retains every public field and explicit coverage anchor through the existing compact Ledger format',()=>{
  const normalized=parsePublicNetworkCache({...cache,records:Array.from({length:4},(_,index)=>({...Object.fromEntries(Object.entries(transaction).filter(([key])=>key!=='privateKey')),id:'wallet:existing-'+index,sourceId:'existing-'+index,details:{chakraDay:'Monday',actionScope:'public',sender:{username:'artist'},fundingCohorts:[]}})),coverage:[{source:'wallet',complete:true,anchorIds:['wallet:existing-0']}]}),packed=publicNetworkCacheWire(normalized);
  expect(parsePublicNetworkCache(packed)).toEqual(normalized);expect(packed.detailContexts.length).toBe(1);
 });
 it('reuses exact historical bytes when a later accepted generation adds only a new Original',async()=>{
  const first=input(true),htmlA=await renderPreparedDependentDocument(first),packet=(html:string)=>JSON.parse(html.match(/<script id="public-ledger-document-seed" type="application\/json">([\s\S]*?)<\/script>/)![1]);
  const a=packet(htmlA),value=JSON.parse(first.material);value.membership.transport.publicMembership.itemCount++;value.membership.transport.publicOriginals.unshift(member('later','Later accepted Original'));const material=JSON.stringify(value),htmlB=await renderPreparedDependentDocument({...first,material,generation:createHash('sha256').update(material).digest('hex')});
  const b=packet(htmlB);expect(b.snapshotGzip[0]).toEqual(a.snapshotGzip[0]);expect(b.snapshotGzip[1]).not.toEqual(a.snapshotGzip[1]);document.body.innerHTML=htmlB;const seed=(await readPublicLedgerDocumentSeed())!;expect(seed.snapshot.records.filter(row=>row.source!=='proofs').map(row=>({evidence:row.evidence,sender:row.sender,recipient:row.recipient}))).toEqual([{evidence:{entryHash:'b'.repeat(64)},sender:'Public sender',recipient:'Public recipient'}]);expect(seed.snapshot.records.filter(row=>row.source==='proofs')).toHaveLength(3);
 });
 it.each(['ledger','ledger/proofs'])('replaces a seeded cold %s document with the complete accepted cohort without another read',async path=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK')),first={...input(true),path},previous=await renderPreparedDependentDocument(first),value=JSON.parse(first.material);
  value.membership.transport.publicOriginals=[member(target,title),member('later','Later accepted Original')];
  const material=JSON.stringify(value),next=await renderPreparedDependentDocument({...first,material,generation:createHash('sha256').update(material).digest('hex'),template:previous});
  document.body.innerHTML=next;const seed=(await readPublicLedgerDocumentSeed())!;
  expect(document.querySelectorAll('#public-ledger-document-seed')).toHaveLength(1);expect(seed.path).toBe(path);
  expect(seed.snapshot.records.filter(row=>row.source==='proofs').map(row=>row.sourceId).sort()).toEqual(['profile:artist:'+target,'profile:artist:later'].sort());
  expect(document.querySelector('#public-ledger-root')?.textContent).toContain(title);expect(document.querySelector('#public-ledger-root')?.textContent).toContain('Later accepted Original');expect(next).not.toContain('Existing proof');
  expect(seed.snapshot.inspectionVersion).toBe(cache.inspectionVersion);expect(seed.snapshot.records.find(row=>row.id==='wallet:existing')?.evidence).toEqual(transaction.evidence);
  const packet=(html:string)=>JSON.parse(html.match(/<script id="public-ledger-document-seed" type="application\/json">([\s\S]*?)<\/script>/)![1]).snapshotGzip[0];expect(packet(next)).toEqual(packet(previous));
  expect(next).not.toContain('MUST_NOT_CARRY');expect(fetch).not.toHaveBeenCalled();
 });
 it('uses the existing bounded gzip fallback and refuses understated or corrupt packets without replacing HTML',async()=>{
  document.body.innerHTML=await renderPreparedDependentDocument(input(true));vi.stubGlobal('DecompressionStream',undefined);expect((await readPublicLedgerDocumentSeed())?.snapshot.records.filter(row=>row.source==='proofs')).toHaveLength(2);
  const element=document.getElementById('public-ledger-document-seed')!,value=JSON.parse(element.textContent!);value.snapshotGzip[0].bytes=1;element.textContent=JSON.stringify(value);expect(await readPublicLedgerDocumentSeed()).toBe(null);expect(document.querySelector('#public-ledger-root')?.textContent).toContain(title);
 });
 it.skipIf(!process.env.BANK_LEDGER_MEMBERSHIP_FIXTURE)('carries the complete selected public Ledger within the existing document capacity',async()=>{
  const preparedLedger=process.env.BANK_LEDGER_PREPARED_FIXTURE?JSON.parse(readFileSync(process.env.BANK_LEDGER_PREPARED_FIXTURE,'utf8')):null;
  const material=JSON.stringify({membership:JSON.parse(readFileSync(process.env.BANK_LEDGER_MEMBERSHIP_FIXTURE!,'utf8')),...(preparedLedger?{preparedLedger}:{ledgerCacheGzipB64u:readFileSync('public/receiz-public-ledger.json.gz.bin').toString('base64url')})});
  const html=await renderPreparedDependentDocument({material,generation:createHash('sha256').update(material).digest('hex'),path:'ledger/proofs',template:readFileSync('dist/ledger/index.html','utf8')});
  document.body.innerHTML=html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');const actualSeed=(await readPublicLedgerDocumentSeed())!;const script=html.match(/<script id="public-ledger-document-seed" type="application\/json">([\s\S]*?)<\/script>/)![1],wires=JSON.parse(script).snapshotGzip.map((packet:{gzipB64u:string})=>JSON.parse(gunzipSync(Buffer.from(packet.gzipB64u,'base64url')).toString())),decoded=actualSeed.snapshot,evidence={ledgerHtmlBytes:Buffer.byteLength(html),seedBytes:Buffer.byteLength(script),contexts:wires.reduce((total:number,wire:{detailContexts:unknown[]})=>total+wire.detailContexts.length,0),records:decoded.records.length,proofs:decoded.records.filter(row=>row.source==='proofs').length,target:decoded.records.filter(row=>row.sourceId.includes(process.env.BANK_LEDGER_TARGET_ID??target)).map(row=>({id:row.id,title:row.title,sourceUrl:row.sourceUrl})),inspectionVersion:decoded.inspectionVersion};
  const retained=parsePublicNetworkCache(JSON.parse(gunzipSync(preparedLedger?Buffer.from(preparedLedger.ledgerCacheGzipB64u,'base64url'):readFileSync('public/receiz-public-ledger.json.gz.bin')).toString())),fields=(row:typeof decoded.records[number])=>({id:row.id,kind:row.kind,title:row.title,detail:row.detail,time:row.time,actor:row.actor,amountUsdCents:row.amountUsdCents,kaiUpulse:row.kaiUpulse,pulse:row.pulse,sourceUrl:row.sourceUrl,evidence:row.evidence,valueOperands:row.valueOperands,details:row.details});
  const canonical=(value:unknown)=>JSON.stringify(value,(_key,part)=>part&&typeof part==='object'&&!Array.isArray(part)?Object.fromEntries(Object.entries(part).sort(([a],[b])=>a.localeCompare(b))):part),expected=new Map(retained.records.filter(row=>row.source!=='proofs').map(row=>[row.id,canonical(fields(row))]));
  const differences=decoded.records.filter(row=>row.source!=='proofs').flatMap(row=>{const wanted=JSON.parse(expected.get(row.id)??'{}'),actual=fields(row),before=actual.valueOperands;const additions=Object.keys(before??{}).filter(key=>!(key in(wanted.valueOperands??{})));if(additions.every(key=>key==='proofValuation'))actual.valueOperands=Object.fromEntries(Object.entries(before??{}).filter(([key])=>key in(wanted.valueOperands??{})));if(canonical(actual)===expected.get(row.id))return [];return [{idSha256:createHash('sha256').update(row.id).digest('hex'),keys:Object.entries(actual).filter(([key,value])=>canonical(value)!==canonical(wanted[key])).map(([key])=>key)}];});
  if(differences.length&&process.env.BANK_LEDGER_CAPACITY_REPORT)writeFileSync(process.env.BANK_LEDGER_CAPACITY_REPORT+'.differences.json',JSON.stringify(differences.slice(0,10)));expect(differences.length).toBe(0);
  expect(evidence.proofs).toBe(JSON.parse(material).membership.transport.publicOriginals.length);if(process.env.BANK_LEDGER_TARGET_ID)expect(evidence.target).toHaveLength(1);if(process.env.BANK_LEDGER_CAPACITY_REPORT)writeFileSync(process.env.BANK_LEDGER_CAPACITY_REPORT,JSON.stringify(evidence,null,2));
  if(preparedLedger)expect(evidence.records).toBe(preparedLedger.diagnostics.recordCount+evidence.proofs);
  expect(Buffer.byteLength(html)).toBeLessThan(32*1024*1024);if(process.env.BANK_LEDGER_TARGET_ID)expect(html.includes(evidence.target[0].title)).toBe(true);
 },20000);
});
