import {expect,it,vi} from 'vitest';
import {createVaultHeader,encryptVaultBytes} from '../src/receiz/vault/encryption';
import {encodeIdentityRecovery,openIdentityRecovery} from '../src/receiz/vault/recovery';

const owner={keyId:'fixture-owner',receizId:'fixture.receiz.id'},secret=new Uint8Array(32).fill(9);
const credential={id:'Zml4dHVyZQ',publicKeySpki:'Zml4dHVyZS1rZXk',rpId:'bankeiz.com',origin:'https://bankeiz.com'};
const header=()=>createVaultHeader({purpose:'identity-recovery',id:crypto.randomUUID(),owner,credential});
const original={bytes:new TextEncoder().encode('synthetic original; canonical admission is a separate boundary'),filename:'Identity Record.png',phrase:'synthetic phrase only'};
const protect=(value=encodeIdentityRecovery(original))=>encryptVaultBytes(value,header(),secret);
const identity=(keyId=owner.keyId,identityOwnerReceizId=owner.receizId)=>({binding:{keyId,identityOwnerReceizId},dispose:vi.fn()});

it('delivers exact recovered bytes and phrase to canonical identity admission before returning an identity',async()=>{
 const admitted=identity(),read=vi.fn(async()=>admitted),envelope=await protect();
 expect(await openIdentityRecovery(envelope,secret,read,new AbortController().signal)).toBe(admitted);
 const recovered=read.mock.calls[0] as unknown as [typeof original];
 expect(recovered[0]).toEqual(original);
 expect(JSON.stringify(envelope)).not.toContain(original.phrase);
});
it('does not grant identity authority merely because private recovery decrypted successfully',async()=>{
 const envelope=await protect(),read=vi.fn(async()=>{throw Error('CANONICAL_IDENTITY_REQUIRED');});
 await expect(openIdentityRecovery(envelope,secret,read,new AbortController().signal)).rejects.toThrow('CANONICAL_IDENTITY_REQUIRED');
 expect(read).toHaveBeenCalledOnce();
});
it.each(['key','owner'])('closes a canonically admitted identity with a substituted %s binding',async field=>{
 const admitted=field==='key'?identity('another-key'):identity(owner.keyId,'another.receiz.id');
 await expect(openIdentityRecovery(await protect(),secret,async()=>admitted,new AbortController().signal)).rejects.toThrow('VAULT_OWNER_MISMATCH');
 expect(admitted.dispose).toHaveBeenCalledOnce();
});
it('rejects malformed or public recovery content before identity admission',async()=>{
 const read=vi.fn(async()=>identity());
 for(const value of [{schema:'bank.vault.public.v1'}, {...JSON.parse(new TextDecoder().decode(encodeIdentityRecovery(original))),token:'unexpected'}]){
  await expect(openIdentityRecovery(await protect(new TextEncoder().encode(JSON.stringify(value))),secret,read,new AbortController().signal)).rejects.toThrow();
 }
 expect(read).not.toHaveBeenCalled();
});
it('does not open ordinary Vault custody as an Identity Record',async()=>{
 const h={...header(),purpose:'vault-private' as const},envelope=await encryptVaultBytes(encodeIdentityRecovery(original),h,secret),read=vi.fn(async()=>identity());
 await expect(openIdentityRecovery(envelope,secret,read,new AbortController().signal)).rejects.toThrow('VAULT_RECOVERY_REQUIRED');
 expect(read).not.toHaveBeenCalled();
});
it('closes a recovered identity when the owner leaves during canonical admission',async()=>{
 const controller=new AbortController(),admitted=identity();
 await expect(openIdentityRecovery(await protect(),secret,async()=>{controller.abort();return admitted;},controller.signal)).rejects.toThrow('VAULT_CLOSED');
 expect(admitted.dispose).toHaveBeenCalledOnce();
});
