// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {standardPages} from '../src/content/standard-pages.mjs';
import {standardContent} from '../scripts/standard-page.mjs';
import {publicPage,publicPages,structuredMetadata} from '../scripts/public-page-metadata.mjs';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {profilePageUsername,profilePagePath} from '../src/receiz/public-profile';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import social from '../public/social/manifest.json';
const parse=(s:string)=>new DOMParser().parseFromString(s,'text/html');
it('adds eleven complete standard documents and retains existing primitives and pages',()=>{
 expect(standardPages.slice(0,11).map(p=>p.path)).toEqual(['/trust/','/money/','/deposit/','/fees/','/help/','/about/','/in-practice/','/accept-payments/','/start/','/privacy/','/terms/']);
 expect(publicPages.filter(page=>standardPages.some(standard=>standard.path===page.path)).map(page=>page.path)).toEqual(standardPages.map(page=>page.path));expect(new Set(publicPages.map(page=>page.path)).size).toBe(publicPages.length);
 for(const p of standardPages){const d=parse(standardContent(p));expect(publicPage(p.path)?.id).toBe('standard-'+p.key);expect(d.querySelector('h1')?.textContent).toBeTruthy();expect(d.querySelectorAll('main section').length).toBeGreaterThanOrEqual(5);expect(d.querySelector('canvas,iframe,video')).toBeNull();expect(d.querySelector('main')?.textContent).not.toMatch(/FDIC.insured|guaranteed returns|cannot be hacked|24.7 support|Kojib/);expect(d.querySelector('main')?.textContent).toContain('Illustrative');expect(d.querySelector('footer a[href="'+p.path+'"]')).toBeNull();for(const a of d.querySelectorAll('[data-business-checkout]'))expect(a.getAttribute('href')).toBe('/#account/messages/business');}
 for(const path of ['/protect/','/proof/','/business/','/id/','/learn/deposits/'])expect(publicPage(path)).toBeDefined();
});
it('keeps standard URLs distinct from named profiles and canonicalizes the alternate entrances',()=>{
 for(const path of [...standardPages.map(p=>p.path),'/customers/','/switch/','/docs/']){const name=path.slice(1,-1);if(/^[a-z0-9_]{3,24}$/.test(name)){expect(profilePageUsername(path)).toBeNull();expect(profilePagePath(name)).toBe('/u/'+name+'/');expect(profilePageUsername('/u/'+name+'/')).toBe(name);}}
 expect(canonicalPublicPath('/customers')).toBe('/in-practice/');expect(canonicalPublicPath('/switch/')).toBe('/start/');
 const deployment=JSON.parse(readFileSync('vercel.json','utf8'));for(const p of [...standardPages.map(p=>[p.path,p.path]),['/customers/','/in-practice/'],['/switch/','/start/']])for(const path of [p[0],p[0].slice(0,-1)])expect(deployment.rewrites.find((r:{source:string})=>r.source===path)?.destination).toBe(p[1]+'index.html');
});
it('keeps money, safety, privacy and service terms scoped to their real sources',()=>{
 const page=(key:string)=>parse(standardContent(standardPages.find(p=>p.key===key)!));
 expect(page('money').querySelector('main')?.textContent).toContain('Reserve');expect(page('money').querySelector('main')?.textContent).toContain('Settlement');expect(page('money').querySelector('main')?.textContent).toContain('valuation');
 expect(page('help').querySelector('a[href="/book/bjklock/"]')?.getAttribute('onclick')).toContain("import('/learn/contact.js')");expect(page('privacy').querySelector('a[href="https://receiz.com/privacy"]')).not.toBeNull();expect(page('terms').querySelector('a[href="/legal/"]')).not.toBeNull();
 expect(page('in-practice').querySelector('a[href="/in-action/#conversation"]')).not.toBeNull();expect(page('deposit').querySelector('a[href="/"]')).not.toBeNull();
});
it.each(['trust','money','deposit','fees','help','about','in-practice','accept-payments','start','privacy','terms'])('gives %s a distinct responsive illustration and price-free sharing story',key=>{
 const p=standardPages.find(p=>p.key===key)!,d=parse(standardContent(p));expect(d.querySelector('[data-standard-art="'+key+'"]')).not.toBeNull();expect(d.querySelector('.st-art-phone svg')?.getAttribute('viewBox')).toBe('0 0 360 620');
 const svg=new DOMParser().parseFromString(shareCardSvg(publicPage(p.path)!),'image/svg+xml');expect(svg.querySelector('parsererror')).toBeNull();expect(svg.documentElement.textContent).not.toMatch(/\$149|\/month|FDIC/);expect(svg.querySelector('[data-standard-art="'+key+'"]')).not.toBeNull();
});

it('explains the market from rights through advisory quote, execution and original-result recovery',()=>{
 const at=(key:string)=>parse(standardContent(standardPages.find(p=>p.key===key)!)).querySelector('main')!.textContent!;
 expect(standardPages.filter(p=>p.path.startsWith('/market/'))).toHaveLength(7);
 expect(at('market-buy')).toContain('advisory');expect(at('market-sell')).toContain('outside-bank');expect(at('market-ownership')).toContain('copyright');expect(at('market-history').toLowerCase()).toContain('market observation');expect(at('market-value')).toContain('remaining cost basis');expect(at('market-costs')).toContain('liquidity');
});

it('publishes the same explicit economy banking infrastructure definitions for search readers',()=>{
 const graph=structuredMetadata(publicPage('/market/')!,social.images['/market/'])['@graph'] as any[];const terms=graph.find((x:any)=>x['@type']==='DefinedTermSet') as any;expect(terms.hasDefinedTerm.map((x:any)=>x.name)).toEqual(['Proof-native economy','Reality-grade banking','Reality-grade infrastructure']);expect(terms.hasDefinedTerm[2].description).toContain('Receiz');expect(terms.hasDefinedTerm[2].description).toContain('MCP');
});
it('keeps the established six footer columns and exposes the complete standard suite without orphan groups',()=>{
 const doc=parse(standardContent(standardPages[0])),footer=doc.querySelector('.site-footer')!;
 expect(footer.querySelectorAll('.site-footer-main>nav')).toHaveLength(6);
 for(const page of standardPages.filter(p=>p.key!=='trust'))expect(footer.querySelector('a[href="'+page.path+'"]'),page.path).not.toBeNull();
 expect(footer.querySelector('a[href="/docs/"]')).not.toBeNull();
});
