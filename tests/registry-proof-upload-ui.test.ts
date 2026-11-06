import {afterEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {institutionScorecardContent} from '../scripts/institution-scorecard-page.mjs';
import {bankeizRecordedConformance,type InstitutionRecord} from '../src/content/institution-scorecard.mjs';
import type {RegistryInstitutionState,RegistryPublication} from '../src/registry/types';
import type {RegistryPublishInput} from '../src/registry/publish';

const windows:Window[]=[];
afterEach(()=>{vi.unstubAllGlobals();for(const window of windows.splice(0)){window.happyDOM.abort();window.close();}});
const records:InstitutionRecord[]=[
 {id:'bankeiz',name:'Bankeiz',website:'https://bankeiz.com/',assessment:null,recordedConformance:bankeizRecordedConformance},
 {id:'wells-fargo',name:'Wells Fargo',website:'https://www.wellsfargo.com/',assessment:null},
];
const publication=(hash='a'):RegistryPublication=>({schema:'bank.registry.publication.v1',institutionId:'wells-fargo',name:'Wells Fargo',scope:'Public integration contract',cases:33,artifactSha256:hash.repeat(64),evidenceSha256:'b'.repeat(64),holderReceizId:'holder.receiz.id',implementationBuildSha256:'c'.repeat(64),officialProofUrl:'https://www.wellsfargo.com/.well-known/reality-grade-banking/conformance.png',acceptedAt:'2026-11-05T22:00:00.000Z',url:'/api/bank/registry/original/wells-fargo/'+hash.repeat(64)});
const entry=(revision=1):RegistryInstitutionState=>({institutionId:'wells-fargo',revision,current:publication(revision===1?'a':'d'),history:revision===1?[]:[publication()]});
async function setup(fetcher:(...args:Parameters<typeof fetch>)=>Promise<Response>=async()=>Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}),publish?:(value:RegistryPublishInput)=>Promise<RegistryInstitutionState>,inspect?:()=>Promise<{receizId:string;keyId:string}>){
 let prepared:RegistryInstitutionState;
 vi.stubGlobal('fetch',vi.fn(async(...args:Parameters<typeof fetch>)=>{
  const response=await fetcher(...args);
  if(args[1]?.method==='POST'&&response.ok){
   const value=await response.clone().json();
   if(value?.entry){prepared=value.entry;return Response.json({ok:true,plan:{publication:prepared.current,originalBytes:(args[1].body as Uint8Array).length,partCount:1}});}
  }
  return response;
 }));
 const window=new Window();windows.push(window);const document=window.document as unknown as Document;
 document.body.innerHTML=institutionScorecardContent(records);
 const path='../public/learn/institution-scorecard.js';
 const original=await import(/* @vite-ignore */path) as {init(root?:Document|Element,ports?:{loadPublisher:()=>Promise<{publishRegistryOriginal:(value:RegistryPublishInput)=>Promise<RegistryInstitutionState>;inspectRegistryPublisher?:()=>Promise<{receizId:string;keyId:string}>}>}):void};
 const publishRegistryOriginal=vi.fn(publish??(async()=>prepared));
 const loadPublisher=vi.fn(async()=>({publishRegistryOriginal,...inspect?{inspectRegistryPublisher:inspect}:{}}));
 const module={init:(root?:Document|Element)=>original.init(root,{loadPublisher})};
 const row=document.querySelector<HTMLElement>('[data-institution-id="wells-fargo"]')!;
 const form=row.querySelector<HTMLFormElement>('[data-registry-proof-form]')!;
 const choose=(bytes=new Uint8Array([137,80,78,71,13,10,26,10]))=>{
  const input=form.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file=new File([bytes],'conformance.png',{type:'image/png'});
  Object.defineProperty(input,'files',{configurable:true,value:[file]});
  input.dispatchEvent(new window.Event('change',{bubbles:true}) as unknown as Event);
 };
 const submit=()=>form.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event);
 return{window,document,module,row,form,choose,submit,loadPublisher,publishRegistryOriginal};
}

it('places a progressively enhanced public-proof upload inside every existing evidence disclosure',async()=>{
 const f=await setup();
 const forms=[...f.document.querySelectorAll<HTMLFormElement>('[data-registry-proof-form]')];
 expect(forms).toHaveLength(2);expect(forms.every(form=>form.hidden)).toBe(true);
 for(const form of forms){
  expect(form.closest('details.isc-institution-evidence')).not.toBeNull();
  const input=form.querySelector('input[type="file"]')!;
  expect(f.document.querySelector('label[for="'+input.id+'"]')?.textContent).toContain(form.closest('[data-directory-record]')?.getAttribute('data-directory-name'));
 }
 expect(f.form.textContent).toContain('https://www.wellsfargo.com/.well-known/reality-grade-banking/conformance.png');
 expect(f.document.querySelector('#how-to-qualify')?.textContent).toMatch(/evidence dropdown and upload.*automatically/i);
 expect(f.document.querySelector('#how-to-qualify a[href="#institution-register"]')).not.toBeNull();
 f.module.init(f.document);
 expect(forms.every(form=>!form.hidden)).toBe(true);
 expect(f.form.querySelector<HTMLButtonElement>('button[type="submit"]')?.textContent).toBe('Verify and update record');
 expect(f.form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
});

it('keeps FAIL until the server durably accepts the exact proof, then updates verdict, totals and active filters without remounting',async()=>{
 let finish!:(value:Response)=>void;
 const f=await setup(async(_url,options)=>options?.method==='POST'?new Promise(resolve=>{finish=resolve;}):Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}));
 f.module.init(f.document);const details=f.row.querySelector('details')!;details.open=true;
 const filter=f.document.querySelector<HTMLSelectElement>('[data-directory-status-filter]')!;filter.value='fail';filter.dispatchEvent(new f.window.Event('change') as unknown as Event);
 f.choose();f.submit();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
 expect(f.row.dataset.qualification).toBe('FAIL');expect(f.form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
 finish(Response.json({ok:true,entry:entry()}));
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 expect(f.row.classList.contains('isc-green')).toBe(true);expect(f.row.querySelector('[data-qualification-verdict]')?.textContent).toBe('PASS');
 expect(f.document.querySelector('[data-register-count="qualified"]')?.textContent).toBe('2');
 expect(f.document.querySelector('[data-register-count="evidence-required"]')?.textContent).toBe('0');
 expect(f.row.hidden).toBe(true);expect(f.row.querySelector('details')).toBe(details);expect(details.open).toBe(true);expect(f.row.querySelector('form')).toBe(f.form);
 expect(f.row.querySelector('[data-qualification-context]')?.textContent).toContain('Public integration contract');
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).toContain('holder.receiz.id');
 const request=(fetch as ReturnType<typeof vi.fn>).mock.calls.find(call=>call[1]?.method==='POST')!;
 expect(request[0]).toBe('/api/bank/registry/wells-fargo?prepare=1');expect(request[1].headers['Content-Type']).toBe('image/png');expect(request[1].body).toBeInstanceOf(Uint8Array);
});

it('loads device publication only after explicit submission and keeps FAIL until native acceptance is confirmed',async()=>{
 let finish!:(value:RegistryInstitutionState)=>void;
 const f=await setup(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,entry:entry()}:{schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}),async value=>{value.onStatus?.('Publishing Original part 1 of 1…');return new Promise(resolve=>{finish=resolve;});});
 f.module.init(f.document);expect(f.loadPublisher).not.toHaveBeenCalled();
 f.choose();f.submit();await vi.waitFor(()=>expect(f.publishRegistryOriginal).toHaveBeenCalledTimes(1));
 expect(f.row.dataset.qualification).toBe('FAIL');expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toContain('Publishing Original part');
 finish(entry());await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
});

it('asks for your existing Identity Record when device publication cannot open its identity',async()=>{
 const f=await setup(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,entry:entry()}:{schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}),async()=>{throw Object.assign(new Error('Open your existing Receiz Identity Record on this device, then retry this Original.'),{code:'REGISTRY_IDENTITY_REQUIRED',uncertain:false});});
 f.module.init(f.document);f.choose();f.submit();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toContain('your existing Receiz Identity Record'));
 expect(f.row.dataset.qualification).toBe('FAIL');
});

it('checks the actual device publisher only on request and pins that explicitly previewed public ID for publication',async()=>{
 const inspect=vi.fn(async()=>({receizId:'bjklock.receiz.id',keyId:'preview-key'}));
 const f=await setup(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,entry:entry()}:{schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}),undefined,inspect);
 if(!f.form.querySelector('[data-registry-check-publisher]')){const button=f.document.createElement('button');button.type='button';button.dataset.registryCheckPublisher='';button.textContent='Check publisher';f.form.append(button);}
 if(!f.form.querySelector('[data-registry-publisher-status]')){const status=f.document.createElement('p');status.dataset.registryPublisherStatus='';f.form.append(status);}
 f.module.init(f.document);expect(inspect).not.toHaveBeenCalled();expect(f.loadPublisher).not.toHaveBeenCalled();
 f.form.querySelector<HTMLButtonElement>('[data-registry-check-publisher]')!.click();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-publisher-status]')?.textContent).toBe('Publisher: bjklock.receiz.id'));
 expect((fetch as ReturnType<typeof vi.fn>).mock.calls.some(call=>call[1]?.method==='POST')).toBe(false);expect(f.row.dataset.qualification).toBe('FAIL');
 f.choose();f.submit();await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 expect(f.publishRegistryOriginal.mock.calls[0][0].expectedPublisherReceizId).toBe('bjklock.receiz.id');
});

it('refuses malformed files and failed publication without an optimistic PASS or loss of the prior evidence',async()=>{
 const f=await setup(async(_url,options)=>options?.method==='POST'?Response.json({ok:false,code:'REGISTRY_OFFICIAL_PROOF_MISMATCH',message:'The official institution publication does not match this Original.'},{status:422}):Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}));
 f.module.init(f.document);f.choose(new Uint8Array([1,2,3]));f.submit();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toMatch(/PNG/i));
 expect((fetch as ReturnType<typeof vi.fn>).mock.calls.filter(call=>call[1]?.method==='POST')).toHaveLength(0);
 f.choose();f.submit();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toContain('does not match'));
 expect(f.row.dataset.qualification).toBe('FAIL');expect(f.row.querySelector('.isc-missing-assessment')).not.toBeNull();
});

it('reconciles an interrupted publication with the public record before presenting its accepted PASS',async()=>{
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
 const accepted=entry();accepted.current.artifactSha256=digest;accepted.current.url='/api/bank/registry/original/wells-fargo/'+digest;
 let reads=0;
 const f=await setup(async(_url,options)=>{if(options?.method==='POST')throw new TypeError('Connection interrupted after acceptance.');return Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:++reads===1?[]:[accepted]});});
 f.module.init(f.document);f.choose(bytes);f.submit();
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 expect(reads).toBe(2);expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toMatch(/confirms.*Original/i);
 expect(f.form.querySelector<HTMLInputElement>('input[type="file"]')?.files?.length).toBe(1);
});

it('does not assert a failed write when publication acknowledgement is uncertain',async()=>{
 let reads=0;
 const f=await setup(async(_url,options)=>options?.method==='POST'?new Response('Response lost',{status:503}):(reads++,Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]})));
 f.module.init(f.document);f.choose();f.submit();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toBe('Publication could not be confirmed. Check the public record or retry this same Original.'));
 expect(reads).toBe(2);expect(f.row.dataset.qualification).toBe('FAIL');
 expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).not.toMatch(/has not changed|not accepted/i);
});

it('applies accepted public records in the background and preserves the original Bankeiz PASS when no new record is present',async()=>{
 const f=await setup(async()=>Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[entry()]}));
 f.module.init(f.document);f.module.init(f.document);
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 expect(fetch).toHaveBeenCalledTimes(1);
 const bankeiz=f.document.querySelector('[data-institution-id="bankeiz"]')!;
 expect(bankeiz.getAttribute('data-qualification')).toBe('PASS');expect(bankeiz.querySelector('.isc-original-evidence')).not.toBeNull();
});

it('retains the newer accepted revision and all prior Originals when a slower public response arrives',async()=>{
 let finishRead!:(value:Response)=>void;
 const f=await setup(async(_url,options)=>options?.method==='POST'?Response.json({ok:true,entry:entry(2)}):new Promise(resolve=>{finishRead=resolve;}));
 f.module.init(f.document);f.choose();f.submit();
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 finishRead(Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[entry()]}));
 await Promise.resolve();await Promise.resolve();
 const links=[...f.row.querySelectorAll<HTMLAnchorElement>('[data-published-conformance] a')];
 expect(links.some(link=>link.getAttribute('href')===entry(2).current.url)).toBe(true);
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).toContain('Previous accepted Originals');
 expect(links.some(link=>link.getAttribute('href')===entry().current.url)).toBe(true);
});

it('does not project mismatched institutions or unsafe Original links',async()=>{
 const mismatch=entry();mismatch.current.name='Chase';
 const unsafe=entry();unsafe.current.url='javascript:alert(1)';
 const f=await setup(async()=>Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[mismatch,unsafe]}));
 f.module.init(f.document);await Promise.resolve();await Promise.resolve();
 expect(f.row.dataset.qualification).toBe('FAIL');
 expect(f.row.querySelector('a[href^="javascript:"]')).toBeNull();
});

it('keeps the current Original when an inconsistent response reuses its accepted revision',async()=>{
 let finishRead!:(value:Response)=>void;
 const f=await setup(async(_url,options)=>options?.method==='POST'?Response.json({ok:true,entry:entry()}):new Promise(resolve=>{finishRead=resolve;}));
 f.module.init(f.document);f.choose();f.submit();
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 const conflicting=entry();conflicting.current=publication('e');
 finishRead(Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[conflicting]}));
 await Promise.resolve();await Promise.resolve();
 expect(f.row.querySelector<HTMLAnchorElement>('[data-published-conformance] a')?.getAttribute('href')).toBe(entry().current.url);
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).not.toContain('e'.repeat(64));
});

it('renders a publication refusal as text and does not interpret its message as markup',async()=>{
 const message='Proof mismatch: <img src=x onerror=alert(1)>.';
 const f=await setup(async(_url,options)=>options?.method==='POST'?Response.json({ok:false,code:'REGISTRY_PROOF_INVALID',message},{status:422}):Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}));
 f.module.init(f.document);f.choose();f.submit();
 await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toBe(message));
 expect(f.form.querySelector('[data-registry-proof-status] img')).toBeNull();expect(f.row.dataset.qualification).toBe('FAIL');
});

it('keeps held proof history if a newer public response omits a previously accepted Original',async()=>{
 let finishRead!:(value:Response)=>void;
 const f=await setup(async(_url,options)=>options?.method==='POST'?Response.json({ok:true,entry:entry(2)}):new Promise(resolve=>{finishRead=resolve;}));
 f.module.init(f.document);f.choose();f.submit();await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 const thinner={institutionId:'wells-fargo',revision:3,current:publication('e'),history:[publication('d'),publication('f')]};
 finishRead(Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[thinner]}));
 await Promise.resolve();await Promise.resolve();
 const links=[...f.row.querySelectorAll<HTMLAnchorElement>('[data-published-conformance] a')];
 expect(links[0]?.getAttribute('href')).toBe(entry(2).current.url);expect(links.some(link=>link.getAttribute('href')===entry().current.url)).toBe(true);
});

it('announces a temporarily unavailable publication service without hiding the available static directory',async()=>{
 const f=await setup(async()=>Response.json({schema:'bank.registry.public.v1',publishingAvailable:false,records:[]}));
 f.module.init(f.document);await vi.waitFor(()=>expect(f.form.querySelector('[data-registry-proof-status]')?.textContent).toContain('publication service is temporarily unavailable'));
 f.choose();expect(f.form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);
 expect(f.row.dataset.qualification).toBe('FAIL');expect(f.document.querySelector<HTMLElement>('[data-directory-controls]')?.hidden).toBe(false);
});

it('retains the previously published Bankeiz Original and its reference checks when a new Original is accepted',async()=>{
 const current={...publication('d'),institutionId:'bankeiz',name:'Bankeiz',holderReceizId:bankeizRecordedConformance.holderReceizId,url:'/api/bank/registry/original/bankeiz/'+'d'.repeat(64),officialProofUrl:'https://bankeiz.com/api/bank/registry/original/bankeiz/'+'d'.repeat(64)};
 const f=await setup(async()=>Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[{institutionId:'bankeiz',revision:1,current,history:[]}]}));
 const bankeiz=f.document.querySelector('[data-institution-id="bankeiz"]')!,prior=bankeiz.querySelector('.isc-original-evidence');
 f.module.init(f.document);
 await vi.waitFor(()=>expect(bankeiz.querySelector('[data-published-conformance]')?.textContent).toContain('d'.repeat(64)));
 const retained=bankeiz.querySelector<HTMLDetailsElement>('[data-prior-static-record]');
 expect(retained?.querySelector('summary')?.textContent).toBe('Previously published conformance record');expect(retained?.open).toBe(false);
 expect(retained?.querySelector('.isc-original-evidence')).toBe(prior);
 expect(retained?.querySelector('a')?.getAttribute('href')).toBe(bankeizRecordedConformance.url);
 expect(retained?.textContent).toContain('Recorded reference checks');expect(retained?.textContent).toContain('12 / 12 checks passed');
});

it('opens the available directory immediately and restores accepted public display from its own cache while offline',async()=>{
 const f=await setup(async()=>{throw new TypeError('Offline');});
 const cache={match:vi.fn(async()=>Response.json({schema:'bank.registry.display.v1',records:[entry()]})),put:vi.fn()};
 const open=vi.fn(async()=>cache);vi.stubGlobal('caches',{open});
 f.module.init(f.document);
 expect(f.document.querySelector<HTMLElement>('[data-directory-controls]')?.hidden).toBe(false);
 expect(f.form.hidden).toBe(false);expect(f.row.dataset.qualification).toBe('FAIL');
 await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 expect(open).toHaveBeenCalledWith('bankeiz-registry-display-v1');expect(cache.match).toHaveBeenCalledWith('/api/bank/registry');
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).toContain(entry().current.artifactSha256);
 expect(cache.put).not.toHaveBeenCalled();
});

it('keeps the previous durable display copy when saving a newer accepted record fails',async()=>{
 const f=await setup(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,entry:entry(2)}:{schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}));
 const saved={schema:'bank.registry.display.v1',records:[entry()]};
 const cache={match:vi.fn(async()=>Response.json(saved)),put:vi.fn(async()=>{throw Error('Cache capacity exceeded');}),delete:vi.fn()};
 vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 f.module.init(f.document);await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 f.choose();f.submit();await vi.waitFor(()=>expect(cache.put).toHaveBeenCalled());
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).toContain(entry(2).current.artifactSha256);
 expect((await (await cache.match()).json()).records[0].revision).toBe(1);expect(cache.delete).not.toHaveBeenCalled();
});

it('does not let a late cached snapshot replace a newer accepted server response',async()=>{
 let finishCache!:(value:Response)=>void;
 const f=await setup(async(_url,options)=>Response.json(options?.method==='POST'?{ok:true,entry:entry(2)}:{schema:'bank.registry.public.v1',publishingAvailable:true,records:[]}));
 const cache={match:vi.fn(()=>new Promise<Response>(resolve=>{finishCache=resolve;})),put:vi.fn(async()=>{})};vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 f.module.init(f.document);f.choose();f.submit();await vi.waitFor(()=>expect(f.row.dataset.qualification).toBe('PASS'));
 finishCache(Response.json({schema:'bank.registry.display.v1',records:[entry()]}));
 await vi.waitFor(()=>expect(cache.put).toHaveBeenCalled());
 expect(f.row.querySelector('[data-published-conformance]')?.textContent).toContain(entry(2).current.artifactSha256);
 const args=cache.put.mock.calls[cache.put.mock.calls.length-1] as unknown as [string,Response];
 expect(args[0]).toBe('/api/bank/registry');const snapshot=await args[1].json();
 expect(snapshot.schema).toBe('bank.registry.display.v1');expect(snapshot.records[0].revision).toBe(2);expect(snapshot.records[0].history).toHaveLength(1);
});

it('seeds the accepted HTML state before a stale display cache arrives and preserves its selected evidence nodes',async()=>{
 const f=await setup(async()=>{throw new TypeError('Offline');});
 const current=entry(2);f.row.dataset.qualification='PASS';f.row.dataset.registryRevision='2';f.row.dataset.registryCurrentSha256=current.current.artifactSha256;
 const seed=f.document.createElement('script');seed.type='application/json';seed.dataset.registryPublicState='';seed.textContent=JSON.stringify(current);f.row.append(seed);
 const held=f.row.querySelector('[data-existing-conformance]')!;held.textContent='Already selected server evidence';
 const cache={match:vi.fn(async()=>Response.json({schema:'bank.registry.display.v1',records:[entry()]})),put:vi.fn(async()=>{})};vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 f.module.init(f.document);
 expect(f.document.querySelector<HTMLElement>('[data-directory-controls]')?.hidden).toBe(false);
 await vi.waitFor(()=>expect(cache.put).toHaveBeenCalled());
 expect(f.row.querySelector('[data-existing-conformance]')).toBe(held);expect(held.textContent).toBe('Already selected server evidence');
 const args=cache.put.mock.calls[cache.put.mock.calls.length-1] as unknown as [string,Response];
 expect((await args[1].json()).records[0].revision).toBe(2);
});
