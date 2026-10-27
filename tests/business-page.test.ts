// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {businessContent} from '../scripts/business-page.mjs';
import {businessOffer} from '../src/content/business-offer.mjs';
// @ts-expect-error Existing public templates are plain ESM.
import {learnHeader,learnHome} from '../scripts/learn-template.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
it('presents an actionable monthly offer and direct existing-account purchase intent without private scripts',()=>{
 const html=businessContent(),doc=new DOMParser().parseFromString(html,'text/html');
 expect(doc.querySelector('h1')?.textContent).toBe('Less money admin.More room to run your business.');
 expect(doc.querySelector('.business-price')?.textContent).toContain('$149');
 expect(doc.querySelector('a[data-business-checkout]')?.getAttribute('href')).toBe(businessOffer.checkoutHref);
 expect(doc.body.textContent).toContain('7,500');expect(doc.body.textContent).toContain('$1,499/year');
 expect(doc.body.textContent).toContain('use their supported value without this subscription');
 expect(doc.querySelector('.business-banking a[href="/learn/get-paid/"]')).not.toBeNull();
 expect(doc.body.textContent).toContain('records you choose');
 expect(doc.querySelector('script,iframe')).toBeNull();expect([...doc.querySelectorAll('input')].every(input=>input.closest('[inert]'))).toBe(true);
 expect(doc.querySelector('header')?.outerHTML).toBe(new DOMParser().parseFromString(learnHeader(),'text/html').querySelector('header')?.outerHTML);
 expect(publicPage('/business/')?.title).toContain('$149/month');
 expect(readFileSync('scripts/build-public-pages.mjs','utf8')).toContain('businessContent()');
});
it('uses the existing logo in the top navigation and keeps the name in the footer',()=>{
 const doc=new DOMParser().parseFromString(businessContent(),'text/html');
 expect(doc.querySelector('.learn-brand svg')).not.toBeNull();expect(doc.querySelector('.learn-brand')?.textContent?.trim()).toBe('');
 expect(doc.querySelector('header')?.textContent).not.toContain('Bankeiz');expect(doc.querySelector('.site-footer')?.textContent).toContain('Bankeiz');
 expect(doc.querySelector('header a[href="/business/"]')).not.toBeNull();
});
it('connects free participation to the paid offer without describing fiat funding as destruction',()=>{
 const home=learnHome();expect(home).toContain('Your money.');expect(home).toContain('Its Original carries the record of where it came from, who owns it and how it moved.');expect(home).toContain('href="/business/"');
 const economy=learningPages.find(page=>page.slug==='proof-native-economy')!;
 expect(JSON.stringify(economy)).toContain('Carry the history with the asset and keep the evidence with the payment.');
 expect(JSON.stringify(learningPages.find(page=>page.slug==='deposits'))).toContain('Bring your money into proof');
});

it('makes the monthly value concrete and keeps metered usage in billing details',()=>{
 const doc=new DOMParser().parseFromString(businessContent(),'text/html');
 const hero=doc.querySelector('.business-hero')!;
 expect(hero.textContent).toContain('Know where your money stands');
 expect(hero.textContent).toContain('Make getting paid less work');
 expect(hero.textContent).toContain('Understand what came in, what went out and what needs attention');
 expect(hero.textContent).toContain('Spend less time on financial admin');
 expect(hero.textContent).not.toMatch(/credits|7,500|Twin|Creator AI/);
 expect(doc.querySelector('.business-terms')?.textContent).toContain('Opens your agent. Creates a Receiz ID if needed. Review before paying.');
 expect(doc.querySelector('.business-existing')?.getAttribute('href')).toBe('/#account/messages');
 expect(doc.querySelector('.business-workflow')?.textContent).toContain('available history');
 expect(doc.querySelector('.business-workflow')?.textContent).toContain('Review the details');
 expect(doc.querySelector('.business-benefits')?.textContent).toContain('source behind each answer');
 expect(doc.querySelector('.business-faq')?.textContent).toContain('7,500 monthly AI usage credits; use is metered');
 expect(doc.querySelector('a[href="/fit/"]')).not.toBeNull();
});
