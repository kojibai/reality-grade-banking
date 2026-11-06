import {afterEach,expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import {Window} from 'happy-dom';

const windows:Window[]=[];
afterEach(()=>{for(const window of windows.splice(0)){window.happyDOM.abort();window.close();}});
async function setup(){
 const window=new Window();windows.push(window);
 const document=window.document as unknown as Document;
 document.body.innerHTML=`<section data-institution-directory>
 <div data-directory-controls hidden><input data-directory-query type="search" aria-label="Find an institution"><select data-directory-region-filter><option value="all">All regions</option><option>Global</option><option>North America</option><option>Europe</option></select><select data-directory-country-filter><option value="all">All countries</option><option>Global</option><option>United States</option><option>France</option></select><select data-directory-status-filter><option value="all">All results</option><option value="pass">PASS</option><option value="fail">FAIL</option></select><select data-directory-sort><option value="default">Register order</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="pass-first">PASS first</option></select><button data-directory-clear type="button">Reset filters</button></div>
 <p data-directory-results role="status" aria-live="polite"></p><div data-directory-empty hidden>No institutions found</div>
 <div data-directory-record-list><article data-directory-record data-institution-id="bankeiz" data-directory-name="Bankeiz" data-directory-country="Global" data-qualification="PASS" data-directory-region="Global" data-directory-search="Bankeiz Reality-Grade Banking reference implementation proof native"><details open><summary>Bankeiz evidence</summary><a href="/conformance/bankeiz-public-conformance.png">Original proof</a></details></article>
 <article data-directory-record data-institution-id="chase" data-directory-name="Chase" data-directory-country="United States" data-qualification="FAIL" data-directory-region="North America" data-directory-search="Chase JPMorgan J.P. Morgan JPM United States"></article>
 <article data-directory-record data-institution-id="credit-agricole" data-directory-name="Crédit Agricole" data-directory-country="France" data-qualification="FAIL" data-directory-region="Europe" data-directory-search="Crédit Agricole France"></article></div>
 </section>`;
 expect(existsSync('public/learn/institution-scorecard.js'),'the selected-page search module exists').toBe(true);
 const path='../public/learn/institution-scorecard.js';
 const module=await import(/* @vite-ignore */path) as {init(root?:Document|Element):void};
 const root=document.querySelector<HTMLElement>('[data-institution-directory]')!;
 const input=root.querySelector<HTMLInputElement>('[data-directory-query]')!;
 const region=root.querySelector<HTMLSelectElement>('[data-directory-region-filter]')!;
 const status=root.querySelector<HTMLSelectElement>('[data-directory-status-filter]')!;
 const country=root.querySelector<HTMLSelectElement>('[data-directory-country-filter]')!;
 const sort=root.querySelector<HTMLSelectElement>('[data-directory-sort]')!;
 const update=(element:HTMLInputElement|HTMLSelectElement,value:string)=>{element.value=value;element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}) as unknown as Event);};
 const visible=()=>[...root.querySelectorAll<HTMLElement>('[data-directory-record]')].filter(row=>!row.hidden).map(row=>row.dataset.institutionId);
 return{module,document,root,input,region,status,country,sort,update,visible};
}

it('reveals local search controls and finds names, aliases, case and accented names',async()=>{
 const f=await setup();expect(f.root.querySelector<HTMLElement>('[data-directory-controls]')?.hidden).toBe(true);
 f.module.init(f.document);expect(f.root.querySelector<HTMLElement>('[data-directory-controls]')?.hidden).toBe(false);
 expect(f.visible()).toEqual(['bankeiz','chase','credit-agricole']);
 f.update(f.input,'  jPm  ');expect(f.visible()).toEqual(['chase']);
 f.update(f.input,'CREDIT AGRICOLE');expect(f.visible()).toEqual(['credit-agricole']);
 f.update(f.input,'proof native');expect(f.visible()).toEqual(['bankeiz']);
 expect(f.root.querySelector('[data-directory-results]')?.textContent).toBe('Showing 1 of 3 institutions');
});

it('combines text, region and status filters while preserving the actual green proof and evidence nodes',async()=>{
 const f=await setup(),proof=f.root.querySelector('a')!,details=f.root.querySelector('details')!;
 f.module.init(f.root);f.update(f.status,'pass');expect(f.visible()).toEqual(['bankeiz']);
 expect(f.root.querySelector('a')).toBe(proof);expect(proof.getAttribute('href')).toBe('/conformance/bankeiz-public-conformance.png');expect(details.open).toBe(true);
 f.update(f.region,'Europe');expect(f.visible()).toEqual([]);
 f.update(f.status,'fail');expect(f.visible()).toEqual(['credit-agricole']);
 f.update(f.input,'Chase');expect(f.visible()).toEqual([]);
 expect(f.root.querySelector<HTMLElement>('[data-directory-empty]')?.hidden).toBe(false);
});

it('resets every filter and the empty state without remounting the register',async()=>{
 const f=await setup(),row=f.root.querySelector('[data-directory-record]');f.module.init(f.document);
 f.update(f.input,'no institution matches');f.update(f.region,'Europe');f.update(f.status,'pass');
 f.root.querySelector<HTMLButtonElement>('[data-directory-clear]')!.click();
 expect(f.input.value).toBe('');expect(f.region.value).toBe('all');expect(f.status.value).toBe('all');
 expect(f.visible()).toEqual(['bankeiz','chase','credit-agricole']);
 expect(f.root.querySelector<HTMLElement>('[data-directory-empty]')?.hidden).toBe(true);expect(f.root.querySelector('[data-directory-record]')).toBe(row);
});

it('keeps queries literal and initializes retained and replacement directories safely',async()=>{
 const f=await setup();f.module.init(f.document);f.update(f.input,'.*');expect(f.visible()).toEqual([]);
 f.module.init(f.document);expect(f.input.value).toBe('.*');expect(f.visible()).toEqual([]);
 f.update(f.input,'JPM');expect(f.visible()).toEqual(['chase']);
 const next=f.root.cloneNode(true) as HTMLElement;f.root.replaceWith(next);f.module.init(f.document);
 const input=next.querySelector<HTMLInputElement>('[data-directory-query]')!;f.update(input,'bankeiz');
 expect([...next.querySelectorAll<HTMLElement>('[data-directory-record]')].filter(row=>!row.hidden).map(row=>row.dataset.institutionId)).toEqual(['bankeiz']);
});
it('filters by country and sorts the existing evidence rows without replacing them',async()=>{
 const f=await setup(),proof=f.root.querySelector('a'),details=f.root.querySelector('details');f.module.init(f.document);
 f.update(f.country,'France');expect(f.visible()).toEqual(['credit-agricole']);
 f.update(f.country,'all');f.update(f.sort,'name-desc');expect(f.visible()).toEqual(['credit-agricole','chase','bankeiz']);
 expect(f.root.querySelector('a')).toBe(proof);expect(f.root.querySelector('details')).toBe(details);expect(details?.open).toBe(true);
 f.update(f.sort,'pass-first');expect(f.visible()[0]).toBe('bankeiz');
 f.update(f.country,'France');f.root.querySelector<HTMLButtonElement>('[data-directory-clear]')!.click();
 expect(f.country.value).toBe('all');expect(f.sort.value).toBe('default');expect(f.visible()).toEqual(['bankeiz','chase','credit-agricole']);
});
