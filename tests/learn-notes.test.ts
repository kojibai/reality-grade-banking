import { expect, it } from 'vitest';
// @ts-expect-error Static public-page templates are plain ESM.
import { learnHome, learnArticle } from '../scripts/learn-template.mjs';
import {noteContinuityGuideSections} from '../src/content/note-continuity.mjs';

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
it('keeps the note artwork off the Learn home and within the Settlement and Reserve guide', () => {
  const guide = { slug: 'reserve-and-settlement', title: 'Settlement and Reserve', intro: 'Value, settled in proof.', sections: [['How notes work', 'Keep the original.']] };
  expect(learnHome()).not.toContain('src="/learn/reserve-note.webp"');
  const article = learnArticle(guide, [guide], escape);
  expect(article).toContain('id="how-notes-work"');
  expect(article).toContain('src="/learn/reserve-note.webp"');
  expect(article).toContain('src="/learn/settlement-note.webp"');
  expect(article).toContain('style="width:100%;max-width:100%;height:auto"');
  expect(learnArticle({ ...guide, slug: 'receiz-id' }, [guide], escape)).not.toContain('src="/learn/reserve-note.webp"');
});

it('links the offline guidance to the standard and the explicit device diagnostic',()=>{
  const guide={slug:'reserve-and-settlement',title:'Settlement and Reserve',intro:'Value, settled in proof.',sections:noteContinuityGuideSections};
  const article=learnArticle(guide,[guide],escape);
  expect(article).toContain('href="/conformance/#note-continuity"');
  expect(article).toContain('href="/conformance/#device-evidence"');
  expect(article).toContain('creation without attested custody');
  expect(article).toContain('release dependencies');
  expect(article).not.toContain('navigator.credentials');
});
