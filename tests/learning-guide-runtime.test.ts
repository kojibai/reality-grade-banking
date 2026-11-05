// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';

it('keeps the first cold guide interaction, exact illustration, and single bindings across retained navigation',async()=>{
 const markup=()=>`<section class="learning-visual" data-learning-stage="0"><button type="button" data-learning-step="0" aria-pressed="true">Source</button><button type="button" data-learning-step="1" aria-pressed="false">Keep</button><div data-learning-panel="0">First</div><div data-learning-panel="1" hidden>Second</div></section><section data-learning-funding><input data-example-input value="100"><output data-example-amount>$100</output><strong data-example-title>Settlement Note</strong><span data-example-reserve>$60</span><span data-example-settlement>$40</span></section>`;
 document.body.innerHTML=markup();const transport=vi.fn();vi.stubGlobal('fetch',transport);vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn()}));
 const attributes=vi.spyOn(Element.prototype,'setAttribute');let release!:(value:{init():void})=>void;const held=new Promise<{init():void}>(resolve=>{release=resolve;});
 const loadModule=vi.fn((file:string)=>{expect(file).toBe('economy');return held;});
 const source=readFileSync('public/learn/learn.js','utf8').split('// All public guides')[0].replace("import('/learn/'+file+'.js')",'loadModule(file)');
 try{
  new Function('loadModule',source)(loadModule);
  const click=()=>document.querySelector<HTMLButtonElement>('[data-learning-step="1"]')!.click();
  const input=(value:string)=>{const node=document.querySelector<HTMLInputElement>('[data-example-input]')!;node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));};
  click();input('150');expect(document.querySelector<HTMLElement>('[data-learning-stage]')!.dataset.learningStage).toBe('0');
  const actual=await import('../public/learn/economy.js');release(actual);
  await vi.waitFor(()=>expect(document.querySelector<HTMLElement>('[data-learning-stage]')!.dataset.learningStage).toBe('1'));
  expect(document.querySelector('[data-example-amount]')!.textContent).toBe('$150');expect(document.querySelector('[data-example-reserve]')!.textContent).toBe('$60');expect(document.querySelector('[data-example-settlement]')!.textContent).toBe('$90');
  const selections=()=>attributes.mock.calls.filter(([name])=>name==='aria-pressed').length;expect(selections()).toBe(2);
  document.body.innerHTML=markup();window.dispatchEvent(new Event('receiz-learn:page'));await Promise.resolve();
  const button=document.querySelector<HTMLButtonElement>('[data-learning-step="1"]')!;button.focus();click();input('30');
  expect(document.activeElement).toBe(button);expect(document.querySelector('[data-learning-panel="1"]')!.hasAttribute('hidden')).toBe(false);expect(selections()).toBe(4);
  expect(document.querySelector('[data-example-reserve]')!.textContent).toBe('$30');expect(document.querySelector('[data-example-settlement]')!.textContent).toBe('$0');expect(transport).not.toHaveBeenCalled();
 }finally{attributes.mockRestore();vi.unstubAllGlobals();}
});
