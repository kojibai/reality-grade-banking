// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CollectionPanel} from '../src/features/collectibles/CollectionPanel';
import type {HeldCollection,HeldCollectible} from '../src/receiz/collectibles';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const cleanups:Array<()=>void>=[];
afterEach(()=>{cleanups.splice(0).forEach(cleanup=>cleanup());vi.unstubAllGlobals();vi.restoreAllMocks();});
const card:HeldCollectible={id:'sports:rsc_0123456789abcdef',family:'sports',collectibleId:'rsc_0123456789abcdef',claimHash:'a'.repeat(64),title:'A player',ownerUserId:'owner',taxonomy:['Sports','Baseball','Gold'],artworkUrl:null,rarity:'Gold',publiclyVisible:true,listing:null,value:null,facts:[{label:'Rating',value:'88'},{label:'Variant issue number',value:'7'}],source:{},claim:{},asset:{ownershipHistory:[{kind:'transfer',fromUsername:'first',toUsername:'owner'}]},appends:[],acquisitions:[],capabilities:[]};
async function mount(){
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),close=vi.fn();
 const collection:HeldCollection={status:'ready',accountUserId:'owner',cards:[card]};
 await act(async()=>root.render(<CollectionPanel collection={collection} onClose={close}/>));
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===label||button.textContent===label);expect(button,`button ${label}`).toBeTruthy();await act(async()=>button!.click());};
 return {host,close,fetcher,click};
}
it('navigates held categories, detail and the original back record without reading or pricing anything again',async()=>{
 const f=await mount();await f.click('Sports');await f.click('Baseball');await f.click('Open A player');
 expect(f.host.textContent).toContain('Rating');expect(f.host.textContent).toContain('88');
 expect(f.host.textContent).not.toContain('$0');expect(f.host.querySelector('[aria-label="Close"]')).toBeNull();
 await f.click('View back');expect(f.host.querySelector('[data-card-face=back]')?.getAttribute('aria-hidden')).toBe('false');
 expect(f.host.textContent).toContain(card.claimHash);await f.click('Go back');
 expect(f.host.querySelector('[data-collection-catalog]')).not.toBeNull();expect(f.fetcher).not.toHaveBeenCalled();expect(f.close).not.toHaveBeenCalled();
});
it('uses one back control to leave the collection, keeps unavailable actions absent and preserves disclosure until opened',async()=>{
 const f=await mount();await f.click('Open A player');expect(f.host.querySelector('[data-ownership-history]')).toBeNull();
 const disclosure=[...f.host.querySelectorAll('details')].find(details=>details.querySelector('summary')?.textContent==='Ownership & provenance')!;
 await act(async()=>{disclosure.open=true;disclosure.dispatchEvent(new Event('toggle'));});
 expect(f.host.textContent).toContain('first');expect(f.host.querySelector('[data-ownership-history]')).not.toBeNull();
 expect([...f.host.querySelectorAll('button')].some(button=>button.textContent==='Send')).toBe(false);
 await f.click('Go back');await f.click('Go back');expect(f.close).toHaveBeenCalledOnce();expect(f.fetcher).not.toHaveBeenCalled();
});
it('renders native Sports settlement and nested Signal ownership appends as rich details',async()=>{
 const sports={eventKind:'sale',at:'2026-10-27T01:00:00Z',priceUsdCents:'250000',settlementPhiMicro:'1250000',fromUserId:'seller-account',toUserId:'buyer-account'};
 const signal={appendKind:'transfer',createdAtMs:1793062800000,payload:{kind:'transfer',fromOwnerFingerprint:'prior-owner',toOwnerFingerprint:'new-owner',ownershipRule:'native ownership rule'}};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 await act(async()=>root.render(<CollectionPanel collection={{status:'ready',accountUserId:'owner',cards:[{...card,asset:{ownershipHistory:[sports],appends:[signal]}}]}} onClose={()=>{}}/>));
 await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open A player"]')!.click());
 const details=[...host.querySelectorAll('details')].find(details=>details.querySelector('summary')?.textContent==='Ownership & provenance')!;
 await act(async()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});
 for(const text of ['$2,500.00','1.25 Φ','seller-account','buyer-account','prior-owner','new-owner','native ownership rule'])expect(host.textContent).toContain(text);
});
it('keeps gallery pages bounded instead of accumulating every held card',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 cleanups.push(()=>{act(()=>root.unmount());host.remove();});
 const cards=Array.from({length:170},(_,index)=>({...card,id:`card-${index}`,title:`Card ${index}`}));
 await act(async()=>root.render(<CollectionPanel collection={{status:'ready',accountUserId:'owner',cards}} onClose={()=>{}}/>));
 for(let index=0;index<4;index++){
  expect(host.querySelectorAll('.collection-tile').length).toBeLessThanOrEqual(40);
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Next collection page"]')!.click());
 }
 expect(host.querySelectorAll('.collection-tile')).toHaveLength(10);expect(host.textContent).toContain('Card 169');
 expect(host.querySelector<HTMLButtonElement>('[aria-label="Next collection page"]')!.disabled).toBe(true);
});
