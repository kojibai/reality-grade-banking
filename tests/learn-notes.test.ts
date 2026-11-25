import { expect, it } from 'vitest';
// @ts-expect-error Static public-page templates are plain ESM.
import { learnHome, learnArticle } from '../scripts/learn-template.mjs';
import {noteContinuityGuideSections} from '../src/content/note-continuity.mjs';
// @ts-expect-error Static public-page templates are plain ESM.
import {realityGradeContent} from '../scripts/reality-grade-page.mjs';

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
it('shows one Settlement Note specimen on Reality-Grade Banking',()=>{
 const html=realityGradeContent(),art=html.match(/<div class="reality-note-art reveal">(.*?)<\/figure><\/div>/s)![1];
 expect(art.match(/<img /g)).toHaveLength(1);
 expect(art).toContain('/learn/settlement-note.webp');
 expect(art).toContain('Settlement Note');
 expect(art).toContain('Unissued specimen');
});
it('keeps the note artwork off the Learn home and within the Settlement and Reserve guide', () => {
  const guide = { slug: 'reserve-and-settlement', title: 'Settlement and Reserve', intro: 'Value, settled in proof.', sections: [['How notes work', 'Keep the original.']] };
  expect(learnHome()).not.toContain('src="/learn/reserve-note.webp"');
  const article = learnArticle(guide, [guide], escape);
  expect(article).toContain('id="how-notes-work"');
  expect(article).not.toContain('src="/learn/reserve-note.webp"');expect((article.match(/class="note-specimen /g)??[])).toHaveLength(1);
  expect(article).toContain('src="/learn/settlement-note.webp"');
  expect(article).toContain('style="width:100%;max-width:100%;height:auto"');
  expect(learnArticle({ ...guide, slug: 'receiz-id' }, [guide], escape)).not.toContain('src="/learn/reserve-note.webp"');
});

it('links the offline guidance to the standard and the explicit device diagnostic',()=>{
  const guide={slug:'reserve-and-settlement',title:'Settlement and Reserve',intro:'Value, settled in proof.',sections:noteContinuityGuideSections};
  const article=learnArticle(guide,[guide],escape);
  expect(article).toContain('href="/conformance/#note-continuity"');
  expect(article).toContain('href="/conformance/#device-evidence"');
  expect(article).toContain('connected creation are implemented');
  expect(article).toContain('qualification remain release requirements');
  expect(article).not.toContain('navigator.credentials');
});

it('explains offline handoff, connected funding and final deposit in the public and manual guides',async()=>{
 const {learningPages}=await import('../src/content/learning-pages.mjs');
 // @ts-expect-error The operating manual uses static ESM templates.
 const {docsArticles}=await import('../docs-app/content.mjs');
 // @ts-expect-error The operating manual uses static ESM templates.
 const {docsDocument}=await import('../docs-app/renderer.mjs');
 const notes=learnArticle(learningPages.find(page=>page.slug==='notes')!,learningPages,escape);
 const offline=learnArticle(learningPages.find(page=>page.slug==='offline-banking')!,learningPages,escape);
 const manual=docsDocument(docsArticles.find((page:{slug:string})=>page.slug==='notes'));
 for(const html of [notes,offline,manual]){
  expect(html).toContain('only the final holder');
  expect(html).toContain('Send Note nearby');
  expect(html).toContain('regular balance needs a connection');
 }
 expect(offline).toContain('The sender can stay offline');
 expect(manual).toContain('Show received proof QR');
});
