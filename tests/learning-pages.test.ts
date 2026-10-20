import {expect,it} from 'vitest';
import {learningPages,learningPath,assetCategories} from '../src/content/learning-pages.mjs';
import {publicPages} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Public build templates are ESM.
import {learnArticle} from '../scripts/learn-template.mjs';
import {readFileSync} from 'node:fs';

it('publishes distinct complete guides with resolving related destinations',()=>{
 const routes=new Set(publicPages.map((page:{path:string})=>page.path));
 expect(new Set(learningPages.map(learningPath)).size).toBe(learningPages.length);
 for(const page of learningPages){
  expect(routes.has(learningPath(page)),page.title).toBe(true);
  expect(page.sections.length,page.title).toBeGreaterThanOrEqual(5);
  expect(page.sections.map(section=>section[1]).join(' ').split(/\s+/).length,page.title).toBeGreaterThanOrEqual(170);
  for(const related of page.related)expect(routes.has(related.split('#')[0]),`${page.title}: ${related}`).toBe(true);
  const html=learnArticle(page,learningPages,(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;'));
  expect(html).toContain('<h1>');expect(html).toContain('Method, sources and assessment');
 }
 expect(assetCategories.map(category=>category.label)).toContain('Collectibles');
 expect(assetCategories.map(category=>category.label)).not.toContain('Proofs');
});

it('explains connected creation and offline receipt without implying device qualification or unconfirmed spendability',()=>{
 const notes=learningPages.find(page=>page.slug==='notes')!;
 const copy=notes.sections.flat().join(' ');
 expect(copy).toContain('does not require a custody conformance Face ID prompt');
 expect(copy).toContain('reconciles on connection');
 expect(copy).toContain('conforming protected');
 expect(copy).toContain('Settlement Reserve Note');
 expect(copy).toContain('Proof-backed Native value');
});

it('keeps public guide interactions free of account transport and financial execution',()=>{
 const js=readFileSync('public/learn/learn.js','utf8').split('// Guide enhancements')[1];
 expect(js).toContain('data-learning-step');expect(js).toContain('data-example-input');
 expect(js).not.toMatch(/fetch\(|navigator\.credentials|\.request\(/);
});
