import { expect, it } from 'vitest';
// @ts-expect-error Build helper is plain ESM.
import { scopeLearnCss } from '../scripts/scope-learn-css.mjs';
it('preserves html motion/hidden-state rules and limits global styles to Learn', () => {
  const css = scopeLearnCss(':root{--ink:navy}body{margin:0}.motion-ready .reveal{opacity:0}.document-hidden .proof-glass{animation-play-state:paused}@keyframes rotate{from{opacity:0}to{opacity:1}}');
  expect(css).toContain('html.learn-surface.motion-ready .reveal'); expect(css).toContain('html.learn-surface.document-hidden .proof-glass'); expect(css).toContain('body[data-bank-surface="learn"]'); expect(css).toContain('from{opacity:0}');
});
