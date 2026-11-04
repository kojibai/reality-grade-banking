// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {IncomingMessage,ServerResponse} from 'node:http';
import captured from './fixtures/created-original-public.json';
import {publicMarketMiddleware} from '../server/public-market';
import {mergePublicProofQuotes,parsePublicNetworkPage,publicMarketRecord,PUBLIC_SOURCES,type PublicRecord} from '../src/receiz/public-network';
import {parsePublicOriginal} from '../src/receiz/public-profile';
import {readLedgerDetails} from '../src/receiz/ledger-inspection';
import {completeLedgerReceipt,readLedgerReceipt,readReceiptLink,receiptLink} from '../src/receiz/ledger-receipts';
import {readPublicAssetTrade,closePublicAssetTrade} from '../src/receiz/public-asset-trade';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {Ledger} from '../src/features/ledger/Ledger';
import {LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {fetchPublicQuotes} from '../src/receiz/public-market';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
const held=vi.hoisted(()=>({records:[] as PublicRecord[]}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:held.records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',complete:true,busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh:()=>{},loadMore:()=>{}})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{closePublicAssetTrade();vi.unstubAllGlobals();vi.restoreAllMocks();});
const item=()=>parsePublicOriginal({ok:true,viewer:{profile:captured.profile,originals:[captured.original]}},captured.profile.username,captured.original.id);
it('preserves the exact Original reader presence without exposing its complete text in the selected public viewer',()=>{
 const selected=item();expect(selected.hasLongForm).toBe(true);expect(selected.carriedText).toBeUndefined();expect(selected.readingUrl).toBe(captured.original.verifyUrl);
});
it('carries the captured target through the real public membership curator, Ledger parser and full receipt without losing the public proof presentation',async()=>{
 const original=captured.original,raw={id:`profile:bjklock:${original.id}`,receizId:original.id,title:original.assetTitle,summary:original.claim,ownerUsername:'bjklock',ownerDisplayName:captured.profile.displayName,ownerAvatarUrl:captured.profile.avatarUrl,ownerUserId:captured.profile.userId,ownerCreatedAt:captured.profile.createdAt,canonicalHref:`https://receiz.com/bjklock/verified/${original.id}`,verifyHref:original.verifyUrl,pulse:original.pulse,createdAt:original.createdAt,valueUsd:original.marketPreview.priceUsd,livePulseSeed:original.marketPreview.livePulseSeed,profileOriginal:original};
 const fetcher=vi.fn(async()=>Response.json({ok:true,transport:{generatedAt:'2026-11-04T15:00:00Z',publicOriginals:[raw]}}));vi.stubGlobal('fetch',fetcher);let body='';
 await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/membership?afterPublication='+original.importedSource.reference.artifactSha256}as IncomingMessage,{setHeader:vi.fn(),writeHead:vi.fn(),end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());
 const [record]=parsePublicNetworkPage('proofs',JSON.parse(body)).records,asset=record.details?.publicAsset as Record<string,unknown>|undefined;
 expect(asset).toMatchObject({id:raw.id,assetId:original.id,title:original.assetTitle,mediaKind:'image',originalDigest:original.importedSource.reference.artifactSha256,hasLongForm:true,verifyUrl:original.verifyUrl,originalCreator:{username:'bjklock'},sourceProvenance:{payloadSha256:original.importedSource.payloadSha256}});
 expect(asset?.artworkUrl).toContain('payload=1');expect((asset?.proofManifestSource as any)?.media?.sha256Hex.toLowerCase()).toBe(original.media.sha256Hex);
 const receipt=readLedgerReceipt(completeLedgerReceipt(record));expect(receipt.details?.publicAsset).toEqual(asset);expect(readReceiptLink(receiptLink(record)!).details?.publicAsset).toEqual(asset);expect(readLedgerDetails(record.details).publicAsset).toBe(asset);expect(Object.isFrozen(asset)).toBe(true);expect(fetcher).toHaveBeenCalledOnce();expect(body).not.toContain('"text":');
});
it('renders the same complete target proof in both Ledger routes without reading or claiming missing share operands',async()=>{
 const selected=item();held.records=[publicMarketRecord(selected)];const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  for(const surface of [<PublicLedgerApp active={false}/>,<Ledger active={false}/>]){
   await act(async()=>root.render(surface));await act(async()=>(host.querySelector('.public-ledger-event,.ledger-row-main .asset-row')as HTMLButtonElement).click());
   expect(host.querySelector('.proof-image-view img')?.getAttribute('src')??host.querySelector('.proof-object-artwork img')?.getAttribute('src')).toContain('payload=1');
   expect(host.querySelector('[aria-label="Read full text"]')).not.toBeNull();expect(host.textContent).toContain('Share quantities appear when the existing share records are available.');expect(host.querySelector('.share-inventory')).not.toBeNull();
   expect(host.querySelector('a[aria-label="Open full receipt"]')).not.toBeNull();await act(async()=>(host.querySelector('[aria-label="Show proof material"]')as HTMLButtonElement).click());
   expect(host.textContent?.toLowerCase()).toContain(captured.original.claimHashHex);expect(host.textContent?.toLowerCase()).toContain(captured.original.media.sha256Hex);expect(host.textContent).toContain(captured.original.proof.poseidon);expect(host.textContent).toContain(captured.original.importedSource.sourceProofHead);expect(host.textContent).toContain('Creator');
   const inspect=[...host.querySelectorAll('a')].find(link=>link.textContent?.includes('Inspect proof'));expect(inspect?.href).toBe(captured.original.verifyUrl);
   await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Buy ownership')!.click());expect(readPublicAssetTrade()).toMatchObject({itemId:selected.id,side:'buy'});closePublicAssetTrade();
  }
  expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());host.remove();}
});
it('retains an existing compatible share observation in the full proof receipt and rejects a substituted item under the same Ledger record',async()=>{
 const selected=item(),shareInventory={schema:'receiz.market.share-inventory.v1' as const,marketItemId:selected.id,assetId:selected.assetId,family:'generic' as const,quantityScope:'canonical-asset' as const,observedAtKaiUPulse:'14989047000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'9000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity' as const};
 const record=publicMarketRecord({...selected,shareInventory});expect((completeLedgerReceipt(record).details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);
 const original=captured.original,membership={ok:true,transport:{publicOriginals:[{id:selected.id,receizId:selected.assetId,title:selected.title,pulse:selected.pulse,profileOriginal:original}]},snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:selected.id,visibility:'public',priceUsd:231.55,shareInventory}]}}};
 expect((parsePublicNetworkPage('proofs',membership).records[0].details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);
 const substituted={...record,details:readLedgerDetails({...record.details,publicAsset:{...selected,id:'different-market-item'}})},host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<LedgerInspector record={substituted} value={ledgerValueForRecord(substituted)}/>));expect(host.querySelector('.asset-detail-heading')).toBeNull();}finally{act(()=>root.unmount());}
});

it('renders the held target immediately while a cold quote read is pending or unavailable',async()=>{
 held.records=[publicMarketRecord(item())];let reply!:(response:Response)=>void;const fetcher=vi.fn(()=>new Promise<Response>(resolve=>reply=resolve));vi.stubGlobal('fetch',fetcher);const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(async()=>root.render(<PublicLedgerApp/>));await act(async()=>(host.querySelector('.public-ledger-event')as HTMLButtonElement).click());expect(host.querySelector('.proof-image-view img,.proof-object-artwork img')).not.toBeNull();expect(host.textContent).toContain('Share quantities appear when');await act(async()=>reply(new Response('',{status:503})));expect(host.querySelector('.proof-image-view img,.proof-object-artwork img')).not.toBeNull();expect(host.textContent).toContain('Share quantities appear when');expect(fetcher).toHaveBeenCalledOnce();}finally{act(()=>root.unmount());host.remove();}
});
it('hydrates the exact held target in both Ledger roots and their full receipts from one existing public quote read',async()=>{
 const selected=item(),record=publicMarketRecord(selected),shareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:selected.id,assetId:selected.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14989047000000',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'9000000',positionsMicro:'0',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity'};
 const snapshot={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[{itemId:selected.id,assetId:selected.assetId,visibility:'public',priceUsd:231.55,shareInventory}]}},fetcher=vi.fn(async()=>Response.json(snapshot));vi.stubGlobal('fetch',fetcher);
 const [quoted]=mergePublicProofQuotes([record],snapshot);expect((quoted.details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);expect(quoted.valueOperands).toBe(record.valueOperands);expect(quoted.evidence).toBe(record.evidence);expect((completeLedgerReceipt(quoted).details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);
 const empty={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}};expect((mergePublicProofQuotes([record],empty,[quoted])[0].details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);
 const wrong={...snapshot,data:{...snapshot.data,liveMarkets:[{...snapshot.data.liveMarkets[0],assetId:'substitute'}]}};expect(mergePublicProofQuotes([record],wrong)[0]).toBe(record);
 const collision={...record,id:'actions:collision',source:'actions' as const};expect(mergePublicProofQuotes([record,collision],snapshot)[1]).toBe(collision);
 const substituted={...record,evidence:{artifactDigest:'a'.repeat(64)}};expect(mergePublicProofQuotes([substituted],snapshot)[0]).toBe(substituted);expect(mergePublicProofQuotes([record,{...substituted,id:'proofs:substituted'}],snapshot)[1]).toEqual({...substituted,id:'proofs:substituted'});
 const different=publicMarketRecord({...selected,assetId:'other-asset',originalDigest:'b'.repeat(64),pulse:'14955303'});different.id='proofs:internally-bound-other';expect(mergePublicProofQuotes([record,different],snapshot)[0]).toBe(record);
 const unknown={...snapshot,data:{...snapshot.data,liveMarkets:[{...snapshot.data.liveMarkets[0],shareInventory:{...shareInventory,availableShareQuantityMicro:null}}]}};expect((mergePublicProofQuotes([record],unknown)[0].details?.publicAsset as any)?.shareInventory.availableShareQuantityMicro).toBeNull();
 const older={...snapshot,data:{...snapshot.data,liveMarkets:[{...snapshot.data.liveMarkets[0],shareInventory:{...shareInventory,observedAtKaiUPulse:'14989046000000',outstandingShareQuantityMicro:'1000000',positionsMicro:'1000000'}}]}};expect((mergePublicProofQuotes([record],older,[quoted])[0].details?.publicAsset as any)?.shareInventory.outstandingShareQuantityMicro).toBe('0');
 held.records=[record];await fetchPublicQuotes();const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{for(const surface of [<PublicLedgerApp active={false}/>,<Ledger active={false}/>]){
  await act(async()=>root.render(surface));await act(async()=>(host.querySelector('.public-ledger-event,.ledger-row-main .asset-row')as HTMLButtonElement).click());
  expect(host.textContent).not.toContain('Share quantities appear when');expect(host.textContent).toContain('Outstanding');
  const link=host.querySelector('a[aria-label="Open full receipt"]')as HTMLAnchorElement;expect((readReceiptLink(link.href).details?.publicAsset as any)?.shareInventory).toEqual(shareInventory);
 }expect(fetcher).toHaveBeenCalledOnce();}finally{act(()=>root.unmount());host.remove();}
});
