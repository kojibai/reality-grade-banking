// @vitest-environment happy-dom
import {act} from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {renderAssetFirstFrame,renderBookingFirstFrame,renderVerificationFirstFrame} from '../server/public-first-frames';
import {handleAssetPreview} from '../server/asset-preview';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import {compactReceiptLink} from '../src/receiz/receipt-sharing';
import {receiptLink} from '../src/receiz/ledger-receipts';
import {handleReceiptPreview} from '../server/receipt-preview';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {createdAssetHasHeldSignature,retainCreatedAssetResult} from '../src/features/assets/created-asset-state';
import type {HeldDeposit} from '../src/receiz/deposit-source';

const state=vi.hoisted(()=>({roots:[] as Array<{unmount():void}>,hydrated:0,created:0}));
vi.mock('react-dom/client',async original=>{const runtime=await original<typeof import('react-dom/client')>();return {...runtime,hydrateRoot:(...args:Parameters<typeof runtime.hydrateRoot>)=>{state.hydrated++;const root=runtime.hydrateRoot(...args);state.roots.push(root);return root;},createRoot:(...args:Parameters<typeof runtime.createRoot>)=>{state.created++;const root=runtime.createRoot(...args);state.roots.push(root);return root;}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const frame={locale:'en-US',timeZone:'UTC',pulse:14810000};
const template='<html><head></head><body><div id="public-explore-root" data-public-runtime="explore"></div><script id="receiz-navigation" type="application/json">{"pages":{}}</script></body></html>';
function install(html:string){const parsed=new DOMParser().parseFromString(html,'text/html');document.body.replaceChildren(...[...parsed.body.childNodes].map(node=>document.importNode(node,true)));}
beforeEach(()=>{state.hydrated=0;state.created=0;vi.stubGlobal('Worker',undefined);vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(()=>{})));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});});
afterEach(async()=>{await act(()=>{for(const root of state.roots.splice(0))root.unmount();});document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('serves and hydrates the actual selected asset without a catalog read or an intermediate preview',async()=>{
 const item=parsePublicProfile(profileFixture(),'alexmorgan').items[0],content=renderAssetFirstFrame(item,frame),document={schema:'bank.public-asset.first-frame.v1' as const,item,frame,content},read=vi.fn(()=>{throw Error('CATALOG_READ_FORBIDDEN');});
 const response=await handleAssetPreview(new Request('https://bankeiz.com/asset/'+encodeURIComponent(item.id)+'/',{headers:{accept:'text/html','user-agent':'Browser'}}),{document:async()=>document,page:async()=>template,item:read,image:vi.fn()});
 const html=await response.text();expect(response.status).toBe(200);expect(html).not.toContain('public-entry-placeholder');expect(html).toContain('class="public-asset-page"');expect(read).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 history.replaceState(null,'','/asset/'+encodeURIComponent(item.id)+'/');install(html);const page=documentNode('.public-asset-page'),heading=documentNode('.asset-detail-heading');
 const errors=vi.spyOn(console,'error');await act(async()=>{const main=await import('../src/public-explorer/main');await main.mountPublicDocument();});
 expect(documentNode('.public-asset-page')).toBe(page);expect(documentNode('.asset-detail-heading')).toBe(heading);expect(state.hydrated).toBe(1);expect(state.created).toBe(0);expect(errors.mock.calls.filter(call=>/hydrat|didn't match|server rendered/i.test(String(call[0])))).toEqual([]);
});
function documentNode(selector:string){const node=document.querySelector(selector);expect(node).not.toBeNull();return node!;}

it('puts the real receipt in the response and hydrates it from that same carried packet',async()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'first-frame-payment',kind:'chat_transfer',summary:'A held payment',amountUsdCents:'12500',pulse:'14800000',sender:{displayName:'Alex'},recipient:{displayName:'Sam'}}]}).records[0],url=compactReceiptLink(receiptLink(row)!);
 const response=await handleReceiptPreview(new Request(url),{page:async()=>template.replaceAll('public-explore-root','public-receipt-root').replace('data-public-runtime="explore"','data-public-runtime="receipt"'),image:vi.fn()}),html=await response.text();
 expect(response.status).toBe(200);install(html);expect(documentNode('.receipt-value h1').textContent).toBe('$125.00');const receipt=documentNode('.transaction-receipt');expect(fetch).not.toHaveBeenCalled();
 const link=new URL(url);history.replaceState(null,'',link.pathname+link.search);const errors=vi.spyOn(console,'error');await act(async()=>{await import('../src/receipts/main');});
 expect(documentNode('.transaction-receipt')).toBe(receipt);expect(state.hydrated).toBe(1);expect(state.created).toBe(0);expect(fetch).not.toHaveBeenCalled();expect(errors.mock.calls.filter(call=>/hydrat|didn't match|server rendered/i.test(String(call[0])))).toEqual([]);
});

it('hydrates the real verification picker without implying a verified result or opening an account',async()=>{
 history.replaceState(null,'','/verify/');install('<div id="public-verify-root" data-public-runtime="verify" data-public-verify-rendered>'+renderVerificationFirstFrame()+'</div><script id="receiz-navigation" type="application/json">{}</script>');
 const picker=documentNode('[aria-label="Shared account proof file"]');expect(document.body.textContent).toContain('See the proof.');expect(fetch).not.toHaveBeenCalled();await act(async()=>{await import('../src/verification/main');});
 expect(documentNode('[aria-label="Shared account proof file"]')).toBe(picker);expect(state.hydrated).toBe(1);expect(state.created).toBe(0);expect(fetch).not.toHaveBeenCalled();
});

it('hydrates the actual static booking frame while only the missing availability remains pending',async()=>{
 history.replaceState(null,'','/book/alexmorgan/');install('<div id="root" data-public-booking-rendered>'+renderBookingFirstFrame('alexmorgan')+'</div>');
 const heading=documentNode('.booking-lead'),card=documentNode('.booking-card');expect(document.body.textContent).not.toContain('Preparing this calendar');expect(fetch).not.toHaveBeenCalled();await act(async()=>{await import('../src/features/booking/main');});
 expect(documentNode('.booking-lead')).toBe(heading);expect(documentNode('.booking-card')).toBe(card);expect(state.hydrated).toBe(1);expect(state.created).toBe(0);expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/bank/booking/alexmorgan',expect.objectContaining({method:'GET'}));
});

it('retains a known signature only for the same source and owner without changing exact proof bytes',()=>{
 const result={digest:'b'.repeat(64),bytes:new Uint8Array([1,2,3]),title:'Held Original',filename:'original.png',kind:'proof',status:'held-proof',pulse:'14800000'} as HeldDeposit,item={...parsePublicProfile(profileFixture(),'alexmorgan').items[0],originalDigest:result.digest,hasPbiSignature:true,pbiReceiptHash:'e'.repeat(64),admittedOwnerUserId:'bound-owner'};
 expect(createdAssetHasHeldSignature(result,item,'alexmorgan',item.admittedOwnerUserId)).toBe(true);expect(createdAssetHasHeldSignature(result,{...item,originalDigest:'c'.repeat(64)},'alexmorgan',null)).toBe(false);expect(createdAssetHasHeldSignature(result,item,'another',null)).toBe(false);expect(createdAssetHasHeldSignature(result,item,'alexmorgan',null)).toBe(false);expect(createdAssetHasHeldSignature(result,item,'alexmorgan','another-owner')).toBe(false);
 const signed={...result,pbiSigned:true,marketPublication:{status:'published' as const}},retained=retainCreatedAssetResult(signed,result);expect(retained.pbiSigned).toBe(true);expect(retained.marketPublication?.status).toBe('published');expect(retained.bytes).toBe(result.bytes);expect(retainCreatedAssetResult(signed,{...result,digest:'c'.repeat(64)}).pbiSigned).toBeUndefined();
});
