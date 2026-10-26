// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {economyPages,economySuite} from '../src/content/existing-economy.mjs';
import {economyContent} from '../scripts/economy-page.mjs';
import {cooperativePages,cooperativeContent} from '../scripts/cooperative-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
it('adds seven distinct entrances beside the preserved cooperative suite',()=>{
 expect(economySuite.map(p=>p.path)).toEqual(['/economy/','/cooperatives/','/farmers/','/fuel/','/repairs/','/grocers/','/housing/','/workers/']);
 expect(economyPages).toHaveLength(7);const headlines=new Set<string>();
 for(const page of economyPages){const doc=parse(economyContent(page));headlines.add(doc.querySelector('h1')!.textContent!);
  expect(doc.querySelector('h1')?.textContent).toBe(page.headline.join(' '));expect(doc.body.textContent).toContain(page.needs);
  expect(doc.querySelector('.learn-brand svg')).not.toBeNull();expect(doc.querySelectorAll('[data-coop-twin]')).toHaveLength(1);
  expect(doc.querySelector('a[href="#conversation"]')).not.toBeNull();expect(doc.querySelector('[data-twin-composer] textarea')).not.toBeNull();
  expect(doc.querySelector('script,iframe')).toBeNull();expect(doc.querySelector('[data-twin-history],[data-new-chat]')).toBeNull();
  expect(doc.querySelector('.site-footer a[href="'+page.path+'"]')).toBeNull();
  expect(publicPage(page.path)?.description).toBe(page.description);
  expect(profilePageUsername(page.path)).toBeNull();expect(profilePagePath(page.key)).toBe('/u/'+page.key+'/');
  const xml=new DOMParser().parseFromString(shareCardSvg(publicPage(page.path)!),'image/svg+xml');
  expect(xml.querySelector('[data-economy-share]')).not.toBeNull();expect(xml.documentElement.textContent).not.toMatch(/149|month/);
 }
 expect(headlines.size).toBe(7);expect(cooperativePages).toHaveLength(10);expect(canonicalPublicPath('/cooperatives/')).toBe('/coops/');
});
it('places infrastructure, standard, independent experiences and exact evidence scopes on all eight entrances',()=>{
 const documents=[...economyPages.map(economyContent),cooperativeContent()];
 for(const html of documents){const doc=parse(html);const architecture=doc.querySelector('[data-economy-architecture]');
  expect(architecture?.textContent).toContain('Receiz');expect(architecture?.textContent).toContain('Reality-Grade Banking');expect(architecture?.textContent).toContain('Your experience');
  expect(architecture?.textContent).toContain('reference implementation');expect(architecture?.textContent).toContain('own branding');
  const evidence=doc.querySelector('[data-economy-conformance]');expect(evidence?.textContent).toContain('synthetic');expect(evidence?.textContent).toMatch(/production/i);
  for(const href of ['/conformance/','https://github.com/kojibai/reality-grade-banking','https://github.com/kojibai/reality-grade-banking/blob/main/docs/conformance/integration-and-assessment.md','https://github.com/kojibai/reality-grade-banking/blob/main/CONFORMANCE.md'])expect(evidence?.querySelector(`a[href="${href}"]`)).not.toBeNull();
 }
});
it('resolves every same-page conversion link to an actual destination across all eight entrances',()=>{
 for(const html of [...economyPages.map(economyContent),cooperativeContent()]){const doc=parse(html);for(const anchor of doc.querySelectorAll<HTMLAnchorElement>('main a[href^="#"]')){const target=anchor.getAttribute('href')!.slice(1);expect(doc.getElementById(target),anchor.textContent+' → #'+target).not.toBeNull();}}
});
it('uses a source-connected proof object at the center of the circulation rather than a currency symbol',()=>{
 const doc=parse(economyContent()),center=doc.querySelector('.ec-circle-center')!;expect(center.querySelector('.ec-center-proof svg')).not.toBeNull();expect(center.textContent).not.toMatch(/\$|Φ/);expect(center.textContent).toContain('The value stays connected.');
});
it('renders six independent frontend views beneath one explicitly illustrative value/source relationship',()=>{
 const doc=parse(economyContent());expect(doc.querySelectorAll('[data-economy-interface]')).toHaveLength(6);expect(doc.querySelectorAll('[data-economy-interface-panel]')).toHaveLength(6);
 expect(doc.querySelectorAll('[data-economy-interface-panel]:not([hidden])')).toHaveLength(1);
 expect(new Set([...doc.querySelectorAll('[data-economy-source]')].map(e=>e.getAttribute('data-economy-source'))).size).toBe(1);
 expect(doc.body.textContent).toContain('The frontend changes. The proof doesn’t.');expect(doc.body.textContent).toContain('No funds move');
 expect(doc.querySelector('[data-economy-boundaries]')?.textContent).toMatch(/Glyph[\s\S]*Settlement[\s\S]*Reserve[\s\S]*ownership[\s\S]*USD[\s\S]*exchange price[\s\S]*receiving[\s\S]*offline proof[\s\S]*offline financial/i);
 expect(siteFooterHtml('/business/')).toContain('href="/economy/"');expect(parse(siteFooterHtml('/economy/')).querySelector('a[href="/economy/"]')).toBeNull();
});
