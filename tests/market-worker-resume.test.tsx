// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import cap from '../public/receiz-public-capitalization.json';
import historyFile from '../public/receiz-public-share-chart-history.json';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {adoptMarketDisplaySource} from '../src/receiz/market-projection/display-source';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {useMarketCapitalization} from '../src/receiz/market-projection/useMarketCapitalization';
const clock=vi.hoisted(()=>({pulse:15114808}));
vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});});
async function fixture(){
 vi.useFakeTimers();clock.pulse=15114808;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 adoptMarketDisplaySource(parseMarketCapSource(cap));const fetcher=vi.fn(()=>{throw Error('Unexpected read');});vi.stubGlobal('fetch',fetcher);
 class Port{messages:any[]=[];onmessage:((event:any)=>void)|null=null;onerror:(()=>void)|null=null;onmessageerror:(()=>void)|null=null;terminate=vi.fn();constructor(){workers.push(this);}postMessage(message:any){this.messages.push(message);}}
 const workers:Port[]=[];vi.stubGlobal('Worker',Port);const root=createRoot(document.createElement('div')),catalog={items:[],complete:true,revision:'held-port-input',observedAt:null,sourceCount:0};
 let view!:ReturnType<typeof useMarketCapitalization>;function Probe({active}:{active:boolean}){view=useMarketCapitalization('ALL',active,catalog,false);return null;}
 const render=async(active=true)=>{await act(()=>root.render(<Probe active={active}/>));};await render();
 return{workers,fetcher,render,view:()=>view,finish(port:Port,id=port.messages.at(-1)!.id){act(()=>port.onmessage?.({data:{id,history:parseMarketHistory(historyFile)}}));},close(){act(()=>root.unmount());}};
}
it('lets a legitimate visible calculation finish despite five same-pulse focus events',async()=>{
 const f=await fixture();try{
  const first=f.workers[0],points=f.view().points;expect(first.messages.filter(message=>message.source)).toHaveLength(1);
  for(let wake=0;wake<5;wake++)act(()=>window.dispatchEvent(new Event('focus')));
  expect(f.workers).toHaveLength(1);expect(first.terminate).not.toHaveBeenCalled();expect(f.view().points).toBe(points);
  clock.pulse++;await act(()=>vi.advanceTimersByTimeAsync(1000));expect(first.messages.filter(message=>message.source)).toHaveLength(1);
  f.finish(first,first.messages.find(message=>message.source)!.id);
  expect(first.messages.at(-1)).toMatchObject({marketTick:true,pulse:clock.pulse});f.finish(first);expect(f.view().historyUpdating).toBe(false);expect(f.fetcher).not.toHaveBeenCalled();
 }finally{f.close();}
});
it('consumes one real suspension across the foreground visibility, pageshow and focus wave',async()=>{
 const f=await fixture();try{
  const first=f.workers[0],points=f.view().points;Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});act(()=>document.dispatchEvent(new Event('visibilitychange')));
  clock.pulse+=100;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});act(()=>document.dispatchEvent(new Event('visibilitychange')));act(()=>window.dispatchEvent(new Event('pageshow')));act(()=>window.dispatchEvent(new Event('focus')));
  expect(f.workers).toHaveLength(2);expect(first.terminate).toHaveBeenCalledOnce();expect(f.workers[1].messages.filter(message=>message.source)).toHaveLength(1);expect(f.workers[1].messages.find(message=>message.source)?.pulse).toBe(clock.pulse);expect(f.view().points).toBe(points);
  const resumed=f.workers[1];f.finish(resumed,resumed.messages.find(message=>message.source)!.id);
  // The existing local clock update remains queued behind the resumed job.
  // Complete that lightweight latest-pulse job without another full handoff.
  expect(resumed.messages.at(-1)).toMatchObject({marketTick:true,pulse:clock.pulse});f.finish(resumed);
  expect(resumed.messages.filter(message=>message.source)).toHaveLength(1);expect(f.view().historyUpdating).toBe(false);expect(f.fetcher).not.toHaveBeenCalled();
 }finally{f.close();}
});
it('recovers an actually failed worker once and does not abandon its replacement on another focus',async()=>{
 const f=await fixture();try{
  act(()=>f.workers[0].onerror?.());act(()=>window.dispatchEvent(new Event('focus')));act(()=>window.dispatchEvent(new Event('focus')));
  expect(f.workers).toHaveLength(2);expect(f.workers[1].terminate).not.toHaveBeenCalled();f.finish(f.workers[1]);expect(f.view().historyUpdating).toBe(false);
 }finally{f.close();}
});
it('retains the suspension edge while its panel is inactive and resumes once on return',async()=>{
 const f=await fixture();try{
  const points=f.view().points;await f.render(false);Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});act(()=>document.dispatchEvent(new Event('visibilitychange')));Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});act(()=>document.dispatchEvent(new Event('visibilitychange')));act(()=>window.dispatchEvent(new Event('pageshow')));act(()=>window.dispatchEvent(new Event('focus')));
  expect(f.workers).toHaveLength(1);await f.render();expect(f.workers).toHaveLength(2);expect(f.workers[1].messages.filter(message=>message.source)).toHaveLength(1);expect(f.view().points).toBe(points);f.finish(f.workers[1]);expect(f.view().historyUpdating).toBe(false);
 }finally{f.close();}
});
it('treats pagehide as one actual suspension without requiring a separate visibility event',async()=>{
 const f=await fixture();try{
  act(()=>window.dispatchEvent(new Event('pagehide')));act(()=>window.dispatchEvent(new Event('pageshow')));act(()=>window.dispatchEvent(new Event('focus')));
  expect(f.workers).toHaveLength(2);expect(f.workers[1].messages.filter(message=>message.source)).toHaveLength(1);f.finish(f.workers[1]);expect(f.view().historyUpdating).toBe(false);
 }finally{f.close();}
});
