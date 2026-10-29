// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {togetherPages,togetherPage,togetherContent} from '../scripts/together-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
it('gives Together its own complete invitation, source-bound value story, native Twin and canonical identity',()=>{
 const doc=new DOMParser().parseFromString(togetherContent(),'text/html');
 expect(togetherPage.path).toBe('/together/');expect(publicPage('/together/')?.id).toBe('together');expect(publicPage('/cooperate/')).toBe(publicPage('/coops/'));expect(publicPage('/together/')).not.toBe(publicPage('/coops/'));
 expect(doc.querySelector('h1')?.textContent).toContain('You create the value.');expect(doc.querySelector('.learn-brand svg')).not.toBeNull();expect(doc.querySelectorAll('[data-process-step]')).toHaveLength(4);expect(doc.querySelectorAll('svg[data-together-art]').length).toBeGreaterThanOrEqual(2);
 expect(doc.querySelector('[data-coop-twin]')).not.toBeNull();expect(doc.querySelector('[data-twin-composer] textarea')).not.toBeNull();expect(doc.querySelector('[data-twin-book-form]')).toBeNull();expect(doc.querySelector('[data-twin-composer]')?.textContent).toContain('Sending shares this conversation');expect(doc.querySelector('[data-coop-twin]')?.textContent).toContain('BJ Klock');expect(doc.querySelector('[data-coop-twin]')?.textContent).not.toContain('your cooperative');
 expect(doc.querySelector('script,iframe')).toBeNull();expect(doc.querySelector('button[aria-label*="Pause"]')).toBeNull();expect(doc.querySelector('a[href="/#account"]')).not.toBeNull();expect(doc.body.textContent).toContain('Settlement');expect(doc.body.textContent).toContain('approve the payment');expect(doc.querySelector('.site-footer')).not.toBeNull();
 for(const name of ['together','cooperate']){expect(profilePageUsername('/'+name+'/')).toBeNull();expect(profilePagePath(name)).toBe('/u/'+name+'/');expect(profilePageUsername('/u/'+name+'/')).toBe(name);}
 expect(siteFooterHtml('/business/')).toContain('href="/together/"');expect(new DOMParser().parseFromString(siteFooterHtml('/together/'),'text/html').querySelector('a[href="/together/"]')).toBeNull();
 const share=new DOMParser().parseFromString(shareCardSvg(publicPage('/together/')!),'image/svg+xml');expect(share.querySelectorAll('[data-together-art]')).toHaveLength(1);expect(share.documentElement.textContent).not.toMatch(/149|month/);
});

it('gives every participation route unique readable copy, its own story, inline conversation and complete internal discovery',()=>{
 const headings=new Set<string>();for(const page of togetherPages){const doc=new DOMParser().parseFromString(togetherContent(page),'text/html');headings.add(doc.querySelector('h1')!.textContent!);expect(publicPage(page.path)?.description).toBe(page.description);expect(doc.querySelectorAll('[data-coop-twin]')).toHaveLength(1);expect(doc.querySelectorAll('[data-process-step]')).toHaveLength(4);expect(doc.querySelector('a[href="#conversation"]')).not.toBeNull();expect(doc.querySelector('.site-footer a[href="'+page.path+'"]')).toBeNull();}
 expect(headings.size).toBe(7);
});
