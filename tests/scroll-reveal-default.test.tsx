// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {useScrollReveal} from '../src/core/useScrollReveal';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('preserves the existing Market and Discover threshold for consumers without a natural-position anchor',()=>{
 let y=0;vi.spyOn(window,'scrollY','get').mockImplementation(()=>y);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 function Probe(){const tools=useScrollReveal(true,'.default-search');return <div data-away={tools.away}><input className="default-search"/></div>;}
 const scroll=(at:number)=>act(()=>{y=at;window.dispatchEvent(new Event('scroll'));});
 try{
  act(()=>root.render(<Probe/>));scroll(179);expect(host.firstElementChild?.getAttribute('data-away')).toBe('false');
  scroll(200);expect(host.firstElementChild?.getAttribute('data-away')).toBe('true');
  scroll(190);expect(host.firstElementChild?.getAttribute('data-away')).toBe('false');
 }finally{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();}
});

it('clears only control visibility while inactive so returning needs no layout effect or scroll event',()=>{
 let y=0;vi.spyOn(window,'scrollY','get').mockImplementation(()=>y);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 0;});vi.stubGlobal('cancelAnimationFrame',()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 function Probe({active}:{active:boolean}){const tools=useScrollReveal(active,'.default-search');return <div data-away={tools.away}><input className="default-search"/></div>;}
 try{
  act(()=>root.render(<Probe active/>));
  act(()=>{y=500;window.dispatchEvent(new Event('scroll'));});
  expect(host.firstElementChild?.getAttribute('data-away')).toBe('true');
  act(()=>root.render(<Probe active={false}/>));
  expect(host.firstElementChild?.getAttribute('data-away')).toBe('false');
  y=0;
  act(()=>root.render(<Probe active/>));
  expect(host.firstElementChild?.getAttribute('data-away')).toBe('false');
 }finally{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();}
});
