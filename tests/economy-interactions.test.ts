// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {economyContent} from '../scripts/economy-page.mjs';
import {init} from '../public/learn/economy.js';
it('updates dollars immediately, conserves the example value and supports a complete repeatable four-payment journey',()=>{
 document.body.innerHTML=economyContent();init();const root=document.querySelector('[data-economy-numbers]')!,next=root.querySelector('[data-economy-next]') as HTMLButtonElement;
 expect(root.querySelector('[data-economy-starting]')?.textContent).toBe('$627.60');
 for(let step=1;step<=4;step++){next.click();expect(root.querySelector('[data-economy-step]')?.textContent).toContain(step+' of 4');expect(root.querySelectorAll('[data-illustrated=true]')).toHaveLength(step);}
 expect(root.querySelector('[data-economy-gross]')?.textContent).toBe('$2,510.40');expect(root.querySelector('[data-economy-held="0"]')?.textContent).toBe('$627.60');expect(root.querySelector('[data-economy-payoff]')?.textContent).toContain('no new value was created');
 next.click();expect(root.querySelector('[data-economy-gross]')?.textContent).toBe('$0.00');
 const input=root.querySelector('input')!;input.value='11';input.dispatchEvent(new Event('input',{bubbles:true}));expect(root.querySelector('[data-economy-starting]')?.textContent).toBe('$69.04');next.click();expect(root.querySelector('[data-economy-held="1"]')?.textContent).toBe('$69.04');
});
it('changes the frontend without changing the illustrative source and supports keyboard exploration',()=>{
 document.body.innerHTML=economyContent();init();const root=document.querySelector('[data-economy-interfaces]')!,source=root.querySelector('[data-economy-source]')!.outerHTML;
 const tabs=[...root.querySelectorAll('[role=tab]')] as HTMLButtonElement[];tabs[1].click();expect(root.querySelector('[role=tabpanel]:not([hidden])')?.id).toBe('ec-panel-fuel');
 tabs[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(root.querySelector('[role=tabpanel]:not([hidden])')?.id).toBe('ec-panel-repairs');expect(document.activeElement).toBe(tabs[2]);expect(root.querySelector('[data-economy-source]')!.outerHTML).toBe(source);
 tabs[2].dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));expect(root.querySelector('[role=tabpanel]:not([hidden])')?.id).toBe('ec-panel-workers');
});
it('keeps the circle exploration and newly mounted pages independent without duplicate listeners',()=>{
 document.body.innerHTML=economyContent();init();init();const root=document.querySelector('[data-economy-circle]')!;(root.querySelector('[data-economy-circle-choice="grocers"]') as HTMLButtonElement).click();expect(root.querySelector('[data-economy-circle-panel]:not([hidden])')?.getAttribute('data-economy-circle-panel')).toBe('grocers');
 const next=document.querySelector('[data-economy-next]') as HTMLButtonElement;next.click();expect(document.querySelector('[data-economy-step]')?.textContent).toContain('1 of 4');
});
