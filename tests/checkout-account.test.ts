import {expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({open:vi.fn(),select:vi.fn(),restore:vi.fn()}));
vi.mock('../src/receiz/native-identity',()=>({openCanonicalIdentity:f.open,restoreNativeIdentity:f.restore,createNativeIdentity:vi.fn(),importNativeIdentity:vi.fn()}));
vi.mock('../src/receiz/identity-vault',()=>({prepareVerifiedEmailAccountSelection:f.select}));
vi.mock('../src/receiz/device-identity-entry',()=>({withDeviceIdentityEntry:(work:()=>Promise<unknown>)=>work()}));
import {importCheckoutIdentityRecord} from '../src/checkout/checkout-account';
it('SDK-opens the chosen record before selecting its actual account and preserves the old guest custody',async()=>{
 const retain=vi.fn(),persist=vi.fn(),dispose=vi.fn(),backup={bytes:new Uint8Array([7]),phrase:'',filename:'original.png'};
 f.open.mockResolvedValue({matchesAccountEmail:async(email:string)=>email==='target@example.org',prepareAccountView:async()=>({wallet:{userId:'existing-account'}}),backup:()=>backup,persistDeviceCustody:persist,dispose});f.select.mockResolvedValue({retainRecovered:retain});
 const previous={binding:{artifactSha256:'a'.repeat(64)},knownWallet:()=>({wallet:{userId:'guest-account'}})};
 await importCheckoutIdentityRecord(previous as never,new File([new Uint8Array([7])],'original.png'),'','target@example.org');
 expect(f.open).toHaveBeenCalledWith(new Uint8Array([7]),'','original.png',true);expect(f.select).toHaveBeenCalledWith({accountUid:'guest-account',artifactSha256:'a'.repeat(64)},'existing-account');expect(retain).toHaveBeenCalledWith({...backup,readConsent:true});expect(retain.mock.invocationCallOrder[0]).toBeLessThan(persist.mock.invocationCallOrder[0]!);expect(dispose).not.toHaveBeenCalled();
});
it('a rejected record never selects or replaces held custody',async()=>{f.select.mockClear();f.open.mockRejectedValue(Error('SDK_IDENTITY_REFUSED'));await expect(importCheckoutIdentityRecord({} as never,new File(['altered'],'altered.png'),'','target@example.org')).rejects.toThrow('SDK_IDENTITY_REFUSED');expect(f.select).not.toHaveBeenCalled();});

it('the production checkout factory preserves the intended email through the actual importer',async()=>{
 const previous={binding:{artifactSha256:'a'.repeat(64)},knownWallet:()=>({wallet:{userId:'guest-account'}}),dispose:vi.fn()},matchesAccountEmail=vi.fn(async(email:string)=>email==='target@example.org');
 f.restore.mockResolvedValue(previous);f.open.mockResolvedValue({matchesAccountEmail,prepareAccountView:async()=>({wallet:{userId:'existing-account'}}),backup:()=>({bytes:new Uint8Array([7]),phrase:'',filename:'original.png'}),persistDeviceCustody:vi.fn(),dispose:vi.fn()});f.select.mockResolvedValue({retainRecovered:vi.fn()});
 const session=await(await import('../src/checkout/checkout-identity')).checkoutIdentitySession();await session.restore!();await session.import(new File([new Uint8Array([7])],'original.png'),'','target@example.org');expect(matchesAccountEmail.mock.calls).toEqual([['target@example.org'],['target@example.org','existing-account']]);expect(previous.dispose).toHaveBeenCalledOnce();session.close();
});
it('refuses a valid key whose prepared Native wallet differs from its matched intended email account before custody selection',async()=>{
 f.select.mockClear();const dispose=vi.fn(),match=vi.fn(async(_email:string,uid?:string)=>uid===undefined);
 f.open.mockResolvedValue({matchesAccountEmail:match,prepareAccountView:async()=>({wallet:{userId:'different-bound-account'}}),dispose});
 await expect(importCheckoutIdentityRecord({binding:{artifactSha256:'a'.repeat(64)},knownWallet:()=>({wallet:{userId:'guest'}})} as never,new File(['record'],'valid.png'),'','target@example.org')).rejects.toThrow('CHECKOUT_IDENTITY_ACCOUNT_MISMATCH');expect(f.select).not.toHaveBeenCalled();expect(dispose).toHaveBeenCalledOnce();expect(match).toHaveBeenLastCalledWith('target@example.org','different-bound-account');
});
