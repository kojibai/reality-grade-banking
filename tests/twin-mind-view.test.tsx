// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import TwinMindView from '../src/features/messages/twin-mind/TwinMindView';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const cleanups:Array<()=>void>=[];afterEach(()=>{cleanups.splice(0).forEach(f=>f());vi.restoreAllMocks();vi.unstubAllGlobals();});
it('draws once from the held index, stops when hidden, and exposes full records without a fetch or frame loop',async()=>{
 const context={scale:vi.fn(),clearRect:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),stroke:vi.fn(),quadraticCurveTo:vi.fn(),arc:vi.fn(),fill:vi.fn()},observe=vi.fn(),disconnect=vi.fn(),fetch=vi.fn(),frame=vi.fn();
 vi.stubGlobal('ResizeObserver',class{observe=observe;disconnect=disconnect;});vi.stubGlobal('fetch',fetch);vi.stubGlobal('requestAnimationFrame',frame);
 vi.spyOn(HTMLCanvasElement.prototype,'clientWidth','get').mockReturnValue(340);vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 const body='Full saved response, with every part retained.',value={owner:{displayName:'Maya',username:'maya'},showcase:{items:[{id:'one',title:'Original source',summary:'Original contents',createdAt:'2026-10-20T12:00:00Z'}]},memory:{entries:[{role:'assistant',body,createdAt:'2026-10-21T12:00:00Z'}]},proofBrain:{showcaseHeadKai:'14812345',subjectHead:'original-head'}};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});await act(async()=>root.render(<TwinMindView value={value}/>));
 expect(context.clearRect).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();expect(frame).not.toHaveBeenCalled();
 await act(async()=>root.render(<TwinMindView value={value}/>));expect(context.clearRect).toHaveBeenCalledTimes(1);
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(label));expect(button).toBeTruthy();await act(async()=>button!.click());};
 await click('Original source');expect(host.querySelector('a')?.getAttribute('href')).toBe('/asset/profile%3Amaya%3Aone/');await click('Memory turns');await click(body);expect(host.querySelector('.twin-mind-selection')?.textContent).toContain(body);
 await click('Continuity');expect(host.textContent).toContain('Continuity follows the original carried Kai');const count=context.clearRect.mock.calls.length;
 await act(async()=>root.render(<TwinMindView value={value} active={false}/>));expect(context.clearRect).toHaveBeenCalledTimes(count);expect(disconnect).toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(frame).not.toHaveBeenCalled();
 expect(host.textContent).toContain('14812345');
});
