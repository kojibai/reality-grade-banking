import {beforeAll,expect,it,vi} from 'vitest';
import {Resvg} from '@resvg/resvg-js';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createVaultPublicReader,type VaultDisclosure} from '../src/receiz/vault/public-reader';
import {inspectVaultDisclosure} from '../src/receiz/vault/disclose';
import {exportVaultPublicImage} from '../src/receiz/vault/export';
import {vaultCanonical,vaultDigest} from '../src/receiz/vault/encoding';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {IDBFactory} from 'fake-indexeddb';
import {exportPublicRecordProof} from '../src/receiz/public-record-export';
const selection=vi.hoisted(()=>({roots:new Map<string,unknown>(),sdk:null as unknown,offline:null as any,resources:null as unknown,store:null as unknown,seals:0}));
vi.mock('../native/receiz/packages/receiz-sdk/src/verifier/roots',()=>({receizCurrentPinnedSignatureV4Roots:()=>selection.roots}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>selection.sdk}));
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>selection.store,createReceizOfflineSealer:(options:unknown)=>{const actual=selection.offline.createReceizOfflineSealer(options);return{...actual,seal:async(input:unknown)=>{selection.seals++;return actual.seal(input);}};}}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>selection.resources}));
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>,record:Record<string,unknown>,inspect:(raw:unknown)=>Promise<VaultDisclosure>,publicSealer:ReturnType<typeof f.runtime.offline.createReceizOfflineSealer>;
beforeAll(async()=>{
 f=await conformanceOfflineFixture({financial:true,account:true,vault:true});const r=f.runtime;selection.roots=new Map(f.roots.map(root=>[root.kid,root]));selection.sdk=r;
 selection.offline=r.offline;selection.resources=f.resources;selection.store=f.store;
 const owner={artifactOwnerReceizId:'vaultowner.receiz.id'}; // Explicit synthetic issuer-attested native witness owner, no real account.
 const child=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']),publicKeyRawB64u=r.receizBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw',child.publicKey))),keyId=await r.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u,'Ed25519');
 const vaultId='10000000-0000-4000-8000-000000000001',ownerUserId='20000000-0000-4000-8000-000000000001',accountId=await r.deriveVaultCustodyAccountId(ownerUserId,vaultId),h=(v:string)=>v.repeat(64),issuedAtKaiUPulse=String(r.receizKaiNow().uPulse);
 const payload={schema:'receiz.bank.vault-custody-witness.v1',domain:'receiz.bank.vault-custody-witness.root-signature.v1',vaultId,applicationId:BANK_APPLICATION_ID,ownerUserId,ownerReceizId:owner.artifactOwnerReceizId,accountId,keyId,alg:'Ed25519',publicKeyRawB64u,receivingAddress:r.vaultCustodyReceivingAddress(accountId),relationSourceSha256:h('a'),relationInputSha256:h('b'),parentHead:h('c'),childHead:h('d'),issuedAtKaiUPulse,issuerRootKid:f.roots[0].kid};
 const signature=await f.signFinancial(new TextEncoder().encode(vaultCanonical(payload))),statement={...payload,rootSignature:{kid:signature.kid,alg:signature.alg,sig:signature.sig}},sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}),payloadBytes=new TextEncoder().encode(vaultCanonical(statement)),sealed=await sealDocument({fileBytes:payloadBytes,filename:'vault-custody-witness.json',mime:'application/json',options:{nativeRecordSeal:{ownerReceizId:owner.artifactOwnerReceizId,recordId:'record:'+await r.sha256ReceizBytes(payloadBytes)}}});
 const core={schema:'receiz.bank.vault-public-record.v1',applicationId:BANK_APPLICATION_ID,vaultId,name:'Public witness capture',kaiUPulse:String(r.receizKaiNow().uPulse),custodyWitness:{schema:'receiz.bank.vault-custody-witness-source.v1',source:{filename:'vault-custody-witness.receizbundle',mimeType:'application/vnd.receiz.bundle+json',artifactSha256:await r.sha256ReceizBytes(sealed.artifactBytes),exactBytesB64u:r.receizBase64UrlEncode(sealed.artifactBytes)}},holdings:[]};
 const challenge=await r.vaultPublic.vaultPublicRecordChallenge(core);
 record={...core,holderProof:{schema:'receiz.identity.login_proof.v1',keyId,alg:'Ed25519',challengeB64Url:challenge,signatureB64Url:r.receizBase64UrlEncode(new Uint8Array(await crypto.subtle.sign('Ed25519',child.privateKey,r.receizBase64UrlDecode(challenge))))}};
 inspect=raw=>inspectVaultDisclosure(raw,undefined,{native:async()=>r.vaultPublic});
 await inspect(record); // Actual native custody/issuer/holder verification, no stub.
 publicSealer=r.offline.createReceizOfflineSealer({store:f.store,resources:f.resources,fetch:async()=>{throw Error('NO_NETWORK');}});
},60000);
const render=async(svg:string)=>new Resvg(svg).render().asPng();
const canonicalCapture=async(disclosure:VaultDisclosure)=>{
 const image=await exportVaultPublicImage(disclosure.record,inspect,{render,seal:input=>publicSealer.seal(input),verify:async bytes=>(await f.runtime.verifyReceizArtifact(bytes)).status==='verified-artifact'});
 return new File([new Uint8Array(image.bytes)],image.filename,{type:image.mimeType});
};

it('reuses an opened exact sealed Vault PNG with zero export signing and rejects a detached disclosure',async()=>{
 const image=await canonicalCapture(await inspect(record));let captures=0;
 const reader=createVaultPublicReader({inspect,capture:async value=>{captures++;return canonicalCapture(value);}}),opened=await reader.open(new Uint8Array(await image.arrayBuffer()),image.name);
 const saved=await reader.export(opened);
 expect(new Uint8Array(await saved.arrayBuffer())).toEqual(new Uint8Array(await image.arrayBuffer()));expect(captures).toBe(0);
 await expect(reader.export(structuredClone(opened))).rejects.toThrow('VERIFIED_SOURCE_REQUIRED');
});

it('captures a native-verified raw public record once, keeping owner witnesses distinct from the export signer',async()=>{
 let captures=0;const reader=createVaultPublicReader({inspect,capture:async value=>{captures++;return canonicalCapture(value);}}),opened=await reader.open(new TextEncoder().encode(vaultCanonical(record)));
 const [a,b]=await Promise.all([reader.export(opened),reader.export(opened)]);
 expect(captures).toBe(1);expect(new Uint8Array(await a.arrayBuffer())).toEqual(new Uint8Array(await b.arrayBuffer()));
 const verified=await f.runtime.verifyReceizArtifact(a);expect(verified.status).toBe('verified-artifact');expect(verified.continuity.state).toBe('not_applicable');
 const reopened=await reader.open(new Uint8Array(await a.arrayBuffer()),a.name);
 expect(reopened.ownerReceizId).toBe(opened.ownerReceizId);expect(vaultCanonical(reopened.record)).toBe(vaultCanonical(record));expect(reopened.grantsAccess).toBe(false);expect(reopened.currentUnspentness).toBe(false);
 const corrupt=new Uint8Array(await a.arrayBuffer());corrupt[50]^=1;expect((await f.runtime.verifyReceizArtifact(corrupt)).status).not.toBe('verified-artifact');
 const proofBefore=await vaultDigest(new TextEncoder().encode(vaultCanonical(opened.record)));(opened.record as {name:string}).name='Altered after native verification';
 await expect(reader.export(opened)).rejects.toThrow('SOURCE_CHANGED');expect(captures).toBe(1);expect(await vaultDigest(new TextEncoder().encode(vaultCanonical(record)))).toBe(proofBefore);
});

it('refuses forged/private records before they can enter the export path',async()=>{
 let captures=0;const reader=createVaultPublicReader({inspect,capture:async value=>{captures++;return canonicalCapture(value);}});
 await expect(reader.open(new TextEncoder().encode(vaultCanonical({...record,privateAccountOpening:'private'})))).rejects.toThrow();
 const forged=structuredClone(record);(forged.holderProof as {signatureB64Url:string}).signatureB64Url='a'.repeat(86);
 await expect(reader.open(new TextEncoder().encode(vaultCanonical(forged)))).rejects.toThrow();expect(captures).toBe(0);
 const altered=await reader.open(new TextEncoder().encode(vaultCanonical(record)));
 altered.holdings.push({kind:'money',id:'invented',title:'Invented display',amountPhiMicro:'1000000',sourceHead:'f'.repeat(64),atKaiUPulse:altered.sealedAtKaiUPulse});
 await expect(reader.export(altered)).rejects.toThrow('SOURCE_CHANGED');expect(captures).toBe(0);
});

it('uses the default public signer and persistent local export once, cold-restores the exact file and refuses corrupted storage',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());let verificationReads=0;
 const r=f.runtime;selection.sdk={...r,verifyReceizArtifact:async(input:Uint8Array)=>{verificationReads++;return r.verifyReceizArtifact(input);}};
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_NETWORK_OR_ACCOUNT_COMMAND'));
 try{
  const raw=new TextEncoder().encode(vaultCanonical(record));expect((await r.verifyReceizArtifact(raw)).status).toBe('invalid');
  const firstReader=createVaultPublicReader({inspect}),view=await firstReader.open(raw),file=await firstReader.export(view);
  expect(selection.seals).toBe(1);const verified=await r.verifyReceizArtifact(file);expect(verified.status).toBe('verified-artifact');expect(verified.payloadDigest.value).toBe(await vaultDigest(raw));
  const nextReader=createVaultPublicReader({inspect}),same=await nextReader.export(await nextReader.open(raw));
  expect(new Uint8Array(await same.arrayBuffer())).toEqual(new Uint8Array(await file.arrayBuffer()));expect(selection.seals).toBe(1);expect(verificationReads).toBe(1);
  const reopenedReader=createVaultPublicReader({inspect}),reopened=await reopenedReader.open(new Uint8Array(await same.arrayBuffer()),same.name,same.type),saved=await reopenedReader.export(reopened);
  expect(new Uint8Array(await saved.arrayBuffer())).toEqual(new Uint8Array(await same.arrayBuffer()));expect(saved.type).toBe(same.type);expect(selection.seals).toBe(1);
  expect(JSON.stringify(reopened.record)).not.toMatch(/privateKey|passphrase|privateAccountOpening|identityOriginal/);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('bankeiz.public-record-exports.v1',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith('blob:'))cursor.update(new Uint8Array([1,2,3]));cursor.continue();};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
  const corruptReader=createVaultPublicReader({inspect});await expect(corruptReader.export(await corruptReader.open(raw))).rejects.toThrow('SOURCE_MISMATCH');expect(selection.seals).toBe(1);expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();vi.unstubAllGlobals();}
});

it('snapshots the public export request before lazy runtime work, including bytes and scalar metadata',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());
 try{
  const bytes=new TextEncoder().encode('{"value":1}'),expected=bytes.slice(),input={bytes,filename:'original.json',mimeType:'application/json',recordHash:'a'.repeat(64)};
  const work=exportPublicRecordProof(input);
  input.bytes.set(new TextEncoder().encode('{"value":2}'));input.filename='changed.json';input.mimeType='application/octet-stream';input.recordHash='b'.repeat(64);
  const file=await work,verified=await f.runtime.verifyReceizArtifact(file);
  expect(verified.status).toBe('verified-artifact');expect(verified.payloadDigest.value).toBe(await vaultDigest(expected));expect(file.name).toContain('original');expect(file.type).toBe('application/octet-stream'); // Canonical SDK JSON/trailer output MIME, preserved exactly.
 }finally{vi.unstubAllGlobals();}
});
