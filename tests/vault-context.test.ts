import {expect,it} from 'vitest';
import {createVaultContext} from '../src/receiz/vault/context';
import {createVaultHeader,decryptVaultBytes,encryptVaultBytes} from '../src/receiz/vault/encryption';
import {vaultBase64,vaultCanonical,vaultDigest} from '../src/receiz/vault/encoding';
import {emptyVaultJournal,prepareVaultOperation} from '../src/receiz/vault/journal';
import {encodeVaultPrivateSource,readVaultPrivateSource} from '../src/receiz/vault/source';
import {createImageVault} from '../src/receiz/vault/carrier';

const id='1e60455a-a57b-43c7-94a4-cff2ef45db4c',ownerKey='a'.repeat(64),childKey='b'.repeat(64),secret=new Uint8Array(32).fill(7);
const json=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
async function fixture(){
 const original=json({kind:'complete-native-original'}),ref=await vaultDigest(original);
 const source={schema:'bank.vault.private-source.v1' as const,vaultId:id,name:'Family reserve',owner:{accountId:'2e60455a-a57b-43c7-94a4-cff2ef45db4c',keyId:ownerKey,receizId:'owner.receiz.id'},custody:{accountId:'3e60455a-a57b-43c7-94a4-cff2ef45db4c',keyId:childKey,keyFileText:'private child original',passphrase:'',sourceRef:ref,submissionRef:ref},journal:emptyVaultJournal(id,ownerKey),workflows:{money:null,assets:null,market:null},blocks:[{sha256:ref,exactBytesB64u:vaultBase64(original)}]};
 const header=createVaultHeader({purpose:'vault-private',id,owner:{keyId:ownerKey,receizId:'owner.receiz.id'},credential:{id:vaultBase64(new Uint8Array([1,2])),publicKeySpki:vaultBase64(new Uint8Array([3,4])),rpId:'bankeiz.com',origin:'https://bankeiz.com'}}),envelope=await encryptVaultBytes(encodeVaultPrivateSource(source),header,secret);
 return{source,header,envelope,original,ref};
}
it('does no work before explicit open and retains only encrypted originals through CAS',async()=>{
 const f=await fixture();let admitted=0,persisted=0,actual=f.envelope,expectedDigest=await vaultDigest(json(actual));
 const context=createVaultContext({envelope:actual,expectedDigest,async presence(){return new Uint8Array(secret);},async admit(value){admitted++;return value;},async persist(next,expected){expect(expected).toBe(expectedDigest);expectedDigest=await vaultDigest(json(next));if(next.schema!=='bank.vault.encrypted.v1')throw Error('wrong protection');actual=next;persisted++;return expectedDigest;}});
 expect(admitted).toBe(0);expect(persisted).toBe(0);
 await context.open();expect(admitted).toBe(1);
 const fresh=new Uint8Array([9,8,7]);const ref=await context.retain(fresh);fresh.fill(0);
 expect(await context.restore(ref)).toEqual(new Uint8Array([9,8,7]));expect(persisted).toBe(1);
 const reopened=await readVaultPrivateSource(await decryptVaultBytes(actual,secret));
 expect(reopened.blocks.some(b=>b.sha256===ref)).toBe(true);
 const previous=await context.read('assets');await context.write('assets',{state:'private'},previous);
 await expect(context.write('assets',{state:'overwrite'},previous)).rejects.toThrow('CONFLICT');
 expect(JSON.stringify(actual)).not.toContain('private child original');
});

it('opens image-only custody without PBI and contains no parent account recovery authority',async()=>{
 const f=await fixture(),carrier=createImageVault(encodeVaultPrivateSource(f.source),{id,owner:{keyId:ownerKey,receizId:'owner.receiz.id'}});
 const context=createVaultContext({envelope:carrier,expectedDigest:await vaultDigest(json(carrier)),async admit(value){return value;},async persist(next){return vaultDigest(json(next));}});
 await context.open();expect(context.snapshot().custody.keyId).toBe(childKey);
 expect(context.snapshot()).not.toHaveProperty('identityOriginal');
 await context.authorize({kind:'send',recipient:'receiver.receiz.id'});
 await context.write('assets',{prepared:'private'},null);
 await context.reopenPrepared(context.exportPrivate().bytes);
 expect(context.hasReopenedPrepared()).toBe(true);
});

it('locks immediately, wipes its supplied secret and rejects late callbacks',async()=>{
 const f=await fixture(),supplied=new Uint8Array(secret);let complete!:(v:unknown)=>void;
 const context=createVaultContext({envelope:f.envelope,expectedDigest:await vaultDigest(json(f.envelope)),async presence(){return supplied;},admit:async value=>new Promise(resolve=>{complete=()=>resolve(value);}),async persist(){throw Error('must not write');}});
 const opening=context.open();for(let i=0;i<20&&!complete;i++)await new Promise(resolve=>setTimeout(resolve,1));
 context.lock();complete(null);
 await expect(opening).rejects.toThrow('CLOSED');expect(supplied.every(v=>v===0)).toBe(true);
 await expect(context.restore(f.ref)).rejects.toThrow('CLOSED');
});

it('acknowledges a backup only when the exact saved encrypted original was reopened',async()=>{
 const f=await fixture();
 const context=createVaultContext({envelope:f.envelope,expectedDigest:await vaultDigest(json(f.envelope)),async presence(){return new Uint8Array(secret);},async admit(value){return value;},async persist(next){return vaultDigest(json(next));}});
 await context.open();
 const saved=context.exportPrivate();await context.reopenPrepared(saved.bytes);
 expect(context.hasReopenedPrepared()).toBe(true);
 await context.write('assets',{prepared:'new'},null);
 expect(context.hasReopenedPrepared()).toBe(false);
 await expect(context.reopenPrepared(saved.bytes)).rejects.toThrow('EXACT_ORIGINAL_REQUIRED');
 await context.reopenPrepared(context.exportPrivate().bytes);expect(context.hasReopenedPrepared()).toBe(true);
});

it('retains journal transitions through the same whole-original CAS and invalidates an earlier prepared backup',async()=>{
 const f=await fixture(),carrier=createImageVault(encodeVaultPrivateSource(f.source),{id,owner:{keyId:ownerKey,receizId:'owner.receiz.id'}});
 const context=createVaultContext({envelope:carrier,expectedDigest:await vaultDigest(json(carrier)),admit:async source=>source,persist:async next=>vaultDigest(json(next))});
 await context.open();await context.reopenPrepared(context.exportPrivate().bytes);expect(context.hasReopenedPrepared()).toBe(true);
 const before=context.snapshot().journal,next=await prepareVaultOperation(before,{id:'exact-card-intent',kind:'card.fund',requestRef:f.ref});await context.writeJournal(next,before);
 expect(context.hasReopenedPrepared()).toBe(false);expect(context.snapshot().journal).toEqual(next);
 await expect(context.writeJournal(before,before)).rejects.toThrow('CONFLICT');
});
