import {expect,it} from 'vitest';
import {vaultBase64,vaultCanonical,vaultDigest} from '../src/receiz/vault/encoding';
import {emptyVaultJournal} from '../src/receiz/vault/journal';
import {admitVaultPrivateSource,encodeVaultPrivateSource,readVaultPrivateSource} from '../src/receiz/vault/source';

const id='1e60455a-a57b-43c7-94a4-cff2ef45db4c',parent='2e60455a-a57b-43c7-94a4-cff2ef45db4c',child='3e60455a-a57b-43c7-94a4-cff2ef45db4c',key='a'.repeat(64),childKey='b'.repeat(64);
const bytes=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
async function fixture(){
 const originals=[bytes({kind:'accepted-native-custody-source'}),bytes({kind:'signed-native-submission'})];
 const blocks=await Promise.all(originals.map(async value=>({sha256:await vaultDigest(value),exactBytesB64u:vaultBase64(value)})));
 return{schema:'bank.vault.private-source.v1' as const,vaultId:id,name:'Family reserve',owner:{accountId:parent,keyId:key,receizId:'owner.receiz.id'},custody:{accountId:child,keyId:childKey,keyFileText:'private child original',passphrase:'',sourceRef:blocks[0].sha256,submissionRef:blocks[1].sha256},journal:emptyVaultJournal(id,key),workflows:{money:null,assets:null,market:null},blocks};
}
it('retains exact originals and admits authority from the contained native sources',async()=>{
 const value=await fixture(),encoded=encodeVaultPrivateSource(value),read=await readVaultPrivateSource(encoded);
 expect(read).toEqual(value);
 const admitted=await admitVaultPrivateSource(read,{async custody(original){expect(original).toEqual(new TextEncoder().encode('{"kind":"accepted-native-custody-source"}'));return{vaultId:id,ownerAccountId:parent,ownerKeyId:key,ownerReceizId:'owner.receiz.id',custodyAccountId:child,custodyKeyId:childKey};},async key(){return{keyId:childKey,accountId:child};},async workflows(){return{holdings:[]};}});
 expect(admitted.projection.holdings).toEqual([]);
});

it('rejects missing, substituted and duplicate source bytes before any native admission',async()=>{
 const value=await fixture();
 await expect(readVaultPrivateSource(encodeVaultPrivateSource({...value,blocks:value.blocks.slice(1)}))).rejects.toThrow('SOURCE_REQUIRED');
 await expect(readVaultPrivateSource(encodeVaultPrivateSource({...value,blocks:[...value.blocks,value.blocks[0]]}))).rejects.toThrow('SOURCE_DUPLICATE');
 await expect(readVaultPrivateSource(encodeVaultPrivateSource({...value,blocks:[{...value.blocks[0],exactBytesB64u:vaultBase64(bytes({changed:true}))},value.blocks[1]]}))).rejects.toThrow('SOURCE_CHANGED');
});

it('refuses a different identity, child key or admitted owner even inside decryptable transport',async()=>{
 const value=await fixture();
 const ports={async custody(){return{vaultId:id,ownerAccountId:parent,ownerKeyId:key,ownerReceizId:'owner.receiz.id',custodyAccountId:child,custodyKeyId:childKey};},async key(){return{keyId:childKey,accountId:child};},async workflows(){return null;}};
 await expect(admitVaultPrivateSource({...value,owner:{...value.owner,keyId:'c'.repeat(64)},journal:emptyVaultJournal(id,'c'.repeat(64))},ports)).rejects.toThrow('CUSTODY_MISMATCH');
 await expect(admitVaultPrivateSource(value,{...ports,async key(){return{keyId:key,accountId:child};}})).rejects.toThrow('CUSTODY_MISMATCH');
 await expect(admitVaultPrivateSource(value,{...ports,async custody(){return{...await ports.custody(),ownerAccountId:child};}})).rejects.toThrow('CUSTODY_MISMATCH');
});

it('keeps incomplete creation private and forbids active value state without admitted custody',async()=>{
 const value=await fixture(),prepared={...value,custody:{...value.custody,sourceRef:null}};
 expect((await readVaultPrivateSource(encodeVaultPrivateSource(prepared))).custody.sourceRef).toBeNull();
 await expect(readVaultPrivateSource(encodeVaultPrivateSource({...prepared,workflows:{...value.workflows,assets:{current:'claimed'}}}))).rejects.toThrow('CUSTODY_REQUIRED');
 await expect(readVaultPrivateSource(bytes({...value,access_token:'secret'}))).rejects.toThrow();
 await expect(readVaultPrivateSource(bytes({...value,workflows:{...value.workflows,market:{access_token:'secret'}}}))).rejects.toThrow('EPHEMERAL_ACCESS');
});
