// @vitest-environment happy-dom
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {learningPages,learningPath,learningGroups} from '../src/content/learning-pages.mjs';
import {publicPage,socialMetadata} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Public build templates are plain ESM.
import {learnArticle,learnHome,learningDirectoryPage} from '../scripts/learn-template.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
const paths=['people','businesses','independent-work','creators','communities','institutions','public-finance','platforms'].map(slug=>`/for/${slug}/`);
const audience=()=>learningPages.filter(page=>page.group==='For you');
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const digest=(text:string)=>createHash('sha256').update(text).digest('hex');

it('registers eight complete audience guides with distinct canonical URLs and useful existing next steps',()=>{
 const pages=audience();expect(pages.map(learningPath)).toEqual(paths);expect(learningGroups).toContain('For you');
 expect(new Set(pages.map(page=>page.slug)).size).toBe(8);
 for(const page of pages){expect(page.slug).toMatch(/^for-/);expect(page.sections).toHaveLength(6);expect(page.intro.length).toBeLessThan(100);for(const path of page.related)expect(publicPage(path),path).toBeDefined();}
});
it('provides eight different transparent vector explanations with three audience-specific local stages',()=>{
 const pages=audience();expect(pages).toHaveLength(8);const scenes=new Set(),stageCopy=new Set();
 for(const page of pages){
  const html=learnArticle(page,learningPages,escape),doc=new DOMParser().parseFromString(html,'text/html'),scene=doc.querySelector('svg.learning-scene')!;
  expect(scene.getAttribute('data-scene')).toBe(page.slug);expect(scene.querySelector('image,foreignObject,script')).toBeNull();
  expect(doc.querySelectorAll('[data-learning-step]')).toHaveLength(3);expect(doc.querySelectorAll('[data-learning-panel]')).toHaveLength(3);
  for(const stage of ['0','1','2'])expect(scene.querySelector(`[data-scene-stage="${stage}"]`),page.slug+' stage '+stage).not.toBeNull();
  scenes.add(digest(scene.outerHTML));stageCopy.add([...doc.querySelectorAll('[data-learning-panel]')].map(panel=>panel.textContent).join('|'));
 }
 expect(scenes.size).toBe(8);expect(stageCopy.size).toBe(8);
});
it('changes the selected audience explanation and visual stage without network or financial work',()=>{
 const pages=audience();expect(pages).toHaveLength(8);const enhancements=readFileSync('public/learn/learn.js','utf8').split('// Guide enhancements')[1];
 expect(enhancements).not.toMatch(/fetch\(|\.request\(|navigator\.credentials|requestAnimationFrame/);
 new Function('document','// Guide enhancements'+enhancements)(document);
 for(const page of pages){document.body.innerHTML=learnArticle(page,learningPages,escape);const region=document.querySelector<HTMLElement>('.learning-visual')!,buttons=[...region.querySelectorAll<HTMLButtonElement>('[data-learning-step]')];
  buttons[2].click();expect(region.dataset.learningStage).toBe('2');expect(buttons.map(button=>button.getAttribute('aria-pressed'))).toEqual(['false','false','true']);
  expect([...region.querySelectorAll<HTMLElement>('[data-learning-panel]')].map(panel=>panel.hidden)).toEqual([true,true,false]);
 }
});
it('uses a valid For you directory fragment and leaves the four Learn foundations intact',()=>{
 const doc=new DOMParser().parseFromString(learningDirectoryPage(),'text/html');expect(doc.querySelector('a[href="#guides-for-you"]')).not.toBeNull();expect(doc.querySelectorAll('#guides-for-you a')).toHaveLength(8);
 const home=new DOMParser().parseFromString(learnHome(),'text/html');expect(home.querySelector('main .learning-group-links')).toBeNull();expect(home.querySelectorAll('main #guides .guide-row')).toHaveLength(4);
 const links=[...home.querySelectorAll('footer nav[aria-label="For you footer links"] a')];expect(links.map(link=>link.getAttribute('href'))).toEqual(paths);expect(home.querySelectorAll('footer a[href="/learn/reality-grade-banking/"]')).toHaveLength(1);
});
it('defines unique audience sharing artwork through the existing metadata and vector-card pipeline',()=>{
 const pages=audience();expect(pages).toHaveLength(8);const cards=new Set(),titles=new Set();
 for(const page of pages){const metadata=publicPage(learningPath(page))!;expect(metadata).toBeDefined();expect(metadata.id).toBe(page.slug);expect(metadata.description).toBe(page.description);expect(metadata.noindex).not.toBe(true);cards.add(digest(shareCardSvg(metadata)));titles.add(metadata.title);
  const html=socialMetadata(metadata,{url:`/social/${page.slug}-example.png`,width:1730,height:909,sha256:'a'.repeat(64),bytes:1,alt:page.intro});expect(html).toContain(`https://bankeiz.com${learningPath(page)}`);expect(html).toContain(`${page.slug}-example.png`);
 }
 expect(cards.size).toBe(8);expect(titles.size).toBe(8);
});
