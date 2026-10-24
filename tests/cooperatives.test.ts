// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {cooperativeContent,cooperativePages} from '../scripts/cooperative-page.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {profilePageUsername,profilePagePath} from '../src/receiz/public-profile';
import {publicMetadataPlugin} from '../scripts/public-metadata-plugin.mjs';
import type {PreviewServer} from 'vite';

// A missing sector route, false live status or first-paint username collision must fail.
it('opens the independent cooperative suite with honest usable first paint and a fixed application route',()=>{
 expect(cooperativePages.map(p=>p.path)).toEqual(['/cooperatives/','/cooperatives/producers/','/cooperatives/manufacturing/','/cooperatives/distribution/','/cooperatives/workers/','/cooperatives/energy/','/cooperatives/housing/','/cooperatives/federations/','/cooperatives/infrastructure/','/cooperatives/connect/']);
 const mains=new Set<string>();
 for(const page of cooperativePages){
  const doc=new DOMParser().parseFromString(cooperativeContent(page),'text/html');
  expect(doc.querySelector('h1')?.textContent).toBeTruthy();mains.add(doc.querySelector('h1')!.textContent!);
  expect(doc.querySelector('.learn-header .learn-brand svg')).not.toBeNull();
  expect(doc.querySelector('.site-footer')).not.toBeNull();
  expect(doc.querySelector('a[href="/cooperatives/connect/"]')).not.toBeNull();
  expect(doc.querySelector('script,iframe')).toBeNull();expect(publicPage(page.path)?.description).toBe(page.description);
 }
 expect(mains.size).toBe(10);
 const doc=new DOMParser().parseFromString(cooperativeContent(),'text/html');
 expect(doc.querySelectorAll('[data-object-choice]').length).toBe(6);expect(doc.querySelectorAll('[data-network-choice]').length).toBe(6);
 expect(doc.querySelector('[data-object-panel]')?.textContent).toContain('Illustrative');
 expect(doc.querySelector('[data-network-panel]')?.textContent).toContain('fiat');
 expect(doc.querySelector('[data-process]')?.getAttribute('aria-label')).toContain('Illustrative');
 expect(doc.body.textContent).toContain('reference valuation');expect(doc.body.textContent).toContain('does not create Settlement');
 expect(doc.querySelector('button[aria-label*="Pause"]')).toBeNull();
});

it('keeps every known cooperative alias public without changing unknown or existing Business paths',()=>{
 expect(profilePageUsername('/cooperatives/')).toBeNull();expect(profilePagePath('cooperatives')).toBe('/u/cooperatives/');
 let middleware!:(req:{url:string},res:unknown,next:()=>void)=>void;
 const configure=publicMetadataPlugin().configurePreviewServer;if(typeof configure!=='function')throw Error('PUBLIC_PREVIEW_REQUIRED');
 configure.call(undefined as never,{middlewares:{use:(fn:typeof middleware)=>{middleware=fn;}}} as unknown as PreviewServer);
 for(const [url,expected] of [['/cooperatives','/cooperatives/index.html'],['/cooperatives/housing?ref=network','/cooperatives/housing/index.html?ref=network'],['/cooperatives/connect/','/cooperatives/connect/index.html'],['/cooperatives/unknown','/cooperatives/unknown'],['/business','/business/index.html']]){
  const req={url};middleware(req,null,()=>{});expect(req.url).toBe(expected);
 }
});
