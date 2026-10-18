/** Library choreography only. The canonical hostile-source test separately
 * exercises the real v129 verifier; these projections are not issuer evidence. */
import {beforeEach,expect,it,vi} from 'vitest';
import {createProofLibrary,type ProofSource} from '../src/receiz/proof-library';

const boundary=vi.hoisted(()=>({owner:'sender.receiz.id',keyId:'a'.repeat(64)}));
vi.mock('../src/receiz/native-asset',()=>({verifyNativeAssetSource:async(packet:unknown)=>{
 const value=packet as {status?:unknown;forged?:unknown};
 if(!['committed','zero-write'].includes(String(value.status))||value.forged)throw Error('BANK_ASSET_FINANCIAL_SOURCE_INVALID');
 return{receipt:{schema:value.status==='committed'?'receiz.bank.native-asset-receipt.v1':'receiz.bank.native-asset-refusal.v1',review:{request:{actorReceizId:boundary.owner,requestId:'asset-test-0001'},keyId:boundary.keyId}}};
}}));
beforeEach(()=>{boundary.owner='sender.receiz.id';boundary.keyId='a'.repeat(64);});
const binding={artifactOwnerReceizId:'sender.receiz.id',keyId:'a'.repeat(64)};
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
function fixture(){
 let archive:ProofSource[]=[];
 const commit=vi.fn(async(rows:ProofSource[])=>{archive=structuredClone(rows);return{added:rows.length,alreadyHeld:0};});
 const make=(recoveries:ProofSource[]=[])=>createProofLibrary({binding,assertOpen(){},readOwned:async()=>[],readArchive:async()=>archive,readRecoveries:async()=>recoveries,readNotes:async()=>[],commit});
 return{make,commit};
}
it.each(['committed','zero-write'] as const)('roundtrips an admitted %s asset receipt through backup and individual import',async status=>{
 const source:ProofSource={kind:'asset-receipt' as ProofSource['kind'],filename:'asset.receiz-asset.json',bytes:bytes({schema:'receiz.bank.native-asset-result.v1',status})};
 const f=fixture(),backup=await f.make([source]).exportBackup(),library=f.make();
 const review=await library.inspect(new File([new Uint8Array(backup.bytes)],backup.filename));
 expect(review.items[0]).toMatchObject({kind:'asset-receipt',title:status==='committed'?'Asset receipt':'Asset expiry proof',operationId:'asset-test-0001'});
 expect(f.commit).not.toHaveBeenCalled();await library.retain(review);
 const reopened=await library.list();expect((await library.exportProof(reopened[0].digest)).bytes).toEqual(source.bytes);
 expect((await library.inspect(new File([new Uint8Array(source.bytes)],source.filename))).items[0].kind).toBe('asset-receipt');
});
it.each(['owner','key'] as const)('refuses a verified asset receipt for a foreign %s before retention',async mismatch=>{
 const f=fixture();if(mismatch==='owner')boundary.owner='foreign.receiz.id';else boundary.keyId='b'.repeat(64);
 await expect(f.make().inspect(new File([bytes({schema:'receiz.bank.native-asset-result.v1',status:'committed'})],'asset.json'))).rejects.toThrow('PROOF_BACKUP_IDENTITY_MISMATCH');
 expect(f.commit).not.toHaveBeenCalled();
});
it.each([{status:'unknown'},{status:'committed',forged:true}])('refuses an unknown or hostile asset source before any archive write',async fields=>{
 const f=fixture();await expect(f.make().inspect(new File([bytes({schema:'receiz.bank.native-asset-result.v1',...fields})],'asset.json'))).rejects.toThrow('BANK_ASSET_FINANCIAL_SOURCE_INVALID');
 expect(f.commit).not.toHaveBeenCalled();
});
