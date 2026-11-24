import { expect, it } from 'vitest';
import {withAppAppearance} from '../scripts/app-appearance.mjs';
import { scopeLearnCss } from '../scripts/scope-learn-css.mjs';
it('rejects selectorless footer remnants instead of applying them to the entire Learn surface',()=>{
 expect(()=>scopeLearnCss('.learn-shell{width:100%}{display:flex;text-decoration:underline}')).toThrow('LEARN_CSS_SELECTOR_REQUIRED');
});
it('preserves html motion/hidden-state rules and limits global styles to Learn', () => {
  const css = scopeLearnCss(':root{--ink:navy}body{margin:0}.motion-ready .reveal{opacity:0}.document-hidden .proof-glass{animation-play-state:paused}@keyframes rotate{from{opacity:0}to{opacity:1}}');
  expect(css).toContain('html.learn-surface.motion-ready .reveal'); expect(css).toContain('html.learn-surface.document-hidden .proof-glass'); expect(css).toContain('body[data-bank-surface="learn"]'); expect(css).toContain('from{opacity:0}');
});


it('restores saved appearance before stylesheets on direct reading entries',()=>{
 const html=withAppAppearance('<html><head><meta name="theme-color" content="#fbfcfe"><link rel="stylesheet" href="/learn/learn.css"></head></html>');
 expect(html.indexOf('bankeiz.app.appearance')).toBeGreaterThan(html.indexOf('name="theme-color"'));
 expect(html.indexOf('bankeiz.app.appearance')).toBeLessThan(html.indexOf('rel="stylesheet"'));
});
