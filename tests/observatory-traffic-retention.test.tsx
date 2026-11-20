// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {shippedTraffic,useNetworkTraffic} from '../src/observatory/network-traffic';

it('keeps the observed traffic through a retained return and suspends hidden refreshes',async()=>{
 const storageKey='bankeiz.observatory.network-activity.v1',container=document.createElement('div'),root=createRoot(container);
 function Chart({active}:{active:boolean}){return <output>{useNetworkTraffic(active).observedAt}</output>;}
 const shown=(active:boolean)=>act(async()=>root.render(<Chart active={active}/>));
 const observedAt=new Date(Date.parse(shippedTraffic.observedAt)+1000).toISOString();
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
 vi.spyOn(navigator,'onLine','get').mockReturnValue(true);
 vi.useFakeTimers();
 let late!:(response:Response)=>void;
 const fetch=vi.fn<typeof globalThis.fetch>()
  .mockResolvedValueOnce(Response.json({...shippedTraffic,observedAt}))
  .mockImplementationOnce(()=>new Promise(resolve=>{late=resolve;}))
  .mockRejectedValue(Error('Traffic unavailable'));
 vi.stubGlobal('fetch',fetch);
 localStorage.removeItem(storageKey);
 try{
  await shown(true);
  const chart=container.firstChild;
  expect(chart?.textContent).toBe(observedAt);
  expect(fetch).toHaveBeenCalledTimes(1);
  await shown(false);
  await act(async()=>{window.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(30_000);});
  expect(fetch).toHaveBeenCalledTimes(1);
  await shown(true);
  expect(container.firstChild).toBe(chart);
  expect(chart?.textContent).toBe(observedAt);
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(()=>vi.advanceTimersByTimeAsync(30_000));
  expect(fetch).toHaveBeenCalledTimes(2);
  const signal=fetch.mock.calls[1][1]?.signal;
  await shown(false);
  expect(signal?.aborted).toBe(true);
  const later=new Date(Date.parse(observedAt)+1000).toISOString();
  await act(async()=>late(Response.json({...shippedTraffic,observedAt:later})));
  expect(chart?.textContent).toBe(observedAt);
  expect(JSON.parse(localStorage.getItem(storageKey)??'null')?.observedAt).toBe(observedAt);
  await shown(true);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(chart?.textContent).toBe(observedAt);
  await act(()=>root.unmount());
  await shownOfflineCold(container,observedAt);
 }finally{
  vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.removeItem(storageKey);
 }
 async function shownOfflineCold(element:HTMLElement,expected:string){
  const reopened=createRoot(element);
  try{
   await act(async()=>reopened.render(<Chart active/>));
   expect(element.textContent).toBe(expected);
  }finally{await act(()=>reopened.unmount());}
 }
});
