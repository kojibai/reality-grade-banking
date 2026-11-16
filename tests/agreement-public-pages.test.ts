// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {publicPage,publicPages,applyPublicMetadata,structuredMetadata} from '../scripts/public-page-metadata.mjs';
import {agreementPages,agreementQuestions} from '../src/content/agreement-pages.mjs';
// @ts-expect-error Public content templates are plain ESM.
import {agreementContent} from '../scripts/agreement-pages.mjs';
import {proposalPages} from '../src/content/proposal-pages.mjs';
// @ts-expect-error Public content templates are plain ESM.
import {proposalContent} from '../scripts/proposal-pages.mjs';

it('registers separate indexable document-generation and agreement-signing entrances',()=>{
 for(const path of ['/ai-documents/','/sign-agreements/']){
  const page=publicPage(path);expect(page,path).toBeDefined();expect(page?.noindex).not.toBe(true);expect(page?.title).toContain('AI counterpart');expect(page?.faq?.length).toBeGreaterThan(0);expect(publicPages.filter(row=>row.path===path)).toHaveLength(1);
 }
 expect(publicPage('/ai-documents/')?.title).toMatch(/PDF|Word/);expect(publicPage('/sign-agreements/')?.title).toContain('Receiz ID');
});

it('serves useful complete document and signing content before JavaScript without claiming a signed sample',()=>{
 for(const page of agreementPages){
  const doc=new DOMParser().parseFromString(agreementContent(page),'text/html');
  expect(doc.querySelector('main h1')?.textContent).toBe(page.heading.replaceAll('<br>',''));expect(doc.body.textContent).toContain('an AI version of you');
  expect(doc.body.textContent).toMatch(/selected recent excerpts/);expect(doc.body.textContent).toMatch(/full (chat )?history stays available/i);
  for(const [question,answer]of agreementQuestions[page.agreementPage]){expect(doc.querySelector('#questions')?.textContent).toContain(question);expect(doc.querySelector('#questions')?.textContent).toContain(answer);}
  for(const href of ['/#account/messages','/business/','/proposals/','/client-communication/'])expect(doc.querySelector(`a[href="${href}"]`),href).not.toBeNull();
  expect(doc.querySelector('script[src],iframe')).toBeNull();expect(doc.body.textContent).not.toMatch(/biometric|first.page ranking|legally binding|voice clone|verified identity holder/i);
 }
 const documents=new DOMParser().parseFromString(agreementContent(agreementPages[0]),'text/html'),signing=new DOMParser().parseFromString(agreementContent(agreementPages[1]),'text/html');
 for(const format of ['PDF','DOCX','XLSX','PPTX'])expect(documents.body.textContent).toContain(format);expect(documents.querySelectorAll('[data-client-work-root]')).toHaveLength(1);expect(documents.querySelector('[data-example-message="brief"]')).not.toBeNull();expect(JSON.parse(documents.querySelector<HTMLElement>('[data-client-work-root]')!.dataset.clientWorkProps!).intent).toBe('document');expect(documents.querySelector('a[download]')).toBeNull();expect(documents.querySelector('noscript')).not.toBeNull();expect(JSON.parse(signing.querySelector<HTMLElement>('[data-client-work-root]')!.dataset.clientWorkProps!).intent).toBe('agreement');
 expect(signing.querySelectorAll('[aria-label="Agreement signing steps"] article')).toHaveLength(3);expect(signing.body.textContent).toContain('Each person signs for themselves');expect(signing.body.textContent).toContain('complete original agreement');expect(signing.body.textContent).toContain('full reviewed terms');expect(signing.body.textContent).toContain('signer’s Receiz ID signature');expect(signing.querySelector('[data-proposal-walkthrough],a[download]')).toBeNull();
 expect(documents.querySelector('h1')?.textContent).not.toBe(signing.querySelector('h1')?.textContent);
});

it('uses visible FAQs and distinct canonical sharing metadata for both public entrances',()=>{
 const image={url:'/social/example.png',width:1730,height:909,sha256:'a'.repeat(64),bytes:1,alt:'Illustrative document'};
 for(const page of agreementPages){
  const metadata=publicPage(page.path)!,html=applyPublicMetadata(`<html><head></head><body>${agreementContent(page)}</body></html>`,metadata,image),doc=new DOMParser().parseFromString(html,'text/html');
  expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://bankeiz.com'+page.path);expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toContain('index,follow');expect(doc.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(metadata.title);expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
  const graph=structuredMetadata(metadata,image)['@graph'] as Array<{'@type':string;mainEntity?:Array<{name:string;acceptedAnswer:{text:string}}>}>;const faq=graph.find(row=>row['@type']==='FAQPage'),entries=faq?.mainEntity??[];expect(entries).toHaveLength(agreementQuestions[page.agreementPage].length);
  for(const row of entries){expect(doc.querySelector('#questions')?.textContent).toContain(row.name);expect(doc.querySelector('#questions')?.textContent).toContain(row.acceptedAnswer.text);}
  expect(JSON.stringify(graph)).not.toMatch(/AggregateRating|SignAction|PaymentComplete|LegalService/);
 }
});

it('connects both document entrances from the matching proposal and client-communication pages',()=>{
 for(const page of proposalPages){const doc=new DOMParser().parseFromString(proposalContent(page),'text/html');for(const path of ['/ai-documents/','/sign-agreements/'])expect(doc.querySelector(`nav[aria-label="Related client workflows"] a[href="${path}"]`),path).not.toBeNull();}
});
