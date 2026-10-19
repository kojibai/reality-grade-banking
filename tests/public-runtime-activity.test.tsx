// @vitest-environment happy-dom
import {act,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../src/core/public-runtime';

it('suspends a hidden workspace without replacing its retained form state',()=>{
 (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 document.body.innerHTML='<div id="root">Private bank</div><div id="public-ledger-root" data-public-runtime="ledger"></div>';
 const host=publicRuntimeRoot('ledger'),states:boolean[]=[];
 function Workspace(){const active=usePublicRuntimeActive('ledger');useEffect(()=>{states.push(active);},[active]);return <input defaultValue="retained filter"/>;}
 const root=createRoot(host);
 try{
  act(()=>root.render(<Workspace/>));const input=host.querySelector('input')!;input.value='Owner transfer';
  act(()=>{host.hidden=true;dispatchEvent(new Event('receiz-bank:surface'));});
  expect(states).toEqual([true,false]);expect(host.querySelector('input')).toBe(input);
  act(()=>{host.hidden=false;dispatchEvent(new Event('receiz-bank:surface'));});
  expect(states).toEqual([true,false,true]);expect(input.value).toBe('Owner transfer');
  expect(document.getElementById('root')?.textContent).toBe('Private bank');
 }finally{act(()=>root.unmount());}
});
