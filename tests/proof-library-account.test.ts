import {beforeEach,expect,it,vi} from 'vitest';
import {createProofLibrary,type ProofSource} from '../src/receiz/proof-library';
import type {VerifiedAccountProof} from '../src/receiz/account-proof';

// Portability choreography beneath account-proof's independently tested
// canonical verifier. These fixtures do not qualify balances or issuer keys.
const admitted=vi.hoisted(()=>new Map<string,VerifiedAccountProof>());
vi.mock('../src/receiz/account-proof',()=>({verifyAccountProof:async(file:File,owner:{keyId:string;artifactOwnerReceizId:string})=>{
  const proof=admitted.get(await file.text());
  if(!proof)throw Error('ACCOUNT_PROOF_NATIVE_STATEMENT_UNVERIFIED');
  if(proof.statement.account.keyId!==owner.keyId||proof.statement.account.receizId!==owner.artifactOwnerReceizId)throw Error('ACCOUNT_PROOF_OWNER_MISMATCH');
  return proof;
}}));
const binding={keyId:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'};
beforeEach(()=>admitted.clear());
function setup(){
 const original=new TextEncoder().encode('{"schema":"bankeiz.account-proof.v1","sdkVersion":"129.0.0","source":"fixture exact wire"}');
 const proof={sourceDigest:'b'.repeat(64),statement:{account:{keyId:binding.keyId,receizId:binding.artifactOwnerReceizId}}} as VerifiedAccountProof;
 admitted.set(new TextDecoder().decode(original),proof);
 const source={kind:'account-source' as const,filename:'account.json',bytes:original},held:ProofSource[]=[];
 const commit=vi.fn(async(sources:ProofSource[])=>{held.push(...sources);return{added:sources.length,alreadyHeld:0};});
 const restoreAccounts=vi.fn(async()=>true);
 const api=createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>held,readAccount:async()=>[source],readRecoveries:async()=>[],readNotes:async()=>[],commit,restoreAccounts});
 return{api,source,proof,commit,restoreAccounts,held};
}
it('backs up the exact retained account original and restores only after explicit complete import',async()=>{
 const s=setup(),backup=await s.api.exportBackup();
 const parsed=JSON.parse(new TextDecoder().decode(backup.bytes));expect(parsed.sources).toHaveLength(1);expect(parsed.sources[0].kind).toBe('account-source');
 const review=await s.api.inspect(new File([new Uint8Array(backup.bytes)],backup.filename));
 expect(review.items[0]).toMatchObject({kind:'account-source',title:'Verified account history'});expect(s.commit).not.toHaveBeenCalled();expect(s.restoreAccounts).not.toHaveBeenCalled();
 expect(await s.api.retain(review)).toMatchObject({added:1,accountHistory:'restored'});
 expect(s.held[0].bytes).toEqual(s.source.bytes);expect(s.restoreAccounts).toHaveBeenCalledExactlyOnceWith([s.proof]);
 const saved=await s.api.exportProof(review.items[0].digest);expect(saved.bytes).toEqual(s.source.bytes);
 expect((await s.api.list())[0].kind).toBe('account-source');
 // An imported original and its retained-ledger copy are one backup member.
 expect(JSON.parse(new TextDecoder().decode((await s.api.exportBackup()).bytes)).sources).toHaveLength(1);
});
it('retains verified evidence when compatible account projection cannot be restored',async()=>{
 const s=setup();s.restoreAccounts.mockRejectedValueOnce(Error('ACCOUNT_PROOF_CONTINUITY_MISMATCH'));
 const review=await s.api.inspect(new File([new Uint8Array(s.source.bytes)],s.source.filename));
 expect(await s.api.retain(review)).toMatchObject({added:1,accountHistory:'retained'});expect(s.held[0].bytes).toEqual(s.source.bytes);
});
it('never restores history before archive commit and leaves a refused batch zero-write',async()=>{
 const s=setup(),review=await s.api.inspect(new File([new Uint8Array(s.source.bytes)],s.source.filename));
 s.commit.mockRejectedValueOnce(Error('PROOF_STORAGE_UNAVAILABLE'));
 await expect(s.api.retain(review)).rejects.toThrow('PROOF_STORAGE_UNAVAILABLE');expect(s.restoreAccounts).not.toHaveBeenCalled();expect(s.held).toEqual([]);
 await s.api.retain(review);expect(s.restoreAccounts).toHaveBeenCalledOnce();
});
it('refuses a mixed backup with an unverified account source before retaining or restoring any member',async()=>{
 const s=setup(),backup=await s.api.exportBackup(),pack=JSON.parse(new TextDecoder().decode(backup.bytes));
 const {receizBase64UrlEncode,sha256ReceizBytes}=await import('@receiz/sdk'),forged=new TextEncoder().encode('{"schema":"bankeiz.account-proof.v1","verified":true}');
 pack.sources.push({kind:'account-source',filename:'forged.json',sha256:await sha256ReceizBytes(forged),bytesB64u:receizBase64UrlEncode(forged)});
 await expect(s.api.inspect(new File([JSON.stringify(pack)],'mixed.json'))).rejects.toThrow('ACCOUNT_PROOF_NATIVE_STATEMENT_UNVERIFIED');
 expect(s.commit).not.toHaveBeenCalled();expect(s.restoreAccounts).not.toHaveBeenCalled();
});
it('does not let digest deduplication bypass structural validation of a duplicate member',async()=>{
 const s=setup(),backup=await s.api.exportBackup(),pack=JSON.parse(new TextDecoder().decode(backup.bytes));
 pack.sources.push({...pack.sources[0],filename:'../invalid.json'});
 await expect(s.api.inspect(new File([JSON.stringify(pack)],'duplicate.json'))).rejects.toThrow('PROOF_SOURCE_INVALID');expect(s.commit).not.toHaveBeenCalled();
 s.held.push(s.source,{...s.source,filename:'../invalid.json'});
 await expect(s.api.exportBackup()).rejects.toThrow('PROOF_SOURCE_INVALID');
});
it('can re-export a full thousand-original archive beside its duplicate retained account source',async()=>{
 const s=setup();s.held.push(s.source);
 for(let i=1;i<1000;i++){
  const text=JSON.stringify({schema:'bankeiz.account-proof.v1',fixture:i});admitted.set(text,s.proof);
  s.held.push({kind:'account-source',filename:`history-${i}.json`,bytes:new TextEncoder().encode(text)});
 }
 const pack=JSON.parse(new TextDecoder().decode((await s.api.exportBackup()).bytes));expect(pack.sources).toHaveLength(1000);
});
it('counts an exact account duplicate once at the 64 MiB private backup boundary',async()=>{
 const sourceSize=32*1024*1024,bindingText='{"schema":"bankeiz.account-proof.v1"}',one=bindingText.padEnd(sourceSize,' '),two=bindingText.padEnd(sourceSize-1,' ')+'\n';
 const s=setup();admitted.set(one,s.proof);admitted.set(two,s.proof);
 const sources:ProofSource[]=[{kind:'account-source',filename:'one.json',bytes:new TextEncoder().encode(one)},{kind:'account-source',filename:'two.json',bytes:new TextEncoder().encode(two)}];
 const api=createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>sources,readAccount:async()=>[sources[0]],readRecoveries:async()=>[],readNotes:async()=>[],commit:s.commit});
 const backup=await api.exportBackup();expect(backup.bytes.length).toBeGreaterThan(64*1024*1024);expect(backup.bytes.length).toBeLessThan(90*1024*1024);
},20_000);
