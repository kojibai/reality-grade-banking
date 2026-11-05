import {expect,it,vi} from 'vitest';
import {handlePreparedPublicDocument} from '../server/prepared-public-document';
import {handlePreparedPublicMarket} from '../server/prepared-public-market';
import {renderPreparedBankDocument} from '../server/public-market-document';
import {createPreparedBankCatalogReader} from '../src/receiz/prepared-bank-catalog';
import {createHash} from 'node:crypto';
import historyInput from '../public/receiz-public-share-chart-history.json';
import capInput from '../public/receiz-public-capitalization.json';
it('serves the saved current document directly, without rendering or reading the historical entry',async()=>{
 const prepared=vi.fn(async()=>new Response('Current saved entry',{headers:{'x-receiz-public-html-state':'current'}})),entry=vi.fn();
 const result=await handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page?path=bank'),{prepared,entry});
 expect(await result.text()).toBe('Current saved entry');expect(entry).not.toHaveBeenCalled();expect(prepared).toHaveBeenCalledOnce();
});
it('preserves the exact opening document when public preparation is unavailable without labelling it current',async()=>{
 const bytes=new TextEncoder().encode('<html>Exact existing account opening and frozen runtime</html>'),entry=vi.fn(async()=>bytes);
 const result=await handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page?path=bank&resumeCardSession=private-coordinate',{headers:{cookie:'private-device-context',authorization:'private-token'}}),{prepared:async request=>{
  const url=new URL(request.url);expect(url.pathname).toBe('/api/explore');expect([...url.searchParams]).toEqual([['path','bank']]);expect(request.headers.has('cookie')).toBe(false);expect(request.headers.has('authorization')).toBe(false);return new Response(null,{status:503});
 },entry});
 expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);expect(result.status).toBe(200);expect(result.headers.get('x-receiz-public-html-state')).toBe('historical');expect(result.headers.has('x-receiz-public-material-revision')).toBe(false);expect(entry).toHaveBeenCalledExactlyOnceWith('bank');
});
it('does not substitute all activity for an unavailable Proofs document, or prepare on an invalid request',async()=>{
 const entry=vi.fn(async()=>{throw Error('No physical Proofs view');}),prepared=vi.fn(async()=>new Response(null,{status:503}));
 expect((await handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page?path=ledger/proofs'),{prepared,entry})).status).toBe(503);
 for(const url of ['?path=../index','?path=bank&path=ledger'])expect((await handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page'+url),{prepared,entry})).status).toBe(404);
 expect((await handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page?path=bank',{method:'POST'}),{prepared,entry})).status).toBe(405);expect(prepared).toHaveBeenCalledOnce();
});
it('does not deliver late prepared or fallback HTML after the incoming navigation is cancelled',async()=>{
 const controller=new AbortController(),entry=vi.fn(),prepared=vi.fn(async()=>{controller.abort(Error('Navigation cancelled'));return new Response('Late response');});
 await expect(handlePreparedPublicDocument(new Request('https://bankeiz.com/api/public-page?path=bank',{signal:controller.signal}),{prepared,entry})).rejects.toThrow('Navigation cancelled');expect(entry).not.toHaveBeenCalled();
});
it('lets held browser code read relative bank data from current server C while Source stays explicitly build-pinned',async()=>{
 const build='c'.repeat(64),material=JSON.stringify({membership:{ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'current-C'},publicOriginals:[{id:'synthetic-server-current-original',receizId:'synthetic-server-current-original',title:'Current C',valueUsd:250}]}},capitalization:capInput,history:historyInput,marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:Math.max(historyInput.summary.serverPulse,capInput.marketCapProjection.serverPulse)}}),generation=createHash('sha256').update(material).digest('hex');
 const html=await renderPreparedBankDocument({material,generation,path:'bank',template:''}),headers={'content-type':'text/html; charset=utf-8','x-receiz-public-material-revision':generation,'x-receiz-public-render-build':build,'x-receiz-public-html-sha256':createHash('sha256').update(html).digest('hex'),'x-receiz-public-html-state':'current','x-receiz-public-state-coordinate':'e'.repeat(64)};
 const prepared=vi.fn(async(method:'GET'|'HEAD',_path:string,_build:string)=>new Response(method==='HEAD'?null:html,{headers})),render=vi.fn();
 const browserRead=vi.fn(async(path:string,init:RequestInit)=>handlePreparedPublicMarket(new Request('https://bankeiz.com'+path,init),{prepared,render,build})),heldBrowser=createPreparedBankCatalogReader(browserRead);
 const first=await heldBrowser.read();expect(first?.seed.catalog.items[0].title).toBe('Current C');expect(first?.receipt.build).toBe(build);expect(await heldBrowser.read()).toBe(first);
 expect(browserRead.mock.calls.every(([path])=>path==='/api/explore?path=bank')).toBe(true);expect(prepared.mock.calls.map(([method,path,selectedBuild])=>[method,path,selectedBuild])).toEqual([['GET','bank',build],['HEAD','bank',build]]);expect(render).not.toHaveBeenCalled();
});
