// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveAssets} from '../src/features/assets/LiveAssets';
import {parsePublicMarket} from '../src/receiz/public-market';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('updates owned rows and an open object with supplied live prices without rereading private sources',async()=>{
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'owned',receizId:'owned',title:'Owned moment',ownerUsername:'alice',valueUsd:10}]}}).items[0];
 const listDeposits=vi.fn(async()=>[]),identity={listDeposits} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 const render=(priceUsd:number,changePct:number)=>root.render(<LiveAssets identity={identity} active revision={0} showcase={[{...item,priceUsd,changePct}]} onOpen={()=>{}}/>);
 try{
  await act(async()=>render(10,1));expect(host.querySelector('.market-rows')?.textContent).toContain('$10.00');
  act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());
  expect(host.querySelector('dialog .asset-price')?.textContent).toContain('$10.00');
  await act(async()=>render(12.34,-2));
  expect(host.querySelector('.market-rows .negative')?.textContent).toBe('-2%');
  expect(host.querySelector('dialog .asset-price')?.textContent).toContain('$12.34');
  expect(listDeposits).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());host.remove();}
});
