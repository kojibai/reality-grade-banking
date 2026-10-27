// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {IdentityProfile} from '../src/features/account/IdentityProfile';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({reserve:vi.fn(),connect:vi.fn(),module:vi.fn()}));
vi.mock('../src/receiz/pbi-account-bridge',()=>({reservePbiAccountPopup:p.reserve}));
vi.mock('../src/receiz/pbi-account-connect',()=>{p.module();return{connectPbiToAccount:p.connect};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps profile signing lazy and connects the exact active identity only on explicit click',async()=>{
 const identity={username:'held-account',binding:{identityOwnerReceizId:'original-device'},needsPhrase:false} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host),popup={close:vi.fn(),closed:false};p.reserve.mockReturnValue(popup);p.connect.mockResolvedValue({});
 try{
  await act(async()=>root.render(<IdentityProfile identity={identity} onForget={vi.fn()} onRefresh={vi.fn()}/>));
  const row=host.querySelector<HTMLButtonElement>('.identity-passkey')!;expect(row).not.toBeNull();expect(row.textContent).toBe('Verify profileSign with PBI');expect(row.querySelector('svg')?.getAttribute('width')).toBe('23');expect(row.querySelector('svg')?.getAttribute('stroke-width')).toBe('1.4');expect(p.module).not.toHaveBeenCalled();expect(p.reserve).not.toHaveBeenCalled();
  await act(async()=>{row.click();});expect(p.connect).toHaveBeenCalledWith(identity,expect.any(Function));expect(host.querySelector('.identity-passkey')?.textContent).toBe('Verified profileVerified');expect(row.disabled).toBe(true);expect(identity.binding.identityOwnerReceizId).toBe('original-device');
 }finally{act(()=>root.unmount());}
});
