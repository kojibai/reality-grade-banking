import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {createHeldLedgerOriginalReader} from '../src/receiz/held-ledger-original';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const runtime=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>runtime.sdk}));
const bytes=new Uint8Array(readFileSync('public/proofs/sealed-essay.png'));
const digest=createHash('sha256').update(bytes).digest('hex');
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('reads only the selected digest on demand and reuses immutable bytes, without source or account work',async()=>{
 let closed=false,source:{bytes:Uint8Array;filename:string}|null=null;
 const read=vi.fn(async()=>source),reader=createHeldLedgerOriginalReader({assertOpen(){if(closed)throw Error('CLOSED');},read});
 expect(read).not.toHaveBeenCalled();expect(await reader(digest)).toBeNull();
 source={bytes:bytes.slice(),filename:'held-original.png'};
 const first=await reader(digest);expect(new Uint8Array(await first!.arrayBuffer())).toEqual(bytes);
 source.bytes.fill(0);expect(await reader(digest)).toBe(first);expect(read.mock.calls).toEqual([[digest],[digest]]);
 closed=true;await expect(reader(digest)).rejects.toThrow('CLOSED');
});
it('refuses substituted or internal custody bytes and checks identity again after a pending read',async()=>{
 const reader=createHeldLedgerOriginalReader({assertOpen(){},read:async()=>({bytes:new Uint8Array([1,2,3]),filename:'wrong.receiz'})});
 await expect(reader(digest)).rejects.toThrow('PROOF_SOURCE_DIGEST_MISMATCH');
 const internal=createHeldLedgerOriginalReader({assertOpen(){},read:async()=>({bytes,filename:'internal.receiz',role:'account-coordination'})});
 await expect(internal(digest)).rejects.toThrow('PROOF_SOURCE_INVALID');
 let closed=false,release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 const delayed=createHeldLedgerOriginalReader({assertOpen(){if(closed)throw Error('CLOSED');},read:async()=>{await gate;return{bytes,filename:'held.png'};}});
 const pending=delayed(digest);closed=true;release();await expect(pending).rejects.toThrow('CLOSED');
});
it('exports a genuine privately held Original through canonical SDK admission without a public URL or public-cache leak',async()=>{
 // Real native Record -> Seal with the existing isolated test enrollment.
 // No production transaction, trust root or source is manufactured here.
 const fixture=await conformanceOfflineFixture({account:true});runtime.sdk=fixture.runtime;
 const admission=await fixture.runtime.createReceizArtifactAdmissionEngine()(await fixture.runtime.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 const sealer=fixture.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:fixture.store,resources:fixture.resources,fetch:async()=>{throw Error('NO_NETWORK');}});
 const sealed=await sealer.seal({bytes:new TextEncoder().encode('synthetic retained original'),filename:'retained.txt',mimeType:'text/plain'});
 const bytes=new Uint8Array(sealed.artifactBytes),digest=createHash('sha256').update(bytes).digest('hex');
 vi.resetModules();const api=await import('../src/receiz/ledger-offline-proof'),inspection=await import('../src/receiz/proof-inspection');
 let closed=false;const read=vi.fn(async()=>({bytes,filename:sealed.filename})),reader=createHeldLedgerOriginalReader({assertOpen(){if(closed)throw Error('CLOSED');},read});
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK'));
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'selected',kind:'chat_transfer',proofBundle:{artifactDigest:digest}}]}).records[0];
 const result=await api.inspectLedgerOriginal(record,undefined,reader);
 expect(result.report.artifactSha256).toBe(digest);expect(result.report.verification.integrity).toMatchObject({ok:true});
 expect(inspection.retainedProofInspection(digest)).toBeNull();expect(await inspection.reuseProofInspection(digest)).toBeNull();
 const file=await api.downloadLedgerOriginal(record,result.report,undefined,reader);
 expect(new Uint8Array(await file.arrayBuffer())).toEqual(bytes);expect(await api.inspectLedgerOriginal(record,undefined,reader)).toBe(result);
 expect(read).toHaveBeenCalledOnce();expect(fetcher).not.toHaveBeenCalled();
 await expect(api.downloadLedgerOriginal(record,result.report)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 closed=true;await expect(api.downloadLedgerOriginal(record,result.report,undefined,reader)).rejects.toThrow('CLOSED');
},60000);
