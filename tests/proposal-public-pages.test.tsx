// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProposalWorkflowExample,prepareProposalExamplePdf} from '../src/presentation/ProposalWorkflowExample';
import {clientWorkScenario} from '../src/content/client-work-scenarios.mjs';
import {proposalPages,proposalQuestions} from '../src/content/proposal-pages.mjs';
// @ts-expect-error Existing public templates use plain ESM.
import {proposalContent} from '../scripts/proposal-pages.mjs';
// @ts-expect-error Existing read-only preview generator uses plain ESM.
import {proposalWalkthrough} from '../scripts/product-walkthrough.mjs';
// @ts-expect-error Existing progressive enhancement is plain browser ESM.
import {init} from '../public/learn/product-walkthrough.js';
import {publicPage,structuredMetadata} from '../scripts/public-page-metadata.mjs';
import {businessContent} from '../scripts/business-page.mjs';
import {fitContent} from '../scripts/business-fit-pages.mjs';
import {businessFits} from '../src/content/business-fits.mjs';

afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('renders real chat, editable terms, document preview and payment review from a marked sample without identity or network work',async()=>{
 const fetch=globalThis.fetch,network:string[]=[];vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>{if(String(input).startsWith('data:'))return fetch(input,init);network.push(String(input));return Promise.reject(Error('Sample must not use a network'));});
 const pdf=await prepareProposalExamplePdf();expect(new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()).subarray(0,5))).toBe('%PDF-');
 const markup=['chat','draft','preview','payment','delivery','next'].map(stage=>renderToStaticMarkup(<ProposalWorkflowExample stage={stage as 'chat'} pdf={pdf}/>)).join(''),doc=new DOMParser().parseFromString(markup,'text/html');
 expect(doc.body.textContent).toContain('Willow Studio website');expect(doc.body.textContent).toContain('Five-page website');expect(doc.body.textContent).toContain('Two revision rounds');expect(doc.body.textContent).toContain('$1,500.00');expect(doc.body.textContent).toContain('Delivery preview');expect(doc.body.textContent).toContain('Sample only');
 expect(doc.querySelector('.bank-proposal-composer')).not.toBeNull();expect(doc.querySelector('.bank-proposal-preview')).not.toBeNull();expect(doc.querySelector('.native-operation-review')).not.toBeNull();expect(doc.body.textContent).not.toMatch(/Money received|Payment confirmed|You accepted this proposal/);expect(network).toEqual([]);
});
it('puts the complete useful content and actual source-bound screens in both initial public documents',()=>{
 for(const page of proposalPages){
  const doc=new DOMParser().parseFromString(proposalContent(page),'text/html');
  expect(doc.querySelector('main h1')?.textContent).toBe(page.heading.replaceAll('<br>',''));
  expect(doc.querySelectorAll('[data-client-work-root]')).toHaveLength(1);
  expect(doc.querySelector('[data-example-message="brief"]')?.textContent).toContain(clientWorkScenario('web-design').brief);
  expect(doc.querySelectorAll('[data-client-work-root] select option')).toHaveLength(12);
  expect(doc.querySelector('noscript')?.textContent).toContain('Enable JavaScript');
  expect(doc.body.textContent).toContain('Fictional clients and scripted Twin replies');
  expect(doc.querySelector('iframe,script[src],a[download]')).toBeNull();
  for(const [question]of proposalQuestions[page.proposalPage])expect(doc.body.textContent).toContain(question);
 }

 const [one,two]=proposalPages.map(page=>new DOMParser().parseFromString(proposalContent(page),'text/html'));expect(one.querySelector('h1')?.textContent).not.toBe(two.querySelector('h1')?.textContent);expect(one.body.textContent).toContain('Unknown prices stay blank');expect(two.body.textContent).toContain('A proposed time is a starting point');
});
it('registers two unique canonical routes with only supported page and visible FAQ metadata',()=>{
 expect(proposalPages.map(page=>page.path)).toEqual(['/proposals/','/client-communication/']);for(const page of proposalPages){const metadata=publicPage(page.path)!;expect(metadata.description).toBe(page.description);const schema=structuredMetadata(metadata,{url:'/social/sample.png',width:1730,height:909,sha256:'a'.repeat(64),bytes:1,alt:'Sample'});const json=JSON.stringify(schema);expect(json).toContain('https://bankeiz.com'+page.path);expect(json).toContain('FAQPage');expect(json).not.toMatch(/AggregateRating|ReviewAction|BuyAction|PaymentComplete/);for(const [question,answer]of proposalQuestions[page.proposalPage]){expect(json).toContain(question);expect(json).toContain(answer);}}
});
it('connects the new experience from Business and the relevant independent-work pages without replacing their existing content',()=>{
 const business=new DOMParser().parseFromString(businessContent(),'text/html');expect(business.querySelector('a[href="/proposals/"]')).not.toBeNull();expect(business.querySelector('a[href="/client-communication/"]')).not.toBeNull();expect(business.querySelector('[data-client-work-root]')).not.toBeNull();for(const slug of ['agencies','consultants','freelancers']){const fit=businessFits.find(value=>value.slug===slug)!;const doc=new DOMParser().parseFromString(fitContent(fit),'text/html');expect(doc.querySelector('[data-client-work-root]')).not.toBeNull();expect(doc.querySelector('a[href="/proposals/"]')).not.toBeNull();expect(doc.body.textContent).toContain(fit.headline);}expect(new DOMParser().parseFromString(fitContent(businessFits.find(value=>value.slug==='hospitality')!),'text/html').querySelector('[data-client-work-root]')).toBeNull();
});
it('lets a reader follow the sample immediately while preserving the first frame and making no API or payment calls',()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('No sample network'));document.body.innerHTML=proposalWalkthrough({id:'sample-test'});const first=document.querySelector('.product-screen');init();expect(document.querySelector('.product-screen')).toBe(first);expect(getComputedStyle(document.querySelector('.product-choices')!).display).not.toBe('none');
 const active=()=>document.querySelector('[data-product-panel]:not([hidden])')!;
 const click=(label:string)=>{const control=[...active().querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===label)!;expect(control.hasAttribute('inert')).toBe(false);control.click();};
 click('Draft with your Twin');expect(active().getAttribute('data-product-panel')).toBe('proposal-draft');click('Preview PDF');expect(active().getAttribute('data-product-panel')).toBe('proposal-preview');click('Send proposal');expect(active().getAttribute('data-product-panel')).toBe('proposal-payment');const send=[...active().querySelectorAll('button')].find(button=>button.textContent?.trim()==='Send payment')!;expect(send.hasAttribute('inert')).toBe(true);click('View sample delivery');expect(active().getAttribute('data-product-panel')).toBe('proposal-delivery');expect(active().textContent).toContain('Delivery preview');click('Continue sample conversation');expect(active().getAttribute('data-product-panel')).toBe('proposal-next');expect(active().textContent).toContain('We have not agreed a support price yet.');expect(network).not.toHaveBeenCalled();expect(document.body.textContent).not.toContain('Payment confirmed');
});
