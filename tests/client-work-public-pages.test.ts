// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {clientWorkScenarios} from '../src/content/client-work-scenarios.mjs';
import {clientWorkDemo} from '../scripts/client-work-demo.mjs';
import {publicPage,publicPages,structuredMetadata} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Static public template is plain ESM.
import {clientWorkProductContent} from '../scripts/client-work-product-pages.mjs';
import {clientWorkProductPages} from '../src/content/client-work-product-pages.mjs';

it('carries a complete selected conversation with unique hydration IDs instead of an empty mount or all scenario frames',()=>{
 const doc=new DOMParser().parseFromString(clientWorkDemo({id:'first',scenarioId:'photography',intent:'invoice'})+clientWorkDemo({id:'second',intent:'proposal'}),'text/html');
 const ids=[...doc.querySelectorAll('[id]')].map(element=>element.id);expect(new Set(ids).size).toBe(ids.length);
 for(const root of doc.querySelectorAll<HTMLElement>('[data-client-work-root]')){
  expect(root.querySelectorAll('[data-client-work-demo]')).toHaveLength(1);
  expect(root.querySelector('[data-example-message="brief"]')?.textContent?.length).toBeGreaterThan(100);
  expect(root.querySelectorAll('select option')).toHaveLength(12);
  expect(root.querySelector('dialog,iframe,script')).toBeNull();
  expect(root.querySelectorAll('[data-example-message="brief"]')).toHaveLength(1);
 }
 expect(doc.body.textContent).toContain(clientWorkScenarios.find(row=>row.id==='photography')!.brief);
 expect(doc.body.textContent).toContain('Fictional clients and scripted Twin replies');
 expect(()=>clientWorkDemo({id:'bad"id'})).toThrow();
});
it('assigns distinct indexable invoice and client management owners with visible FAQs and supported account entrances',()=>{
 expect(clientWorkProductPages.map(page=>page.path)).toEqual(['/business/invoices/','/business/client-management/']);
 for(const page of clientWorkProductPages){
  const html=clientWorkProductContent(page),doc=new DOMParser().parseFromString(html,'text/html'),metadata=publicPage(page.path)!;
  expect(doc.querySelector('h1')?.textContent).toBe(page.heading.replaceAll('<br>',''));
  expect(doc.querySelector('[data-client-work-root]')).not.toBeNull();
  expect(JSON.parse(doc.querySelector<HTMLElement>('[data-client-work-root]')!.dataset.clientWorkProps!).intent).toBe(page.intent);
  expect(doc.querySelector('a[href="/#account/messages"]')).not.toBeNull();
  expect(publicPages.filter(row=>row.path===page.path)).toHaveLength(1);expect(metadata.noindex).not.toBe(true);
  const schema=JSON.stringify(structuredMetadata(metadata,{url:'/social/test.png',width:1730,height:909,sha256:'a'.repeat(64),bytes:1,alt:'Example'}));
  for(const [question,answer]of page.questions){expect(doc.querySelector('#questions')?.textContent).toContain(question);expect(doc.querySelector('#questions')?.textContent).toContain(answer);expect(schema).toContain(question);}
  expect(schema).not.toMatch(/AggregateRating|PaymentComplete|SignAction/);
 }
});
it('keeps runtime code outside account entry and preserves the existing new-input authority boundaries',()=>{
 const entry=readFileSync('src/adoption/client-work-public.tsx','utf8');
 expect(entry).toContain('hydrateRoot');expect(entry).toContain('root.unmount()');expect(entry).toContain('receiz-learn:page');
 for(const file of ['src/adoption/client-work-public.tsx','src/presentation/ClientWorkDemo.tsx','src/presentation/client-work-session.ts'])expect(readFileSync(file,'utf8')).not.toMatch(/createNativeIdentity|localStorage|indexedDB|fetch\(|createChatProposalWorkspace\(|createChatDocumentWorkspace\(/);
});
