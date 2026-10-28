// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import type {PreviewServer} from 'vite';
import {readFileSync} from 'node:fs';
import {publicPage,publicPages} from '../scripts/public-page-metadata.mjs';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
// @ts-expect-error Static guide templates are standalone ESM.
import {learnArticle,learningDirectoryPage} from '../scripts/learn-template.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');

it('publishes one canonical identity continuity document while preserving its legacy address',()=>{
 const page=publicPage('/id/');expect(page).toBeDefined();expect(page?.id).toBe('identity-continuity');
 expect(canonicalPublicPath('/learn/identity-continuity/?from=guide')).toBe('/id/');
 expect(publicPage('/learn/identity-continuity/')).toBe(page);expect(publicPages).toHaveLength(150);
 const rewrites=JSON.parse(readFileSync('vercel.json','utf8')).rewrites;
 for(const source of ['/id','/id/','/learn/identity-continuity','/learn/identity-continuity/'])expect(rewrites.find((row:{source:string})=>row.source===source)?.destination).toBe('/id/index.html');
});

it('demonstrates the same representative identity without executing authentication or claiming an unverified ceremony',async()=>{
 const {identityContinuityContent}=await import('../scripts/identity-continuity-page.mjs');
 const doc=parse(identityContinuityContent());expect(doc.querySelectorAll('section[data-id-section]')).toHaveLength(12);
 const hero=doc.querySelector('#identity-overview')!;expect(hero.textContent).toContain('Authentication opens the door.');expect(hero.textContent).toContain('Continuity');
 const ids=Array.from(doc.querySelectorAll('[data-demo-identity]'),node=>node.textContent);expect(ids).toEqual(['alex.receiz.id','alex.receiz.id']);
 const toggle=doc.querySelector('#identity-demo-toggle') as HTMLInputElement;expect(toggle.type).toBe('checkbox');toggle.click();expect(toggle.checked).toBe(true);
 expect(doc.querySelector('#identity-demo-disclaimer')?.textContent).toBe('Illustrative demonstration · No account is accessed');
 expect(doc.querySelector('form,iframe,video,canvas,script')).toBeNull();expect(doc.querySelector('a[data-open-bankeiz]')?.getAttribute('href')).toBe('/');
 expect(doc.querySelector('a[href="https://receiz.com/id/"]')).not.toBeNull();
 expect(doc.querySelector('#identity-observation')?.textContent).toContain('User-reported');expect(doc.querySelector('#identity-observation')?.textContent).toContain('does not independently qualify a physical iPhone');
 expect(doc.querySelector('#identity-security')?.textContent).toContain('does not authorize a payment');
 expect(doc.querySelectorAll('#identity-architecture details')).toHaveLength(6);
 const sources=Array.from(doc.querySelectorAll('#identity-sources a'),node=>node.getAttribute('href'));
 for(const suffix of ['app/lib/auth/passkey.ts','app/lib/auth/relatedOrigins.ts','app/api/auth/passkey/begin/route.ts','app/api/auth/passkey/finish/route.ts','docs/pbi-recovery-receiz-id-binding.md','docs/receiz-identity-continuity-one-pager.md'])expect(sources).toContain('https://github.com/kojibai/receiz/blob/main/'+suffix);
 expect(sources).toContain('https://github.com/kojibai/reality-grade-banking/blob/main/src/receiz/native-identity.ts');
});

it('keeps identity discovery, current-footer omission and its distinct price-free sharing art',async()=>{
 expect(parse(siteFooterHtml('/learn/')).querySelector('a[href="/id/"]')).not.toBeNull();expect(parse(siteFooterHtml('/id/')).querySelector('a[href="/id/"]')).toBeNull();
 expect(parse(learningDirectoryPage()).querySelector('main a[href="/id/"]')).not.toBeNull();
 for(const slug of ['receiz-id','security']){const page=learningPages.find(item=>item.slug===slug)!;expect(parse(learnArticle(page,learningPages,(value:string)=>value)).querySelector('main a[href="/id/"]')).not.toBeNull();}
 const svg=new DOMParser().parseFromString(shareCardSvg(publicPage('/id/')!),'image/svg+xml');expect(svg.querySelector('parsererror')).toBeNull();expect(svg.querySelector('[data-identity-art]')).not.toBeNull();expect(svg.documentElement.textContent).not.toMatch(/\$|price|month/i);expect(svg.documentElement.textContent).toContain('The same you.');
 const {publicMetadataPlugin}=await import('../scripts/public-metadata-plugin.mjs');let middleware:any;const configure=publicMetadataPlugin().configurePreviewServer;if(typeof configure!=='function')throw Error('PUBLIC_PREVIEW_REQUIRED');configure.call(undefined as never,{middlewares:{use(fn:any){middleware=fn;}}} as unknown as PreviewServer);const request={url:'/learn/identity-continuity/?from=guide'};middleware(request,{},()=>{});expect(request.url).toBe('/id/index.html?from=guide');
});
