import {expect,it} from 'vitest';
import {learningPages,learningPath} from '../src/content/learning-pages.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Existing build-only template.
import {learnArticle} from '../scripts/learn-template.mjs';
it.each(['offline-banking','banking-outage'])('delivers a complete discoverable %s guide through the existing template',slug=>{const page=learningPages.find(p=>p.slug===slug);expect(page).toBeDefined();expect(learningPath(page!)).toBe('/learn/'+slug+'/');const metadata=publicPage('/learn/'+slug+'/');expect(metadata).toBeDefined();expect(metadata?.noindex).not.toBe(true);const html=learnArticle(page!,learningPages,(value:string)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('\"','&quot;'));expect(html).toContain('<h1');expect(html).toContain('href="/learn/notes/"');expect(html).toContain('href="/learn/security/"');expect(html).toContain('href="/#account"');});

it('delivers the referrer policy before any tracked public asset loads',async()=>{
 const {applyPublicMetadata}=await import('../scripts/public-page-metadata.mjs');const metadata=publicPage('/learn/offline-banking/')!;
 const html=applyPublicMetadata('<html><head><script src="/learn/learn.js" defer></script></head><body></body></html>',metadata,{url:'/social/test.png',width:1730,height:909,alt:'Public guide',sha256:'0'.repeat(64),bytes:1});
 expect(html).toContain('<meta name="referrer" content="no-referrer">');expect(html.indexOf('name="referrer"')).toBeLessThan(html.indexOf('src="/learn/learn.js"'));
});
