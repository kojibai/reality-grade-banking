// @vitest-environment happy-dom
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import * as renderer from '../server/public-market-document';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {readPublicMarketDocumentSeed} from '../src/receiz/public-market-document-seed';
import historyInput from '../public/receiz-public-share-chart-history.json';
import capInput from '../public/receiz-public-capitalization.json';
const history=parseMarketHistory(historyInput),capitalization=parseMarketCapSource(capInput),receipt='d'.repeat(64);
const rows=Array.from({length:52},(_,i)=>({id:'held-'+i,receizId:'asset-'+i,title:'Held Original '+i,visibility:'public',valueUsd:10,profileOriginal:{mediaKind:i%2?'image':'audio',hasPbiSignature:false}}));
function membership(originals:unknown[]){return{ok:true,transport:{generatedAt:'2026-11-04T20:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:originals.length,revision:'held-'+originals.length},publicOriginals:originals}};}
function render(originals:unknown[]=rows,path='explore'){
 const input=membership(originals),catalog=parsePublicMarket(input),generation=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 return renderer.renderSelectedPublicMarketState({catalog,history,capitalization,asOfPulse:Math.max(history.summary.serverPulse,capitalization.serverPulse),generation,path});
}
function documentFor(state:ReturnType<typeof render>){return new DOMParser().parseFromString('<div id="public-explore-root">'+state.content+'</div>'+state.seedScript,'text/html');}
afterEach(()=>vi.unstubAllGlobals());
it('renders the first 50 held rows while carrying the complete unsigned display family without any read',()=>{
 const fetcher=vi.fn(()=>{throw Error('Static display must not fetch');});vi.stubGlobal('fetch',fetcher);
 const state=render(),doc=documentFor(state),seed=readPublicMarketDocumentSeed(doc)!;
 expect(doc.querySelectorAll('.asset-row')).toHaveLength(50);expect(doc.querySelector('.market-rows')?.textContent).toContain('Held Original 0');expect(doc.querySelector('.market-rows')?.textContent).not.toContain('Held Original 51');
 expect(seed.catalog.items).toHaveLength(52);expect(seed.catalog.items[51].assetId).toBe('asset-51');expect(seed.catalog.items.every(item=>item.authority==='projection-only'&&item.canTrade===false)).toBe(true);
 expect(seed.capitalization).toEqual(capitalization);expect(seed.history).toBeDefined();expect(fetcher).not.toHaveBeenCalled();
});
it('renders appended, signed and withdrawn membership from the selected family without changing older rows',()=>{
 const added={...rows[0],id:'new-held',receizId:'new-asset',title:'New held Original'},appended=render([added,...rows]),signed=render([{...added,profileOriginal:{...added.profileOriginal,hasPbiSignature:true,pbiReceiptHash:receipt}},...rows]),withdrawn=render(rows);
 expect(documentFor(appended).querySelectorAll('.asset-row')).toHaveLength(50);expect(documentFor(appended).querySelector('.asset-row')?.textContent).toContain('New held Original');
 expect(appended.seed.catalog.items).toHaveLength(53);expect(signed.seed.catalog.items[0].pbiReceiptHash).toBe(receipt);expect(signed.seed.catalog.items[1]).toEqual(appended.seed.catalog.items[1]);
 expect(withdrawn.seed.catalog.items).toHaveLength(52);expect(withdrawn.content).not.toContain('New held Original');expect(withdrawn.seed.catalog.items.some(item=>item.id==='new-held')).toBe(false);
});
it('uses the same complete seed for a category while rendering only that category',()=>{
 const state=render(rows,'explore/images'),doc=documentFor(state);
 expect(doc.querySelector('h1')?.textContent).toBe('Images');expect(doc.querySelectorAll('.asset-row')).toHaveLength(26);expect(state.seed.catalog.items).toHaveLength(52);expect(state.seed.path).toBe('explore/images');expect(state.seed.visibleCount).toBe(50);
});
it('refuses incomplete selected display state',()=>{
 const state=render();expect(()=>renderer.renderSelectedPublicMarketState({...state.seed,catalog:{...state.seed.catalog,complete:false},history})).toThrow('PUBLIC_MARKET_RENDER_COMPLETE_REQUIRED');
});
