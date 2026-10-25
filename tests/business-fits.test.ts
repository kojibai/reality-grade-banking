// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {businessFits,fitGroups,businessFitPages} from '../src/content/business-fits.mjs';
import {fitContent,directoryContent} from '../scripts/business-fit-pages.mjs';
import {businessOffer} from '../src/content/business-offer.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {readFileSync} from 'node:fs';
// @ts-expect-error Public enhancement is standalone ESM.
import {init} from '../public/learn/business-fit.js';

it('covers distinct useful fits with complete public journeys and canonical metadata',()=>{
 expect(businessFits).toHaveLength(30);
 for(const key of ['slug','headline','description','scenario']) expect(new Set(businessFits.map(fit=>fit[key as keyof typeof fit])).size).toBe(businessFits.length);
 for(const fit of businessFits){
  expect(fitGroups.some(group=>group.id===fit.group)).toBe(true);
  expect(fit.benefits).toHaveLength(3);expect(fit.steps).toHaveLength(3);
  const path=`/business/for/${fit.slug}/`,doc=new DOMParser().parseFromString(fitContent(fit),'text/html');
  expect(doc.querySelector('h1')?.textContent).toBe(fit.headline);
  expect(doc.querySelector('a[data-business-checkout]')?.getAttribute('href')).toBe('/#account/messages/business');
  expect(doc.querySelector('a[href="/fit/"]')).not.toBeNull();
  expect(doc.querySelector('.business-banking a[href="/learn/get-paid/"]')).not.toBeNull();
  expect(doc.body.textContent).toContain('banking experience');
  expect(doc.querySelectorAll('.business-scene-layer')).toHaveLength(3);
  expect(doc.querySelector('.business-scene input,.business-scene button')).toBeNull();
  expect(doc.querySelector('.business-scene')?.getAttribute('aria-label')).toContain(fit.visualLabels[0]);
  expect(doc.querySelector('header')?.textContent).not.toContain('Bankeiz');
  expect(doc.querySelector('.business-offer')?.textContent).not.toMatch(/credits/i);
  expect(doc.querySelector('script,iframe')).toBeNull();
  expect(publicPage(path)?.id).toBe(`business-fit-${fit.slug}`);
  expect(businessFitPages.some(page=>page.path===path)).toBe(true);
 }
});
it('filters locally, clears empty results and reinitializes after retained navigation',async()=>{
 document.body.innerHTML=directoryContent();init();init();
 const input=document.querySelector<HTMLInputElement>('input[type="search"]')!;
 input.value='agency';input.dispatchEvent(new Event('input',{bubbles:true}));
 expect([...document.querySelectorAll<HTMLElement>('[data-fit]')].filter(item=>!item.hidden).length).toBeGreaterThan(0);
 input.value='no-such-work-xyz';input.dispatchEvent(new Event('input',{bubbles:true}));
 expect(document.querySelector<HTMLElement>('[data-fit-empty]')?.hidden).toBe(false);
 document.querySelector<HTMLFormElement>('form')!.reset();
 expect(document.querySelectorAll('[data-fit][hidden]')).toHaveLength(0);
 document.querySelector<HTMLButtonElement>('[data-fit-goal="create"]')!.click();
 expect([...document.querySelectorAll<HTMLElement>('[data-fit]')].filter(item=>!item.hidden).every(item=>item.dataset.goal==='create')).toBe(true);
 document.body.innerHTML=directoryContent();init();
 const select=document.querySelector<HTMLSelectElement>('select')!;select.value='clients';select.dispatchEvent(new Event('change',{bubbles:true}));
 expect([...document.querySelectorAll<HTMLElement>('[data-fit]')].filter(item=>!item.hidden).every(item=>item.dataset.group==='clients')).toBe(true);
});
it('keeps the entire useful directory readable before filtering, and assets outside shared first paint',()=>{
 const doc=new DOMParser().parseFromString(directoryContent(),'text/html');
 expect(doc.querySelectorAll('[data-fit]')).toHaveLength(businessFits.length);
 expect(doc.querySelectorAll('[data-fit][hidden]')).toHaveLength(0);
 expect(doc.querySelector('input[type="search"]')?.getAttribute('aria-label')).toBe('Find your work or goal');
 expect(doc.querySelector('select')?.querySelectorAll('option')).toHaveLength(fitGroups.length+1);
 const css=readFileSync('public/learn/business.css','utf8');
 expect(css).toContain('prefers-reduced-motion');expect(css).toContain('animation-play-state:paused');
 expect(css).toContain('document-hidden');expect(css).toContain('.business-scene:not(.in-view)');
 expect(readFileSync('scripts/learn-assets.mjs','utf8')).not.toContain('business.css');
});

it('puts three audience-specific results beside every $149 offer and sends every Get Business action to the same bottom-review entry',()=>{
 const cards=new Set<string>();
 for(const fit of businessFits){
  const doc=new DOMParser().parseFromString(fitContent(fit),'text/html');
  const outcomes=[...doc.querySelectorAll('.business-offer>ul>li')].map(li=>li.textContent);
  expect(outcomes,fit.slug).toEqual(fit.benefits.map(([outcome])=>outcome));
  cards.add(outcomes.join('|'));
  const actions=[...doc.querySelectorAll<HTMLAnchorElement>('a')].filter(a=>a.textContent?.trim().startsWith('Get Business'));
  expect(actions.length,fit.slug).toBe(3);
  for(const action of actions){
   expect(action.hasAttribute('data-business-checkout'),fit.slug).toBe(true);
   expect(action.getAttribute('href'),fit.slug).toBe(businessOffer.checkoutHref);
   expect(action.getAttribute('href'),fit.slug).toBe('/#account/messages/business');
  }
  expect(doc.querySelector('.fit-close h2')?.textContent,fit.slug).toBe(fit.benefits[0][0]);
  expect(doc.querySelector('.fit-hero')?.textContent,fit.slug).not.toMatch(/credits|7,500|your frame|production integrations/i);
 }
 expect(cards.size).toBe(30);
});
