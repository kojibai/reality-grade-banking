// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {businessContent} from '../scripts/business-page.mjs';
// @ts-expect-error Existing public templates are plain ESM.
import {learnHeader,learnHome} from '../scripts/learn-template.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
it('presents an actionable monthly offer and direct existing-account purchase intent without private scripts',()=>{
 const html=businessContent(),doc=new DOMParser().parseFromString(html,'text/html');
 expect(doc.querySelector('h1')?.textContent).toBe('Less explaining.More getting it done.');
 expect(doc.querySelector('.business-price')?.textContent).toContain('$149');
 expect(doc.querySelector('a[data-business-checkout]')?.getAttribute('href')).toBe('/#account/business');
 expect(doc.body.textContent).toContain('7,500');expect(doc.body.textContent).toContain('$1,499/year');
 expect(doc.body.textContent).toContain('use their supported value without this subscription');
 expect(doc.querySelector('.business-banking a[href="/learn/get-paid/"]')).not.toBeNull();
 expect(doc.body.textContent).toContain('records you choose');
 expect(doc.querySelector('script,iframe,input')).toBeNull();
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
 const home=learnHome();expect(home).toContain('Use the value');expect(home).toContain('you already hold.');expect(home).toContain('href="/business/"');
 const economy=learningPages.find(page=>page.slug==='proof-native-economy')!;
 expect(JSON.stringify(economy)).toContain('Use the value you already hold');
 expect(JSON.stringify(learningPages.find(page=>page.slug==='deposits'))).toContain('Bring your money into proof');
});
