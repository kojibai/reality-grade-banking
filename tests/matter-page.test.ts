import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('keeps the authored Digital Matter definition and the original essay inspectable',async()=>{
 const {matterContent,matterPage}=await import('../scripts/matter-page.mjs');const html=matterContent();
 expect(matterPage.path).toBe('/matter/');expect(html).toContain('https://bjklock.com/p/digital-matter');
 expect(html).toContain('measured physical reality represented as structured data');
 for(const value of ['data-matter-page','data-matter-stage','Capture','Seal','History','Move','Inspect','/proof/','/standards/','/book/'])expect(html).toContain(value);
 expect(html).toContain('Illustrative object');expect(html).toContain('data-public-script="matter"');expect(html).not.toContain('<script type="module"');
});
it('keeps the explanatory animation beneath real proof inspection without network or invented admission',()=>{
 const js=readFileSync('public/learn/matter.js','utf8');
 expect(js).not.toMatch(/fetch\(|localStorage|sessionStorage|\.digest\(|createReceiz|new Worker/);
 expect(js).toContain('IntersectionObserver');expect(js).toContain('prefers-reduced-motion');expect(js).toContain('visibilitychange');
});
it('uses BJ’s existing Bankeiz booking for Help instead of an email composer',async()=>{
 const {standardPages}=await import('../src/content/standard-pages.mjs');const help=standardPages.find((p:{key:string})=>p.key==='help');
 expect(help?.action).toBe('Message Receiz');expect(help?.href).toBe('/book/bjklock/');expect(JSON.stringify(help)).not.toContain('mailto:');
});
