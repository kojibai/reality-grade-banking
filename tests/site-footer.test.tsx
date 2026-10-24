// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import {footerGroups,footerNotices} from '../branding/site-footer.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {SiteFooter} from '../src/components/SiteFooter';
import {canonicalPublicPath,publicRouteAliases} from '../src/content/public-routes.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');

it('keeps one Businesses explainer, no Business offer or price, and all fifteen asset destinations',()=>{
 const doc=parse(siteFooterHtml('/protect/')),footer=doc.querySelector('.site-footer')!;
 expect(footer.querySelector('a[href="/business/"]')).toBeNull();
 expect(footer.textContent).not.toContain('$149');
 expect([...footer.querySelectorAll('a')].filter(a=>a.textContent==='Businesses')).toHaveLength(1);
 expect(footer.querySelector('a[href="/for/businesses/"]')?.textContent).toBe('Businesses');
 const assets=footer.querySelector('nav[aria-label="Assets footer links"]')!;
 expect(assets.querySelectorAll('a')).toHaveLength(15);
 for(const href of ['/explore/music/','/explore/images/','/explore/videos/','/explore/books/','/explore/essays/','/explore/moments/','/explore/collectibles/','/explore/documents/'])expect(assets.querySelector(`a[href="${href}"]`)).not.toBeNull();
});

it('omits every current footer destination, including marketing aliases, query strings and index documents',()=>{
 const paths=[...footerGroups.flatMap(g=>g.links.map(([,path])=>path)),...footerNotices.map(([,path])=>path),...Object.keys(publicRouteAliases),'/explorer/'];
 for(const current of paths.filter(path=>path.startsWith('/'))){
  const canonical=current==='/explorer/'?'/explore/':canonicalPublicPath(current);
  const footer=parse(siteFooterHtml(current+'index.html?from=footer#main')).querySelector('.site-footer')!;
  expect([...footer.querySelectorAll('a')].some(a=>canonicalPublicPath(a.getAttribute('href')!)===canonical),current).toBe(false);
 }
 expect(parse(siteFooterHtml('/for/businesses/')).querySelector('a[href="/for/businesses/"]')).toBeNull();
 expect(parse(siteFooterHtml('/business/')).querySelector('a[href="/for/businesses/"]')).not.toBeNull();
});

it('updates the same mounted React footer on retained navigation and browser history',async()=>{
 history.replaceState({},'', '/learn/protect-your-value/');
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<SiteFooter/>));const footer=host.querySelector('footer');
  expect(footer?.querySelector('a[href="/protect/"]')).toBeNull();
  expect(footer?.querySelector('a[href="/vaults/"]')).not.toBeNull();
  await act(async()=>{history.pushState({},'','/vaults/');window.dispatchEvent(new Event('receiz-bank:surface'));});
  expect(host.querySelector('footer')).toBe(footer);
  expect(footer?.querySelector('a[href="/vaults/"]')).toBeNull();expect(footer?.querySelector('a[href="/protect/"]')).not.toBeNull();
  await act(async()=>{history.replaceState({},'','/for/businesses/');window.dispatchEvent(new PopStateEvent('popstate'));});
  expect(host.querySelector('footer')).toBe(footer);expect(footer?.querySelector('a[href="/for/businesses/"]')).toBeNull();expect(footer?.querySelector('a[href="/vaults/"]')).not.toBeNull();
 }finally{await act(async()=>root.unmount());host.remove();history.replaceState({},'','/');}
});
