// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PaymentTools} from '../src/features/account/PaymentTools';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());

it('copies real installation code on demand without opening checkout, loading a widget or making requests',async()=>{
 const copy=vi.fn().mockResolvedValue(undefined),network=vi.fn();
 vi.stubGlobal('navigator',{clipboard:{writeText:copy}});vi.stubGlobal('fetch',network);
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PaymentTools username="klok" amount="12.30"/>));
  expect(host.querySelector('details')?.open).toBe(false);
  expect(host.querySelector('iframe,script')).toBeNull();expect(network).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Copy payment button code"]')!.click());
  expect(copy).toHaveBeenLastCalledWith(expect.stringContaining('to=klok&amp;amount=12.30'));
  expect(host.querySelector('[aria-label="Payment button code copied"]')).not.toBeNull();
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Embedded checkout')!.click());
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Copy checkout code"]')!.click());
  expect(copy).toHaveBeenLastCalledWith(expect.stringContaining('https://receiz.com/receiz-pay-embed.js'));
  expect(host.querySelector('iframe,script')).toBeNull();expect(network).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('never exposes installation code until a receiving ID is available and resets copy state when its destination changes',async()=>{
 vi.stubGlobal('navigator',{clipboard:{writeText:vi.fn().mockResolvedValue(undefined)}});
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PaymentTools username="" amount=""/>));
  expect(host.querySelector('textarea')).toBeNull();
  await act(async()=>root.render(<PaymentTools username="first_user" amount=""/>));
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Copy payment button code"]')!.click());
  await act(async()=>root.render(<PaymentTools username="second_user" amount=""/>));
  expect(host.querySelector('[aria-label="Payment button code copied"]')).toBeNull();
  expect(host.querySelector<HTMLTextAreaElement>('textarea')?.value).toContain('to=second_user');
 }finally{act(()=>root.unmount());}
});
