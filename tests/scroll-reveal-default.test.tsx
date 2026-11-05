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
