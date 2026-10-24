import {expect,it} from 'vitest';
import {createReceizIdentityKeyFile,createReceizClient} from '@receiz/sdk';
import {createVaultPublicRecord,inspectVaultPublicRecord,type VaultPublicNative} from '../src/receiz/vault/public-record';

const vaultId='1e60455a-a57b-43c7-94a4-cff2ef45db4c',app='rc_vault_tests';
async function fixture(){
 const {keyFile}=await createReceizIdentityKeyFile({owner:{uid:'vault-test-custody'}});
 const native:VaultPublicNative={async custody(){return{vaultId,applicationId:app,ownerReceizId:'owner.receiz.id',ownerAccountId:'owner-account',custodyAccountId:'vault-account',keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u};},async holding(kind,source){if((source as {schema?:unknown})?.schema!=='fixture.safe-public-native-witness')throw Error('UNSAFE_SOURCE');return{kind,id:'native-item',title:'Original holding',quantityMicro:'1000000',sourceHead:'a'.repeat(64),atKaiUPulse:'14781781000000'};}};
 const input={schema:'receiz.bank.vault-public-record.v1' as const,applicationId:app,vaultId,name:'Family reserve',kaiUPulse:'14781781000000',custodyWitness:{schema:'fixture.safe-custody-witness'},holdings:[{kind:'asset' as const,source:{schema:'fixture.safe-public-native-witness'}}]};
 const sign=(challengeB64Url:string)=>createReceizClient().identity.signLoginProof({keyFile,challengeB64Url});
 return{input,native,sign};
}
it('creates independently checkable read-only evidence using a real source-bound SDK holder signature',async()=>{
 const f=await fixture(),record=await createVaultPublicRecord(f.input,f.native,f.sign),checked=await inspectVaultPublicRecord(record,f.native);
 expect(checked.ownerReceizId).toBe('owner.receiz.id');expect(checked.holdings[0]).toMatchObject({title:'Original holding',quantityMicro:'1000000'});
 expect(checked.grantsAccess).toBe(false);expect(checked.currentUnspentness).toBe(false);
 expect(checked.recordSha256).toMatch(/^[a-f0-9]{64}$/);
});
it('rejects altered disclosure, substituted holder and duplicate or future-dated holdings',async()=>{
 const f=await fixture(),record=await createVaultPublicRecord(f.input,f.native,f.sign);
 await expect(inspectVaultPublicRecord({...record,name:'Other vault'},f.native)).rejects.toThrow('HOLDER');
 await expect(inspectVaultPublicRecord(record,{...f.native,async custody(v){return{...await f.native.custody(v),publicKeyRawB64u:'b3RoZXI'};}})).rejects.toThrow();
 await expect(createVaultPublicRecord({...f.input,holdings:[...f.input.holdings,...f.input.holdings]},f.native,f.sign)).rejects.toThrow('DUPLICATE');
 await expect(createVaultPublicRecord(f.input,{...f.native,async holding(k,s,c){return{...await f.native.holding(k,s,c),atKaiUPulse:'14781781000001'};}},f.sign)).rejects.toThrow('COORDINATE');
});
it('refuses private openings, encrypted private originals and grants even when a holder can sign',async()=>{
 const f=await fixture();
 for(const source of [{schema:'bank.vault.encrypted.v1',ciphertext:'not-public'},{schema:'fixture.safe-public-native-witness',privateAccountOpening:'secret'},{schema:'fixture.safe-public-native-witness',nested:{access_token:'secret'}}])await expect(createVaultPublicRecord({...f.input,holdings:[{kind:'asset',source}]},f.native,f.sign)).rejects.toThrow();
});
