// @vitest-environment happy-dom
import {it,expect,afterEach,vi} from 'vitest';
import {readFileSync} from 'node:fs';
// @ts-expect-error Public-page template is ESM.
import {originalsQualificationContent} from '../scripts/originals-qualification-template.mjs';
afterEach(()=>{document.body.replaceChildren();document.querySelector('head > script[src="/snarkjs.min.js"]')?.remove();});
it('teaches seal-based accrual and each Original’s own signature as access to its value',()=>{
 document.body.innerHTML=originalsQualificationContent();const page=document.querySelector('main')!;
 expect(page.textContent).toContain('Your Original is already earning.');
 expect(page.textContent).toContain('Sign it to unlock its value.');
 expect(page.textContent).toContain('The value is already there. Your signature unlocks its use.');
 expect(page.textContent).toContain('Seal · Accrue · Sign · Unlock');
 expect(page.textContent).toContain('Each Original needs its own PBI signature to unlock its value.');
 expect(page.textContent).toContain('Value accrues from the seal. Your signature unlocks what this Original has earned.');
 expect(page.textContent).not.toMatch(/earning turns on|earning on|enables? (?:account )?earning|from your first Original|unsigned Original does not earn/i);
 const explanation=page.cloneNode(true) as HTMLElement;
 explanation.querySelectorAll('.product-screen').forEach(screen=>screen.remove());
 // Illustrative existing holdings are not qualification grants.
 expect(explanation.textContent).not.toMatch(/500|150,000|40%|250,000|shared baseline|funding requirement|become qualified/i);
 expect(page.querySelector('[data-originals-calculator]')).toBeNull();
 expect(page.querySelector('[data-originals-example]')).not.toBeNull();
 const story=page.querySelector('#why-an-original-has-value')!;expect(story.textContent).toContain('Your first book.');expect(story.textContent).toContain('The Original still verifies.');expect(story.textContent).not.toMatch(/later copy|14,000,000|50,000,000|pulse/i);
 expect(page.querySelectorAll('#originals-deeper a')).toHaveLength(6);expect(page.querySelector('#originals-deeper a[href="/docs/ownership/"]')).not.toBeNull();

 expect(page.querySelector('[data-example-verify]')?.textContent).toContain('Verify');
 expect(page.querySelector('[data-example-tamper]')?.textContent).toContain('Change one character');
 expect(page.querySelector('a[href="/learn/how-value-works/#verify-your-proof"]')).not.toBeNull();
 expect(page.textContent).not.toMatch(/bot.proof|impossible to fake|guaranteed|any bank must accept/i);
});

it('shows carried origin and sealed proof head from the actual sample without further network discovery',async()=>{
 document.body.innerHTML=originalsQualificationContent();const root=document.querySelector<HTMLElement>('[data-originals-example]')!;
 const bytes=readFileSync('tests/fixtures/public-essay-record.png');
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{expect(input).toBe('/proofs/sealed-essay.png');return new Response(bytes);});
 try{
  const {mountOriginalExample}=await import('../src/qualification/learn');mountOriginalExample(root);root.querySelector<HTMLButtonElement>('[data-example-verify]')!.click();
  await vi.waitFor(()=>expect(root.querySelector('[data-example-status]')?.textContent).toBe('Proof verified. Value reproduced. Replay verified.'),{timeout:20000});
  const output=root.querySelector('[data-example-result]')!;
  expect(output.textContent).toContain('14611069000000');expect(output.textContent).toContain('Carried whole-pulse origin expressed in µPulses');
  expect(output.textContent).toContain('Sealed proof head');expect(output.textContent).toContain('51ceab4b3909e7e67570ee5822c41af5');
  expect(output.textContent).not.toContain('Not carried');expect(output.textContent).not.toContain('Admitted history head');expect(fetcher).toHaveBeenCalledTimes(1);
 }finally{fetcher.mockRestore();}
},30000);

it('keeps proof controls disabled until their real handlers are installed, without reading a source on mount',async()=>{
 document.body.innerHTML=originalsQualificationContent();const root=document.querySelector<HTMLElement>('[data-originals-example]')!;
 const verify=root.querySelector<HTMLButtonElement>('[data-example-verify]')!,tamper=root.querySelector<HTMLButtonElement>('[data-example-tamper]')!;
 expect(verify.disabled).toBe(true);expect(tamper.disabled).toBe(true);
 const fetcher=vi.spyOn(globalThis,'fetch');
 try{const {mountOriginalExample}=await import('../src/qualification/learn');mountOriginalExample(root);expect(verify.disabled).toBe(false);expect(tamper.disabled).toBe(false);expect(fetcher).not.toHaveBeenCalled();}
 finally{fetcher.mockRestore();}
});
