// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {readFileSync} from 'node:fs';
// @ts-expect-error Static guide template is plain ESM.
import {learningDirectoryPage} from '../scripts/learn-template.mjs';
import {businessContent} from '../scripts/business-page.mjs';

it.each(['/your-twin/','/in-action/'])('publishes %s with both sides, native conversation and the existing reviewed Business payment destination',async path=>{
 expect(publicPage(path)?.path).toBe(path);
 const {twinSalesPages,twinPageContent}=await import('../scripts/twin-page.mjs');
 const page=twinSalesPages.find(p=>p.path===path)!;
 const doc=new DOMParser().parseFromString(twinPageContent(page),'text/html');
 expect(doc.querySelector('h1')?.textContent?.length).toBeGreaterThan(15);
 expect(doc.querySelectorAll('[data-process-step]')).toHaveLength(4);
 expect(doc.querySelectorAll('svg[data-twin-art]').length).toBeGreaterThanOrEqual(2);
 expect(doc.querySelector('iframe,canvas,video')).toBeNull();
 expect(doc.querySelectorAll('main img')).toHaveLength(0);
 const purchase=[...doc.querySelectorAll('a[data-business-checkout]')];
 expect(purchase.length).toBeGreaterThanOrEqual(3);
 for(const button of purchase)expect(button.getAttribute('href')).toBe('/#account/messages/business');
 expect(doc.querySelectorAll('[data-coop-twin]')).toHaveLength(1);
 expect(doc.querySelector('.coop-twin-top p')?.textContent).toContain('AI Twin');
 expect(doc.querySelector('#conversation [data-twin-composer]')).not.toBeNull();
 expect(doc.querySelector('#conversation [data-twin-book-form]')).not.toBeNull();
 expect(doc.querySelector('[data-twin-composer] input[name=consent]')?.hasAttribute('required')).toBe(true);
 expect(doc.querySelectorAll('.site-footer a[href="'+path+'"]')).toHaveLength(0);
 expect(siteFooterHtml('/business/')).toContain('href="'+path+'"');
 expect(doc.body.textContent).toContain('contact');expect(doc.body.textContent).toContain('calendar');expect(doc.body.textContent).toContain('context');
 expect(doc.querySelector('.twin-process-note')?.textContent).toContain('Illustrative');
});

it('keeps the new sales routes discoverable, distinct and source-bound in their public previews',()=>{
 const directory=new DOMParser().parseFromString(learningDirectoryPage(),'text/html'),business=new DOMParser().parseFromString(businessContent(),'text/html');
 const rewrites=JSON.parse(readFileSync('vercel.json','utf8')).rewrites as {source:string;destination:string}[];
 for(const path of ['/your-twin/','/in-action/']){
  expect(directory.querySelector('main a[href="'+path+'"]')).not.toBeNull();
  expect(business.querySelector('main a[href="'+path+'"]')).not.toBeNull();
  for(const source of [path,path.slice(0,-1)])expect(rewrites.find(route=>route.source===source)?.destination).toBe(path+'index.html');
  const art=new DOMParser().parseFromString(shareCardSvg(publicPage(path)!),'image/svg+xml');
  expect(art.querySelector('[data-twin-art]')).not.toBeNull();expect(art.querySelector('parsererror')).toBeNull();
  expect(art.documentElement.textContent).not.toMatch(/\$149|month|7,500/);
  expect(art.documentElement.textContent).toContain('Contacts, context and calendar.');
 }
 expect(publicPage('/your-twin/')?.title).not.toBe(publicPage('/in-action/')?.title);
});
