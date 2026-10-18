// @vitest-environment happy-dom
// UI consent state only. These projections are NOT verifier qualification.
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {LedgerProofControls} from '../src/public-ledger/LedgerProofControls';
const values=vi.hoisted(()=>({older:{kind:'ledger',artifactSha256:'a'.repeat(64),kaiPulse:'10',snapshot:{records:[],baseline:'native'}},newer:{kind:'ledger',artifactSha256:'b'.repeat(64),kaiPulse:'11',snapshot:{records:[],baseline:'native'}}}));
vi.mock('../src/receiz/public-ledger-proof',()=>({inspectPublicLedgerFile:async()=>values.older}));
vi.mock('../src/receiz/public-ledger-retention',()=>({retainPublicLedgerReview:async()=>values.newer}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('requires new public consent when keeping an older review restores a newer retained original',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({entries:[]})),host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[new File(['test-only'],'test.receiz')]});
  await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  const checkbox=host.querySelector('input[type=checkbox]') as HTMLInputElement;
  await act(async()=>checkbox.click());expect(checkbox.checked).toBe(true);
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Keep verified original'))!.click());
  expect(host.textContent).toContain('b'.repeat(64));
  expect((host.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(false);
  expect([...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Publish verified original'))!.disabled).toBe(true);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
it('can discover originals beyond the first page without knowing their digest',async()=>{
 const entry=(digest:string)=>({artifactSha256:digest.repeat(64),kind:'proof',kaiPulse:'100'});
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(Response.json({entries:[entry('a')],nextCursor:1,count:2})).mockResolvedValueOnce(Response.json({entries:[entry('b')],nextCursor:null,count:2}));
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LedgerProofControls/>));
  const more=[...host.querySelectorAll('button')].find(b=>b.textContent==='More published originals');expect(more).toBeDefined();
  await act(async()=>more!.click());expect(host.querySelector(`a[href="/ledger/?source=${'b'.repeat(64)}"]`)).not.toBeNull();
  expect(String(fetch.mock.calls[1][0])).toContain('cursor=1');expect([...host.querySelectorAll('button')].some(b=>b.textContent==='More published originals')).toBe(false);
 }finally{act(()=>root.unmount());fetch.mockRestore();}
});
