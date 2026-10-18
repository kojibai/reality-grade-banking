// @vitest-environment happy-dom
import {readFileSync}from'node:fs';
import {afterEach,expect,it,vi}from'vitest';
// @ts-expect-error Public-page template is plain ESM.
import{valueExplainerContent}from'../scripts/value-explainer-template.mjs';
import{mountValueExplainer}from'../src/value-explainer/main';
const held=vi.hoisted(()=>({pulse:14710100,uPulse:14710100000123n}));
vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:held.pulse,uPulse:held.uPulse})}));
const bytes=readFileSync('tests/fixtures/public-essay-record.png');
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();held.pulse=14710100;held.uPulse=14710100000123n;});
function mount(){document.body.innerHTML=valueExplainerContent();const root=document.querySelector<HTMLElement>('[data-value-explainer]')!;mountValueExplainer(root);return root;}
function select(root:HTMLElement,file:File){const input=root.querySelector<HTMLInputElement>('#value-proof-file')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new Event('change',{bubbles:true}));}
function delayedFile(){const file=new File([bytes],'original.png',{type:'image/png'}),read=file.arrayBuffer.bind(file);let release!:()=>void;const gate=new Promise<void>(done=>{release=done;});const reading=vi.spyOn(file,'arrayBuffer').mockImplementation(async()=>{await gate;return read();});return{file,release,reading};}
it('captures the upload pulse before verification and displays real dollars ahead of Phi',async()=>{
 const root=mount(),heldFile=delayedFile();select(root,heldFile.file);
 await vi.waitFor(()=>expect(heldFile.reading).toHaveBeenCalled());expect(root.querySelector<HTMLInputElement>('#value-proof-evaluation')!.value).toBe('14710100000123');
 held.uPulse+=5000000n;held.pulse+=5;heldFile.release();
 await vi.waitFor(()=>expect(root.querySelector('[data-value-proof-usd]')?.textContent).toMatch(/^\$/),{timeout:5000});
 expect(root.querySelector('[data-value-proof-phi]')!.textContent).toContain('Φ');expect(root.querySelector('time[data-value-proof-time]')?.getAttribute('datetime')).toBeTruthy();
 expect(root.querySelector('[data-value-proof-result]')!.textContent).toContain('14710100000123');expect(root.querySelector('[data-value-proof-status]')!.textContent).toContain('Original verified');
});
it('keeps a newer file result when a prior read completes late and clears success on rejection',async()=>{
 const root=mount(),first=delayedFile();select(root,first.file);await vi.waitFor(()=>expect(first.reading).toHaveBeenCalled());held.uPulse+=1000000n;held.pulse++;
 select(root,new File([bytes],'second.png',{type:'image/png'}));await vi.waitFor(()=>expect(root.querySelector('[data-value-proof-usd]')?.textContent).toMatch(/^\$/),{timeout:5000});
 const current=root.querySelector('[data-value-proof-result]')!.textContent;first.release();await new Promise(done=>setTimeout(done,100));expect(root.querySelector('[data-value-proof-result]')!.textContent).toBe(current);
 select(root,new File(['invalid'],'invalid.png',{type:'image/png'}));await vi.waitFor(()=>expect(root.querySelector('[data-value-proof-status]')!.textContent).toContain('Proof rejected'));
 expect(root.querySelector<HTMLElement>('[data-value-proof-result]')!.hidden).toBe(true);
});
