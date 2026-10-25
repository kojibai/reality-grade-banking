// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {businessFits} from '../src/content/business-fits.mjs';
import {fitContent} from '../scripts/business-fit-pages.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {readFileSync} from 'node:fs';

it('shows thirty distinct audience workflows as complete static artwork before motion or any network request',()=>{
 const stories=new Set<string>(),workflows=new Set<string>();
 for(const fit of businessFits){
  const doc=new DOMParser().parseFromString(fitContent(fit),'text/html');
  const scene=doc.querySelector('.fit-outcome-scene');
  expect(scene,fit.slug).not.toBeNull();
  expect(scene?.getAttribute('data-fit-art')).toBe(fit.slug);
  expect(scene?.getAttribute('aria-label')).toContain(fit.visualLabels[0]);
  expect(scene?.querySelectorAll('.business-scene-layer')).toHaveLength(3);
  expect(scene?.querySelectorAll('svg[data-outcome-object]')).toHaveLength(3);
  workflows.add([...scene!.querySelectorAll('svg[data-outcome-object]')].map(svg=>svg.getAttribute('data-outcome-object')).join('→'));
  expect(scene?.querySelector('img,image,script,iframe,button,canvas,video')).toBeNull();
  expect(scene?.textContent).toContain('Illustrative workflow');
  const ids=[...scene!.querySelectorAll('[id]')].map(el=>el.id);
  expect(new Set(ids).size,fit.slug).toBe(ids.length);
  for(const node of scene!.querySelectorAll('*')) for(const attr of node.attributes){
   for(const match of attr.value.matchAll(/url\(#([^)]+)\)/g))expect(ids,fit.slug).toContain(match[1]);
  }
  stories.add(scene!.querySelector('.fit-art-objects')!.innerHTML.replaceAll(fit.slug,'audience'));
  expect(scene!.outerHTML.length,fit.slug).toBeLessThan(42000);
 }
 expect(stories.size).toBe(30);expect(workflows.size).toBe(30);
});
it('gives each social preview the same audience artwork and a specific outcome instead of a generic offer image',()=>{
 for(const fit of businessFits){
  const page=publicPage(`/business/for/${fit.slug}/`)!;
  const doc=new DOMParser().parseFromString(shareCardSvg(page),'image/svg+xml');
  expect(doc.querySelector('[data-fit-share]')?.getAttribute('data-fit-share'),fit.slug).toBe(fit.slug);
  expect(doc.querySelectorAll('svg[data-outcome-object]'),fit.slug).toHaveLength(3);
  expect(doc.documentElement.textContent,fit.slug).toContain(page.lines.join(''));
  expect(page.lines.join(' '),fit.slug).not.toMatch(/Put it to work/);
  expect(doc.documentElement.textContent,fit.slug).not.toMatch(/149|month|credits/i);
  const image=JSON.parse(readFileSync('public/social/manifest.json','utf8')).images[page.path];
  expect(image.alt,fit.slug).toContain(fit.visualLabels[2]);
 }
});
it('keeps the main Business share image focused on the result without a price',()=>{
 const svg=new DOMParser().parseFromString(shareCardSvg(publicPage('/business/')!),'image/svg+xml');
 expect(svg.documentElement.textContent).not.toMatch(/149|month|credits/i);
});

it('animates the actual workflow with a usable rest state and no new navigation runtime',()=>{
 const css=readFileSync('public/learn/business.css','utf8');
 expect(css).toContain('@keyframes fit-art-build');
 expect(css).toContain('@keyframes fit-art-signal');
 expect(css).toContain('prefers-reduced-motion');
 expect(css).toContain('.business-scene:not(.in-view)');
 expect(css).toContain('document-hidden');
 expect(readFileSync('scripts/learn-assets.mjs','utf8')).not.toContain('fit-art');
});
