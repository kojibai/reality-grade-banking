// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {PublicMarketItem} from '../src/receiz/public-market';

// Actual list, preview, reader and document-cache lifetimes, with only the PDF
// transport controlled. No identity, SDK guard, proof admission or custody mock.
const pdf=vi.hoisted(()=>({
 refs:new Map<string,number>(),acquired:[] as string[],released:[] as string[],workers:0,
 tasks:[] as {url:string;destroyed:boolean;resolve:(document:unknown)=>void}[],
}));
vi.mock('pdfjs-dist',()=>({
 GlobalWorkerOptions:{},
 PDFWorker:class {destroyed=false;constructor(){pdf.workers++;}},
 getDocument:({url}:{url:string})=>{
  let resolve!:(document:unknown)=>void;
  const promise=new Promise(value=>{resolve=value;}),task={url,destroyed:false,resolve:(document:unknown)=>resolve(document)};
  pdf.tasks.push(task);
  return {promise,destroy:()=>{task.destroyed=true;return Promise.resolve();}};
 },
}));
vi.mock('../src/receiz/pdf-reader',async importOriginal=>{
 const actual=await importOriginal<typeof import('../src/receiz/pdf-reader')>();
 return {...actual,acquirePdf:(url:string)=>{
  const held=actual.acquirePdf(url);pdf.refs.set(url,(pdf.refs.get(url)??0)+1);pdf.acquired.push(url);let released=false;
  return {...held,release:()=>{if(released)return;released=true;pdf.refs.set(url,pdf.refs.get(url)!-1);pdf.released.push(url);held.release();}};
 }};
});
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>{throw Error('The complete held source must be reused.');}}));
vi.mock('../src/features/market/MarketOverview',()=>({MarketOverview:()=>null}));
vi.mock('../src/features/market/PublicAssetDetail',()=>({PublicAssetDetail:()=>null}));
vi.mock('../src/features/market/MarketFeedPopover',()=>({MarketFeedPopover:()=>null}));
vi.mock('../src/public-explorer/PublicAssetTradeHost',()=>({PublicAssetTradeHost:()=>null}));
import {Market} from '../src/features/market/Market';
import {ProofPdfPreview} from '../src/features/media/ProofPdfPreview';
import {acquirePdf} from '../src/receiz/pdf-reader';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

const observers=new Set<Intersection>();
class Intersection {
 readonly targets=new Set<Element>();
 constructor(readonly callback:IntersectionObserverCallback,readonly options:IntersectionObserverInit){observers.add(this);}
 observe(target:Element){this.targets.add(target);}
 unobserve(target:Element){this.targets.delete(target);}
 disconnect(){this.targets.clear();observers.delete(this);}
 takeRecords(){return [];}
}
async function intersections(entries:{target:Element;near:boolean}[]){
 await act(async()=>{for(const observer of [...observers]){
  const observed=entries.filter(({target})=>observer.targets.has(target)).map(({target,near})=>({target,isIntersecting:near,intersectionRatio:near?1:0}) as IntersectionObserverEntry);
  if(observed.length)observer.callback(observed,observer as unknown as IntersectionObserver);
 }});
}
const intersect=(targets:Element[],near:boolean)=>intersections(targets.map(target=>({target,near})));
let sequence=0;
function item(index:number,isDocument=false):PublicMarketItem{return {
 id:'pressure-'+index,assetId:'pressure-'+index,title:'Held work '+index,summary:'Retained accepted display',category:'proof',mediaKind:isDocument?'pdf':'image',
 artworkUrl:isDocument?null:'https://receiz.com/api/profile/originals/media?receizId=pressure-'+index+'&slot=preview',
 documentUrl:isDocument?'https://receiz.com/api/profile/originals/media?receizId=pressure-'+index+'&slot=preview':null,
 originalDigest:index.toString(16).padStart(64,'0'),priceUsd:5,changePct:null,chart:[],ownerUsername:'artist',sealedAt:'2026-07-15T12:00:00Z',
 sourceUrl:null,verifyUrl:null,originalUrl:null,pulse:null,ownerDisplayName:'Artist',ownerProfileUrl:null,authority:'projection-only',canTrade:false,
};}
async function mount(count:number,isDocument=false){
 history.replaceState({},'','/#market');observers.clear();
 vi.stubGlobal('IntersectionObserver',Intersection);vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}});
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const base=++sequence*1000,items=Array.from({length:count},(_,index)=>item(base+index,isDocument)),catalog={items,complete:true,revision:'held-pressure',sourceCount:count,observedAt:'2026-11-13T12:00:00Z'},source={catalog,historyCatalog:catalog,status:'live',quoteStatus:'fresh',sportsStatus:'retained',error:null,refresh:vi.fn()};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await import('../src/features/media/ProofPdfReader');
 await act(async()=>root.render(<Market source={source as never}/>));
 return {root,host,items,fetcher,catalog,source};
}
const references=()=>[...pdf.refs.values()].reduce((sum,value)=>sum+value,0);
const liveDocuments=()=>pdf.tasks.filter(task=>!task.destroyed);
const idleDocuments=()=>liveDocuments().filter(task=>!(pdf.refs.get(task.url)??0));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();expect(references()).toBe(0);});

it('profiles accumulated DOM while reusing the exact held catalog during deep scroll',async()=>{
 const {root,host,items,fetcher,catalog}=await mount(500);
 try{
  const measurements=[{rows:host.querySelectorAll('.asset-row').length,nodes:host.querySelectorAll('*').length,images:host.querySelectorAll('img').length}];
  const surface=host.firstElementChild,rows=host.querySelector('.market-rows');
  for(let batch=1;batch<10;batch++)await intersect([host.querySelector('.public-market-sentinel')!],true);
  measurements.push({rows:host.querySelectorAll('.asset-row').length,nodes:host.querySelectorAll('*').length,images:host.querySelectorAll('img').length});
  console.info('DEEP_SCROLL_DOM_PROFILE',JSON.stringify(measurements));
  for(const measurement of measurements){expect(measurement.rows).toBeGreaterThan(0);expect(measurement.rows).toBeLessThanOrEqual(catalog.items.length);}
  expect(host.firstElementChild).toBe(surface);expect(host.querySelector('.market-rows')).toBe(rows);
  expect(catalog.items).toBe(items);expect(catalog.items).toHaveLength(500);expect(fetcher).not.toHaveBeenCalled();expect(host.querySelector('dialog')).toBeNull();
 }finally{await act(()=>root.unmount());host.remove();}
});

it('releases far pending readers and bounds the actual idle document cache while scrolling thirty cards',async()=>{
 const {root,host,fetcher,catalog}=await mount(50,true),before=pdf.acquired.length;
 try{
  const cards=[...host.querySelectorAll('.proof-pdf-preview')];expect(cards).toHaveLength(50);
  for(let offset=0;offset<30;offset+=2){
   if(offset)await intersect(cards.slice(offset-2,offset),false);
   await intersect(cards.slice(offset,offset+2),true);
   expect(pdf.acquired.length-before).toBe(offset+2);
  }
  console.info('DEEP_SCROLL_PENDING_PDF_PROFILE',JSON.stringify({nearCards:2,visitedCards:30,activeReferences:references(),cacheDocuments:liveDocuments().length,sharedWorkers:pdf.workers,mountedCanvases:host.querySelectorAll('canvas').length,catalogCount:catalog.items.length}));
  expect(fetcher).not.toHaveBeenCalled();expect(catalog.items).toHaveLength(50);
  expect(references(),'Only the two near cards should retain slow PDF preparations; the accepted catalog stays complete.').toBe(2);
  expect(host.querySelectorAll('canvas')).toHaveLength(2);expect(idleDocuments().length).toBeLessThanOrEqual(4);expect(liveDocuments().length).toBeLessThanOrEqual(6);expect(pdf.workers).toBe(1);
  await intersect(cards.slice(28,30),false);expect(references()).toBe(0);expect(liveDocuments().length).toBeLessThanOrEqual(4);
 }finally{await act(()=>root.unmount());host.remove();}
});

it('uses the last proximity entry for a frame when rapid scrolling batches enter and leave',async()=>{
 const {root,host}=await mount(2,true),before=pdf.acquired.length;
 try{
  const card=host.querySelector('.proof-pdf-preview')!;
  const observer=[...observers].find(observer=>observer.targets.has(card))!;expect(observer.options.rootMargin).toBe('500px');
  await intersections([{target:card,near:true},{target:card,near:false}]);expect(pdf.acquired.length).toBe(before);expect(host.querySelector('canvas')).toBeNull();
  await intersections([{target:card,near:false},{target:card,near:true}]);expect(pdf.acquired.length).toBe(before+1);expect(host.querySelectorAll('canvas')).toHaveLength(1);
  await intersect([card],false);expect(references()).toBe(0);expect(host.querySelector('canvas')).toBeNull();
 }finally{await act(()=>root.unmount());host.remove();}
});

it('keeps a document alive for an explicitly open reader while far preview references are released',async()=>{
 const {root,host}=await mount(30,true);let opened:ReturnType<typeof acquirePdf>|undefined;
 try{
  const cards=[...host.querySelectorAll('.proof-pdf-preview')];await intersect([cards[0]],true);
  const url=pdf.acquired.at(-1)!;opened=acquirePdf(url);const pinned=liveDocuments().find(task=>task.url===url)!;
  for(let offset=1;offset<20;offset++){
   await intersect([cards[offset-1]],false);await intersect([cards[offset]],true);
  }
  expect(pdf.refs.get(url)).toBe(1);expect(pinned.destroyed).toBe(false);expect(references()).toBe(2);expect(host.querySelectorAll('canvas')).toHaveLength(1);
  expect(idleDocuments().length).toBeLessThanOrEqual(4);expect(liveDocuments().length).toBeLessThanOrEqual(6);expect(pdf.workers).toBe(1);
 }finally{await act(()=>root.unmount());host.remove();opened?.release();}
});

it('retains a completed cover through viewport exit and remount without another document preparation or fetch',async()=>{
 const {root,host,fetcher}=await mount(1,true);
 vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(52);
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/webp;base64,SYNTHETIC_COVER');
 try{
  const card=host.querySelector('.proof-pdf-preview')!;await intersect([card],true);
  const url=pdf.acquired.at(-1)!,task=liveDocuments().find(task=>task.url===url)!;
  await act(async()=>task.resolve({numPages:1,getPage:async()=>({getViewport:({scale}:{scale:number})=>({width:100*scale,height:140*scale}),render:()=>({promise:Promise.resolve(),cancel:()=>{}})})}));
  const cover=host.querySelector<HTMLImageElement>('.proof-pdf-preview>img')!;expect(cover?.src).toBe('data:image/webp;base64,SYNTHETIC_COVER');
  const prepared=pdf.acquired.length;expect(references()).toBe(0);expect(host.querySelector('canvas')).toBeNull();
  expect([...observers].some(observer=>observer.targets.has(card))).toBe(false);
  await intersect([card],false);await intersect([card],true);expect(host.querySelector('.proof-pdf-preview>img')).toBe(cover);expect(pdf.acquired).toHaveLength(prepared);
  await act(()=>root.render(<ProofPdfPreview url={url} title="Held work" cacheKey={'market:'+item(sequence*1000,true).id+':'+item(sequence*1000,true).originalDigest}/>));
  const cachedFrame=host.querySelector('.proof-pdf-preview')!;
  expect([...observers].some(observer=>observer.targets.has(cachedFrame))).toBe(false);
  await intersect([cachedFrame],false);await intersect([cachedFrame],true);
  expect(host.querySelector<HTMLImageElement>('img')?.src).toBe(cover.src);expect(pdf.acquired).toHaveLength(prepared);expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(()=>root.unmount());host.remove();}
});
