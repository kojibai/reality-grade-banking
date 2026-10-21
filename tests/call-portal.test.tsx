// @vitest-environment happy-dom
import {act,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CallPortal,clampCallPosition} from '../src/features/messages/CallPortal';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

it('reparents one mounted media tree into the current modal or body without retaining a hidden Bank ancestor',async()=>{
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host),mounted=vi.fn(),unmounted=vi.fn();
 function Media(){useEffect(()=>{mounted();return unmounted;},[]);return <video aria-label="Synthetic retained media"/>;}
 function Fixture({expanded}:{expanded:boolean}){const inline=useRef<HTMLDivElement>(null);return <><div ref={inline} data-inline="true"/><CallPortal inlineHost={inline} expanded={expanded}><Media/></CallPortal></>;}
 const render=(expanded:boolean)=>act(async()=>root.render(<Fixture expanded={expanded}/>));
 const modal=document.createElement('dialog');
 try{
  await render(true);const video=host.querySelector('video');expect(video).not.toBeNull();await render(false);host.hidden=true;expect(document.body.querySelector('video')).toBe(video);expect(video?.closest('[hidden]')).toBeNull();
  await act(async()=>{document.body.appendChild(modal);modal.setAttribute('open','');});expect(video?.parentElement?.parentElement).toBe(modal);expect(mounted).toHaveBeenCalledOnce();expect(unmounted).not.toHaveBeenCalled();
  await act(async()=>modal.removeAttribute('open'));expect(video?.parentElement?.parentElement).toBe(document.body);host.hidden=false;await render(true);expect(host.querySelector('video')).toBe(video);expect(mounted).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());host.remove();modal.remove();}expect(unmounted).toHaveBeenCalledOnce();expect(document.querySelector('.bank-call-portal')).toBeNull();
});

it('clamps a dragged call to the visible viewport, including a shifted keyboard viewport',()=>{
 expect(clampCallPosition({x:-200,y:900},{width:248,height:250},{width:320,height:568})).toEqual({x:8,y:310});
 expect(clampCallPosition({x:900,y:-20},{width:248,height:180},{width:390,height:300,left:10,top:50})).toEqual({x:144,y:58});
 expect(clampCallPosition({x:-2,y:900},{width:248,height:180},{width:430,height:400,insets:{left:30,right:30,top:44,bottom:34}})).toEqual({x:38,y:178});
});
