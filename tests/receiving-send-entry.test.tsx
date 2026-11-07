// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveSend} from '../src/features/account/LivePayments';
import {LiveActions} from '../src/features/account/LiveActions';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
const button=(host:HTMLElement,label:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent?.trim()===label||value.querySelector('strong')?.textContent===label);
function fixture(){
 const status=vi.fn(async()=>null),prepare=vi.fn().mockRejectedValue(Error('Stop at review')),execute=vi.fn(),walletSend=vi.fn(async()=>({status,prepare,execute,discard:vi.fn()})),messaging=vi.fn(),organizer=vi.fn(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const identity={binding:{artifactSha256:'a'.repeat(64)},username:'holder',walletSend,messaging,organizer,knownOrganizerDisplay:()=>null}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 return{host,root,identity,status,prepare,execute,walletSend,messaging,organizer,fetch,close(){act(()=>root.unmount());host.remove();}};
}
it('keeps receiving help secondary and opens it without another account, directory or payment read',async()=>{
 const f=fixture();try{
  await act(async()=>f.root.render(<LiveSend identity={f.identity} wallet={null} initialRecipient={{userId:'22222222-2222-4222-8222-222222222222',username:'mira'}} onClose={()=>{}}/>));
  expect(button(f.host,'Review payment')).toBeDefined();
  expect(f.host.textContent).not.toContain('Receiving invitations');
  const entrance=f.host.querySelector<HTMLDetailsElement>('details.receiving-help-entrance')!;
  expect(entrance.open).toBe(false);
  expect(entrance.querySelector('summary')?.textContent).toBe('More receiving options');
  expect(entrance.parentElement?.previousElementSibling?.querySelector('summary')?.textContent).toBe('Wallet access');
  await act(async()=>entrance.querySelector('summary')!.click());
  expect(f.host.querySelector('dialog[open]')).toBeNull();
  expect(f.walletSend).toHaveBeenCalledOnce();expect(f.status).toHaveBeenCalledOnce();expect(f.fetch).not.toHaveBeenCalled();
  await act(async()=>button(f.host,'Help someone receive')!.click());
  expect(f.host.querySelector('dialog[open]')?.textContent).toContain('Keep your money moving.');
  expect(f.walletSend).toHaveBeenCalledOnce();expect(f.status).toHaveBeenCalledOnce();
  expect(f.prepare).not.toHaveBeenCalled();expect(f.execute).not.toHaveBeenCalled();expect(f.messaging).not.toHaveBeenCalled();expect(f.organizer).not.toHaveBeenCalled();expect(f.fetch).not.toHaveBeenCalled();
  await act(async()=>button(f.host,'Continue to payment')!.click());
  expect(f.host.querySelector('dialog[open]')).toBeNull();
  expect(f.walletSend).toHaveBeenCalledOnce();expect(f.status).toHaveBeenCalledOnce();
  const recipient=f.host.querySelector<HTMLInputElement>('[role=combobox]');expect(recipient?.value).toBe('mira');
 }finally{f.close();}
});
it('preserves the selected immutable recipient through help and explicit payment review',async()=>{
 const f=fixture();try{
  await act(async()=>f.root.render(<LiveSend identity={f.identity} wallet={null} initialRecipient={{userId:'22222222-2222-4222-8222-222222222222',username:'mira'}} onClose={()=>{}}/>));
  const amount=f.host.querySelector<HTMLInputElement>('input[aria-label="Amount to send"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(amount,'2.50');amount.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>button(f.host,'Help someone receive')!.click());
  await act(async()=>button(f.host,'Continue to payment')!.click());
  await act(async()=>button(f.host,'Review payment')!.click());
  expect(f.prepare).toHaveBeenCalledExactlyOnceWith({recipient:'22222222-2222-4222-8222-222222222222',amountUsdCents:'250',note:''});
  expect(f.execute).not.toHaveBeenCalled();
 }finally{f.close();}
});

it('suspends both Send and its nested receiving sheet on public navigation, then restores the held draft',async()=>{
 const f=fixture(),action={kind:'send' as const,recipient:{userId:'22222222-2222-4222-8222-222222222222',username:'mira'}};
 const render=(active:boolean)=>act(async()=>f.root.render(<LiveActions action={action} identity={f.identity} wallet={null} active={active} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 try{
  await render(true);await act(async()=>button(f.host,'Help someone receive')!.click());
  await act(async()=>button(f.host,'Prepare a receiving invitation')!.click());
  const message=f.host.querySelector<HTMLTextAreaElement>('textarea[maxlength="4000"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')!.set!.call(message,'Keep my reviewed receiving path.');message.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(f.host.querySelectorAll('dialog[open]')).toHaveLength(2);expect(document.body.style.position).toBe('fixed');
  await render(false);
  expect(f.host.querySelectorAll('dialog[open]')).toHaveLength(0);expect(document.body.style.position).toBe('');expect(document.documentElement.style.overflow).toBe('');
  await render(true);
  expect(f.host.querySelectorAll('dialog[open]')).toHaveLength(2);expect(f.host.querySelector<HTMLTextAreaElement>('textarea[maxlength="4000"]')?.value).toBe('Keep my reviewed receiving path.');
  expect(f.walletSend).toHaveBeenCalledOnce();expect(f.status).toHaveBeenCalledOnce();expect(f.fetch).not.toHaveBeenCalled();
 }finally{f.close();}
});
