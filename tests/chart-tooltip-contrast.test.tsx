// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {act} from 'react';import {createRoot} from 'react-dom/client';
import {ValueChart} from '../src/components/ValueChart';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
it('keeps an asset tooltip price dark on its white surface when shared chart styles are present',async()=>{
 const style=document.createElement('style');style.textContent=readFileSync('src/styles/features.css','utf8')+'\n'+readFileSync('src/features/market/public-asset-chart.css','utf8');document.head.append(style);const host=document.createElement('div');host.className='asset-chart';document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<ValueChart values={[100,200]} tooltip={()=>({value:'$2,000.00',label:'May 24 · ☤KAI 12,394,907'})}/>));await act(async()=>host.querySelector('svg')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true})));const tip=host.querySelector<HTMLElement>('.chart-tooltip')!;expect(tip.querySelector('strong')?.textContent).toBe('$2,000.00');expect(getComputedStyle(tip).color).not.toBe('white');expect(getComputedStyle(tip).color).not.toBe('rgb(255, 255, 255)');}
 finally{await act(async()=>root.unmount());host.remove();style.remove();}
});
