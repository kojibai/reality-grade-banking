import {expect,it} from 'vitest';
import {createImageVault,readVaultCarrier,openVaultCarrier} from '../src/receiz/vault/carrier';
import {createVaultHeader,encryptVaultBytes} from '../src/receiz/vault/encryption';
import {vaultBase64} from '../src/receiz/vault/encoding';

const id='1e60455a-a57b-43c7-94a4-cff2ef45db4c',owner={keyId:'a'.repeat(64),receizId:'owner.receiz.id'},original=new TextEncoder().encode('exact private source');
it('makes image-only custody an explicit private bearer original without a PBI or identity prompt',async()=>{
 const carrier=createImageVault(original,{id,owner});let prompts=0;
 expect(carrier.schema).toBe('bank.vault.image-custody.v1');
 expect(await openVaultCarrier(carrier,async()=>{prompts++;throw Error('NO_PROMPT');})).toEqual(original);
 expect(prompts).toBe(0);original.fill(0);
 expect(await openVaultCarrier(carrier)).toEqual(new TextEncoder().encode('exact private source'));
});
it('requires the real passkey secret for a PBI-protected carrier and never silently falls back to bearer',async()=>{
 const header=createVaultHeader({purpose:'vault-private',id,owner,credential:{id:vaultBase64(new Uint8Array([1,2])),publicKeySpki:vaultBase64(new Uint8Array([3,4])),rpId:'bankeiz.com',origin:'https://bankeiz.com'}}),secret=new Uint8Array(32).fill(4),bytes=new TextEncoder().encode('protected source'),carrier=await encryptVaultBytes(bytes,header,secret);
 await expect(openVaultCarrier(carrier)).rejects.toThrow('PROTECTION_REQUIRED');
 await expect(openVaultCarrier(carrier,async()=>new Uint8Array(32))).rejects.toThrow('UNLOCK');
 expect(await openVaultCarrier(carrier,async()=>new Uint8Array(secret))).toEqual(bytes);
 expect(()=>readVaultCarrier({...carrier,sourceB64u:vaultBase64(bytes)})).toThrow();
});
it('rejects a public record in every private carrier path',()=>{
 expect(()=>readVaultCarrier({schema:'receiz.bank.vault-public-record.v1',vaultId:id})).toThrow();
 expect(()=>createImageVault(new Uint8Array([1]),{id,owner:{...owner,receizId:'<script>'}})).toThrow();
});
