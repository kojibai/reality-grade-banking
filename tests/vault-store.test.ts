import {afterEach,expect,it,vi} from 'vitest';
import {createVaultStore} from '../src/receiz/vault/store';
import {createVaultHeader,encryptVaultBytes} from '../src/receiz/vault/encryption';
afterEach(()=>vi.unstubAllGlobals());
it('constructs a Vault store without opening a database or touching account custody',()=>{
 vi.stubGlobal('indexedDB',{open:()=>{throw Error('unexpected eager database open');}});
 expect(createVaultStore()).toBeDefined();
});
it('rejects foreign identity writes and invalid names before opening storage',async()=>{
 const header=createVaultHeader({purpose:'vault-private',id:crypto.randomUUID(),owner:{keyId:'fixture-owner',receizId:'fixture.receiz.id'},credential:{id:'Zml4dHVyZQ',publicKeySpki:'Zml4dHVyZS1rZXk',rpId:'bankeiz.com',origin:'https://bankeiz.com'}});
 const envelope=await encryptVaultBytes(new TextEncoder().encode('synthetic original'),header,new Uint8Array(32).fill(1));
 vi.stubGlobal('indexedDB',{open:()=>{throw Error('unexpected database open');}});
 const store=createVaultStore();
 await expect(store.save('foreign-owner','My vault',envelope,null)).rejects.toThrow('VAULT_OWNER_MISMATCH');
 await expect(store.save('fixture-owner',' ',envelope,null)).rejects.toThrow('VAULT_NAME_INVALID');
 await expect(store.save('fixture-owner','x'.repeat(81),envelope,null)).rejects.toThrow('VAULT_NAME_INVALID');
});
