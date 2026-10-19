// @vitest-environment happy-dom
// UI consent state only. These projections are NOT verifier qualification.
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi,afterEach} from 'vitest';
import {LedgerCrystalSave,LedgerProofControls} from '../src/public-ledger/LedgerProofControls';
vi.mock('@receiz/sdk',()=>({receizBase64UrlEncode:()=> 'synthetic-ui-only'}));
const values=vi.hoisted(()=>({older:{kind:'ledger',artifactSha256:'a'.repeat(64),kaiPulse:'10',snapshot:{records:[],baseline:'native'}},newer:{kind:'ledger',artifactSha256:'b'.repeat(64),kaiPulse:'11',snapshot:{records:[],baseline:'native'}}}));
vi.mock('../src/receiz/public-ledger-proof',()=>({inspectPublicLedgerFile:vi.fn(async()=>values.older),openPublicLedgerSource:vi.fn(async()=>values.older),heldPublicLedgerFile:()=>({bytes:new Uint8Array([1,2,3]),filename:'original.receiz'})}));
vi.mock('../src/receiz/public-ledger-retention',()=>({retainPublicLedgerReview:vi.fn(async()=>values.newer),readRetainedPublicLedger:vi.fn(async()=>values.newer)}));
vi.mock('../src/receiz/public-network-cache',()=>{const save=vi.fn(async(_cache:unknown)=>true);return {loadPublicNetworkCache:vi.fn(async()=>null),savePublicNetworkCache:save,savePublicLedgerDisplayCache:(_review:unknown,cache:unknown)=>save(cache)};});
vi.mock('../src/receiz/public-ledger-crystal-image',()=>({createPublicLedgerCrystal:vi.fn(async()=>({bytes:new Uint8Array([1]),filename:'ledger.png'}))}));
import {createPublicLedgerCrystal} from '../src/receiz/public-ledger-crystal-image';
import {inspectPublicLedgerFile,openPublicLedgerSource} from '../src/receiz/public-ledger-proof';
import {retainPublicLedgerReview,readRetainedPublicLedger} from '../src/receiz/public-ledger-retention';
import {loadPublicNetworkCache,savePublicNetworkCache} from '../src/receiz/public-network-cache';
import {synchronizePublicLedger} from '../src/receiz/public-ledger-continuity';
afterEach(()=>{vi.restoreAllMocks();vi.mocked(retainPublicLedgerReview).mockReset().mockResolvedValue(values.newer as never);vi.mocked(readRetainedPublicLedger).mockReset().mockResolvedValue(values.newer as never);vi.mocked(inspectPublicLedgerFile).mockReset().mockResolvedValue(values.older as never);vi.mocked(openPublicLedgerSource).mockReset().mockResolvedValue(values.older as never);vi.mocked(createPublicLedgerCrystal).mockClear();vi.mocked(loadPublicNetworkCache).mockReset().mockResolvedValue(null);vi.mocked(savePublicNetworkCache).mockReset().mockResolvedValue(true);});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('observes global originals and polls the action source even when discovery count is unchanged, without publishing',async()=>{
 const first={artifactSha256:'c'.repeat(64),kind:'proof',kaiPulse:'12'},second={artifactSha256:'d'.repeat(64),kind:'proof',kaiPulse:'13'};let count=1;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const url=new URL(String(input),'https://bankeiz.com');if(url.searchParams.has('discovery')){const cursor=Number(url.searchParams.get('cursor')??0);return Response.json({count,entries:cursor===0?[first]:count===2&&cursor===1?[second]:[],nextCursor:null});}return Response.json({source:'transport-only'});});
 vi.mocked(openPublicLedgerSource).mockClear();
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));expect(host.querySelector(`a[href="/ledger/?source=${first.artifactSha256}"]`)).not.toBeNull();count=2;
  await act(async()=>window.dispatchEvent(new Event('online')));expect(host.querySelector(`a[href="/ledger/?source=${second.artifactSha256}"]`)).not.toBeNull();expect(openPublicLedgerSource).toHaveBeenCalledTimes(2);
  await act(async()=>window.dispatchEvent(new Event('online')));expect(openPublicLedgerSource).toHaveBeenCalledTimes(3);expect(fetch.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('requires new public consent when keeping an older review restores a newer retained original',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({entries:[]})),host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[new File(['test-only'],'test.receiz')]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  const checkbox=host.querySelector('input[type=checkbox]') as HTMLInputElement;
  await act(async()=>checkbox.click());expect(checkbox.checked).toBe(true);
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Keep verified original'))!.click());
  expect(host.textContent).toContain('b'.repeat(64));
  expect((host.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(false);
  expect([...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Publish verified original'))!.disabled).toBe(true);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('can discover originals beyond the first page without knowing their digest',async()=>{
 const entry=(digest:string)=>({artifactSha256:digest.repeat(64),kind:'proof',kaiPulse:'100'});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const url=String(input);return url.includes('discovery=')?Response.json({entries:[entry(url.includes('cursor=')?'b':'a')],nextCursor:url.includes('cursor=')?null:1,count:2}):Response.json({source:'transport-only'});});
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  const more=[...host.querySelectorAll('button')].find(b=>b.textContent==='More published originals');expect(more).toBeDefined();
  await act(async()=>more!.click());expect(host.querySelector(`a[href="/ledger/?source=${'b'.repeat(64)}"]`)).not.toBeNull();
  expect(fetch.mock.calls.some(([input])=>String(input).includes('cursor=1'))).toBe(true);expect([...host.querySelectorAll('button')].some(b=>b.textContent==='More published originals')).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});

async function openReview(host:HTMLElement){const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[new File(['test-only'],'test.receiz')]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
it.each(['verified','legacy-unsealed-carrier'] as const)('distinguishes %s image authenticity from the independently verified Ledger source',async status=>{
 const imageSeal={status,version:status==='verified'?'v3':'v2',artifactSha256:'d'.repeat(64)};
 vi.mocked(inspectPublicLedgerFile).mockResolvedValueOnce({...values.older,format:'crystal',imageSeal} as never);
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({entries:[]})),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);
  const review=host.querySelector('.ledger-proof-review')!;expect(review.textContent).toContain('Ledger source SHA-256');expect(review.textContent).toContain(values.older.artifactSha256);expect(review.textContent).toContain(imageSeal.artifactSha256);
  expect(review.textContent).toContain(status==='verified'?'Image seal verified':'Legacy v2 carrier · image is unsealed');
  expect(review.textContent).toContain('Ledger source verified');expect(review.textContent).not.toContain(status==='verified'?'image is unsealed':'Image seal verified');
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
function button(host:HTMLElement,text:string){return [...host.querySelectorAll('button')].find(b=>b.textContent?.includes(text))!;}
function downloadSpies(){vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:synthetic-test');vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});}
it('offers the same whole-source save inside Ledger without starting mount discovery or polling',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'not live'},{status:503})),host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{expect(LedgerCrystalSave).toBeTypeOf('function');await act(async()=>root.render(<LedgerCrystalSave/>));expect(fetch).not.toHaveBeenCalled();
  await act(async()=>button(host,'Memory Crystal').click());expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.newer);expect(host.textContent).toContain('Memory Crystal saved');
  expect(fetch.mock.calls.every(([url,init])=>!String(url).includes('discovery')&&init?.method!=='POST')).toBe(true);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('downloads the newer retained source when the service returns an older valid prefix',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):Response.json({}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>button(host,'Memory Crystal').click());expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.newer);}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('can save a freshly verified original when optional browser storage is unavailable',async()=>{
 vi.mocked(retainPublicLedgerReview).mockRejectedValue(Error('PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE'));
 vi.mocked(readRetainedPublicLedger).mockRejectedValue(Error('PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE'));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):Response.json({}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>button(host,'Memory Crystal').click());expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.older);}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('does not call publication confirmed when the public original cannot be reopened',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>init?.method==='POST'?Response.json({artifactSha256:values.older.artifactSha256}):String(input).includes('?source=')?Response.json({error:'unavailable'},{status:503}):Response.json({entries:[]}));
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>{button(host,'Publish verified original').click();await vi.waitFor(()=>expect(host.textContent).not.toContain('Verifying the complete original…'));});
  expect(host.textContent).toContain('Publication could not be confirmed');expect(host.querySelector('.ledger-proof-public-link')).toBeNull();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('confirms publication only after reopening the matching public original and adds it to discovery',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>init?.method==='POST'?Response.json({artifactSha256:values.older.artifactSha256}):String(input).includes('?source=')?new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'application/vnd.receiz.bundle+json'}}):Response.json({entries:[]}));
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>{button(host,'Publish verified original').click();await vi.waitFor(()=>expect(host.textContent).not.toContain('Verifying the complete original…'));});
  expect(fetch.mock.calls.some(([input])=>String(input).endsWith('?source='+values.older.artifactSha256))).toBe(true);expect(host.querySelector('.ledger-proof-public-link')).not.toBeNull();expect(host.querySelector('.ledger-proof-discoveries a')).not.toBeNull();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('does not reopen a review closed while keeping its original',async()=>{
 let finish!:(value:never)=>void;vi.mocked(retainPublicLedgerReview).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({entries:[]})),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);await act(async()=>{button(host,'Keep verified original').click();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));});act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close proof review"]')!.click());await act(async()=>finish(values.newer as never));expect(host.querySelector('.ledger-proof-review')).toBeNull();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('ignores malformed discovery metadata without hiding valid original links',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({entries:[null,{}, {artifactSha256:'c'.repeat(64),kind:'proof',kaiPulse:'100'}]})),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));expect(host.querySelector(`a[href="/ledger/?source=${'c'.repeat(64)}"]`)).not.toBeNull();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('retains a newly confirmed original when the initial discovery read completes later',async()=>{
 let finish!:(value:Response)=>void;const pending=new Promise<Response>(resolve=>{finish=resolve;});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async(input,init)=>init?.method==='POST'?Response.json({artifactSha256:values.older.artifactSha256}):String(input).includes('?source=')?new Response(new Uint8Array([1,2,3])):pending);
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());await act(async()=>button(host,'Publish verified original').click());expect(host.querySelector('.ledger-proof-public-link')).not.toBeNull();
  await act(async()=>finish(Response.json({entries:[]})));expect(host.querySelector('.ledger-proof-discoveries a')).not.toBeNull();}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('does not save a conflicting source when retention refuses its continuity',async()=>{
 vi.mocked(readRetainedPublicLedger).mockResolvedValue(null);
 vi.mocked(retainPublicLedgerReview).mockRejectedValue(Error('PUBLIC_LEDGER_HISTORY_CONFLICT'));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):Response.json({}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>button(host,'Memory Crystal').click());expect(createPublicLedgerCrystal).not.toHaveBeenCalled();expect(host.textContent).toContain('Your retained history is unchanged');}
 finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('saves the reverified retained original before a pending current-source request can return 503',async()=>{
 let finish!:(value:Response)=>void;const remote=new Promise<Response>(resolve=>{finish=resolve;});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):remote);
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  await act(async()=>button(host,'Memory Crystal').click());
  expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.newer);
  expect(button(host,'Memory Crystal').disabled).toBe(false);expect(host.textContent).toContain('Memory Crystal saved');
  await act(async()=>finish(Response.json({error:'not live'},{status:503})));
  expect(host.textContent).toContain('Memory Crystal saved');expect(retainPublicLedgerReview).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('uses a fast canonical remote source when no original is retained',async()=>{
 vi.mocked(readRetainedPublicLedger).mockResolvedValue(null);vi.mocked(retainPublicLedgerReview).mockResolvedValue(values.older as never);
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):Response.json({source:'transport-only'}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{
  await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>button(host,'Memory Crystal').click());
  expect(openPublicLedgerSource).toHaveBeenCalledWith({source:'transport-only'});expect(retainPublicLedgerReview).toHaveBeenCalledWith(values.older);expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.older);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('keeps local controls available when both remote and retained originals are unavailable',async()=>{
 vi.mocked(readRetainedPublicLedger).mockResolvedValue(null);
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'not live'},{status:503}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{
  await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>button(host,'Memory Crystal').click());
  expect(createPublicLedgerCrystal).not.toHaveBeenCalled();expect(button(host,'Memory Crystal').disabled).toBe(false);expect(button(host,'Open proof').disabled).toBe(false);expect(host.textContent).toContain('not available yet');
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('refreshes only retained custody after a download without replacing the reviewed original or its consent',async()=>{
 const extended={...values.newer,artifactSha256:'c'.repeat(64),kaiPulse:'12'};
 vi.mocked(openPublicLedgerSource).mockResolvedValueOnce(extended as never);vi.mocked(retainPublicLedgerReview).mockResolvedValueOnce(extended as never);
 let finish!:(value:Response)=>void;const remote=new Promise<Response>(resolve=>{finish=resolve;});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):remote);
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{
  await act(async()=>root.render(<LedgerProofControls/>));await openReview(host);await act(async()=>host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
  await act(async()=>button(host,'Memory Crystal').click());expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.newer);
  await act(async()=>{finish(Response.json({source:'transport-only'}));await vi.waitFor(()=>expect(retainPublicLedgerReview).toHaveBeenCalledWith(extended));});
  expect(host.querySelector('.ledger-proof-review')?.textContent).toContain(values.older.artifactSha256);
  expect(host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true);expect(button(host,'Publish verified original').disabled).toBe(false);
  expect(fetch.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('keeps saving the held original if a background source fails the existing continuity check',async()=>{
 vi.mocked(retainPublicLedgerReview).mockRejectedValueOnce(Error('PUBLIC_LEDGER_HISTORY_CONFLICT'));
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):Response.json({source:'transport-only'}));
 const host=document.createElement('div'),root=createRoot(host);downloadSpies();
 try{
  await act(async()=>root.render(<LedgerProofControls/>));await act(async()=>{button(host,'Memory Crystal').click();await vi.waitFor(()=>expect(retainPublicLedgerReview).toHaveBeenCalled());});
  expect(createPublicLedgerCrystal).toHaveBeenCalledWith(values.newer);expect(host.textContent).toContain('Memory Crystal saved');expect(button(host,'Open proof').disabled).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('opens a source link from the exact reverified retained digest without claiming remote publication',async()=>{
 const previous=location.href;history.replaceState({},'',`/ledger/?source=${values.newer.artifactSha256}`);
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'not live'},{status:503}));
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  expect(host.textContent).toContain(values.newer.artifactSha256);
  expect(host.querySelector('.ledger-proof-public-link')).toBeNull();expect(host.querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(false);
  expect(fetch.mock.calls.some(([input])=>String(input).includes('?source='))).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();history.replaceState({},'',previous);}
});
it('does not substitute a different retained head for an unavailable exact source link',async()=>{
 const previous=location.href;history.replaceState({},'',`/ledger/?source=${values.older.artifactSha256}`);
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({error:'not live'},{status:503}));
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  expect(host.querySelector('.ledger-proof-review')).toBeNull();expect(host.textContent).toContain('This public original is unavailable');
 }finally{act(()=>root.unmount());fetch.mockRestore();history.replaceState({},'',previous);}
});

for(const failure of ['unavailable','verification'] as const)it(`retries ${failure} source sync on reconnect even when discovery count is unchanged`,async()=>{
 let reads=0;
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({count:1,entries:[{artifactSha256:'c'.repeat(64),kind:'proof',kaiPulse:'12'}],nextCursor:null}):++reads===1&&failure==='unavailable'?Response.json({error:'unavailable'},{status:503}):Response.json({source:'transport-only'}));
 if(failure==='verification')vi.mocked(openPublicLedgerSource).mockRejectedValueOnce(Error('verification failed'));
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LedgerProofControls/>));expect(reads).toBe(1);
  await act(async()=>window.dispatchEvent(new Event('online')));expect(reads).toBe(2);expect(retainPublicLedgerReview).toHaveBeenCalledOnce();
  await act(async()=>window.dispatchEvent(new Event('online')));expect(reads).toBe(3);
  expect(fetch.mock.calls.some(([,init])=>init?.method==='POST')).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});

it('persists an accepted source after controls unmount and keeps its newest action available with the API down',async()=>{
 const next={...values.newer,artifactSha256:'d'.repeat(64),snapshot:{...values.newer.snapshot,records:[{id:'accepted-after-unmount',sequence:1,kind:'auth.logout',kaiUpulse:'1000000',entryHash:'e'.repeat(64),previousHash:'f'.repeat(64),amountUsdCents:null}]}};
 vi.mocked(openPublicLedgerSource).mockResolvedValueOnce(next as never);vi.mocked(retainPublicLedgerReview).mockResolvedValueOnce(next as never);
 let saved:Awaited<ReturnType<typeof loadPublicNetworkCache>>={records:[],capturedAt:'2026-10-18T12:00:00Z',coverage:[{source:'graph',complete:true,anchorIds:[],observedAt:200}]};
 vi.mocked(loadPublicNetworkCache).mockImplementation(async()=>saved);vi.mocked(savePublicNetworkCache).mockImplementation(async cache=>{saved=cache;return true;});
 let finish!:(response:Response)=>void;const pending=new Promise<Response>(resolve=>{finish=resolve;});
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>String(input).includes('discovery=')?Response.json({entries:[]}):pending);
 const root=createRoot(document.createElement('div'));
 await act(async()=>root.render(<LedgerProofControls/>));act(()=>root.unmount());
 try{
  await act(async()=>finish(Response.json({source:'transport-only'})));
  await vi.waitFor(()=>expect(saved?.records[0]?.sourceId).toBe('accepted-after-unmount'));
  expect(saved?.coverage).toEqual([{source:'graph',complete:true,anchorIds:[],observedAt:200}]);
  vi.mocked(readRetainedPublicLedger).mockResolvedValue(next as never);fetch.mockResolvedValue(Response.json({error:'503'},{status:503}));
  expect(await synchronizePublicLedger()).toBe(next);expect(saved?.records[0]?.sourceId).toBe('accepted-after-unmount');
 }finally{fetch.mockRestore();}
});
