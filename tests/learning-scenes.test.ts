import {expect,it} from 'vitest';
import {learningPages} from '../src/content/learning-pages.mjs';
// @ts-expect-error Build-time module has no client declaration.
import {learningVisual} from '../scripts/learning-visuals.mjs';
// @ts-expect-error Build-time module has no client declaration.
import {learnHome,learningDirectoryPage} from '../scripts/learn-template.mjs';
import {readFileSync} from 'node:fs';
it('gives every subject its own transparent vector scene and local explanation controls',()=>{
 const scenes=new Set();for(const page of learningPages){const markup=learningVisual(page,(v:string)=>v);expect(markup).toContain(`data-scene="${page.slug}"`);expect(markup).not.toContain('<img');expect(markup).not.toContain('<canvas');expect(markup).toContain('data-learning-stage="0"');expect((markup.match(/data-learning-step=/g)??[]).length).toBe(3);scenes.add(markup.match(/<svg[\s\S]*?<\/svg>/)?.[0]);}expect(scenes.size).toBe(learningPages.length);
});
it('keeps the full guide directory off the simple Learn home',()=>{expect(learnHome()).not.toContain('learning-group-links');const directory=learningDirectoryPage();for(const page of learningPages)expect(directory).toContain(page.title.replaceAll('&','&amp;'));});
it('pauses artwork offscreen and removes its animation for reduced motion',()=>{const css=readFileSync('public/learn/scenes.css','utf8');expect(css).toContain('motion-region:not(.in-view)');expect(css).toContain('.document-hidden');expect(css).toContain('prefers-reduced-motion:reduce');expect(css).toContain('animation:none!important');});
