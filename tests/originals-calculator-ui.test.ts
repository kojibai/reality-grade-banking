// @vitest-environment happy-dom
import {it,expect,afterEach,vi} from 'vitest';
// @ts-expect-error Public-page template is ESM.
import {originalsQualificationContent} from '../scripts/originals-qualification-template.mjs';
afterEach(()=>document.body.replaceChildren());
it('teaches the one-Original gate through inspectable evidence and removes obsolete contribution thresholds',()=>{
 document.body.innerHTML=originalsQualificationContent();const page=document.querySelector('main')!;
 expect(page.textContent).toContain('One public, PBI-signed Original');
 expect(page.textContent).not.toMatch(/500|150,000|40%|250,000|shared baseline|funding requirement|become qualified/i);
 expect(page.querySelector('[data-originals-calculator]')).toBeNull();
 expect(page.querySelector('[data-originals-example]')).not.toBeNull();
 expect(page.querySelector('[data-example-verify]')?.textContent).toContain('Verify');
 expect(page.querySelector('[data-example-tamper]')?.textContent).toContain('Change one character');
 expect(page.querySelector('a[href="/learn/how-value-works/#verify-your-proof"]')).not.toBeNull();
 expect(page.textContent).not.toMatch(/bot.proof|impossible to fake|guaranteed|any bank must accept/i);
});

it('keeps proof controls disabled until their real handlers are installed, without reading a source on mount',async()=>{
 document.body.innerHTML=originalsQualificationContent();const root=document.querySelector<HTMLElement>('[data-originals-example]')!;
 const verify=root.querySelector<HTMLButtonElement>('[data-example-verify]')!,tamper=root.querySelector<HTMLButtonElement>('[data-example-tamper]')!;
 expect(verify.disabled).toBe(true);expect(tamper.disabled).toBe(true);
 const fetcher=vi.spyOn(globalThis,'fetch');
 try{const {mountOriginalExample}=await import('../src/qualification/learn');mountOriginalExample(root);expect(verify.disabled).toBe(false);expect(tamper.disabled).toBe(false);expect(fetcher).not.toHaveBeenCalled();}
 finally{fetcher.mockRestore();}
});
