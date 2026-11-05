import {beforeAll,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import * as account from '../src/receiz/account-proof';
import {readAccountProofFile} from '../src/receiz/account-proof-png';
import {extractAccountProofPng} from '../src/receiz/account-proof-png';
import {accountProofArtwork,createAccountProofImage} from '../src/receiz/account-proof-image';
import {confirmPublicAccountProof} from '../src/receiz/account-proof-public';
import {createRecordProofExports} from '../src/receiz/record-proof-export';
import {Resvg} from '@resvg/resvg-js';
import {createProofLibrary,type ProofSource} from '../src/receiz/proof-library';
const ports=vi.hoisted(()=>({sdk:null as unknown,roots:new Map<string,unknown>()}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));
vi.mock('../native/receiz/packages/receiz-sdk/src/verifier/roots',()=>({receizCurrentPinnedSignatureV4Roots:()=>ports.roots}));
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,wire:File,original:File,owner:{keyId:string;artifactOwnerReceizId:string};
let nativeOpens=0;
let ownerSealer:ReturnType<typeof fixture.runtime.offline.createReceizOfflineSealer>;
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture({financial:true,account:true});
 const r=fixture.runtime,sdkClient=r.createReceizClient;
 ports.roots=new Map(fixture.roots.map(root=>[root.kid,root]));
 ports.sdk={...r,createReceizClient:()=>{const actual=sdkClient();return{...actual,artifacts:{...actual.artifacts,verifyAndOpen:async(file:File)=>{nativeOpens++;return actual.artifacts.verifyAndOpen(file);}}};}};
 const verification=await r.verifyReceizArtifact(fixture.identity.bytes),admission=await r.createReceizArtifactAdmissionEngine()(verification,{profile:'identity',identityPassphrase:fixture.identity.phrase}),binding=await r.readReceizIdentityPublicBinding(admission);
 owner={keyId:binding.keyId,artifactOwnerReceizId:binding.artifactOwnerReceizId};
 const hash=(v:string)=>v.repeat(64),now=String(r.receizKaiNow().uPulse),identity={receizId:binding.artifactOwnerReceizId,keyId:binding.keyId,alg:binding.alg,publicKeyRawB64u:binding.publicKeyRawB64u};
 const payload={schema:'bankeiz.public-account-statement.v2',applicationId:BANK_APPLICATION_ID,domain:'receiz.bank.native-account-statement.root-signature.v2',issuerRootKid:fixture.roots[0].kid,account:identity,
 checkpoint:{accountHead:hash('a'),identityBindingDigest:await r.digestReceizCanonicalV122(identity),genesisHead:hash('b'),historyHead:hash('b'),transactionCount:0,kaiUPulse:now,reserveUsdCents:'0',settlementPhiMicro:'0',balancePhiMicro:'0',usdPerPhiMicrocents:'100000000',historyDigest:await r.digestReceizCanonicalV122([])},transactions:[]};
 // Use the real existing canonical JSON routine for the signed statement.
 const {canonicalizeReceizV122}=await import('@receiz/sdk');
 const signature=await fixture.signFinancial(new TextEncoder().encode(canonicalizeReceizV122(payload)));
 const statement={...payload,rootSignature:{kid:signature.kid,alg:signature.alg,sig:signature.sig}};
 const sealer=r.offline.createReceizOfflineSealer({store:fixture.store,resources:fixture.resources,ownerIdentityAdmission:admission,fetch:async()=>{throw Error('NO_NETWORK_IN_ACCOUNT_EXPORT');}});
 ownerSealer=sealer;
 const payloadBytes=new TextEncoder().encode(canonicalizeReceizV122(statement)),sealed=await sealer.seal({bytes:payloadBytes,filename:'public-account.json',mimeType:'application/json'});
 // The existing Source account endpoint carries this standard envelope. Its
 // actual signed proof and payload are unchanged; the canonical reader below
 // must authenticate the whole container before any test can use the source.
 original=new File([canonicalizeReceizV122({kind:'receiz.bundle.v1',manifest:{filename:'public-account.json',mime:'application/json',basisSha256:await r.sha256ReceizBytes(payloadBytes),createdAt:sealed.verification.bundle.createdAtMs,version:1},originalBase64:r.receizBase64UrlEncode(payloadBytes),proofbundle:sealed.verification.bundle})],'public-account.receizbundle',{type:'application/vnd.receiz.bundle+json'});
 const opened=await r.createReceizClient().artifacts.verifyAndOpen(original);
 wire=new File([JSON.stringify({schema:'bankeiz.account-proof.v1',sdkVersion:'129.0.0',source:{schema:'receiz.sealed-artifact-bytes.v124',exactBytesB64u:r.receizBase64UrlEncode(new Uint8Array(await original.arrayBuffer())),filename:original.name,mimeType:original.type,artifactSha256:opened.sealedArtifact.artifactSha256,payloadSha256:opened.verifiedPayload.sha256}})],'bankeiz-account-proof.json',{type:'application/json'});
},60000);

it('exports the exact already opened canonical inner Original with zero reseal and preserves the old wrapper',async()=>{
 const proof=await account.verifyAccountProof(wire,owner),before=nativeOpens;
 const file=account.heldAccountProofOriginal(proof);
 expect(file.filename).toBe(original.name);expect(file.mimeType).toBe(original.type);
 expect(file.bytes).toEqual(new Uint8Array(await original.arrayBuffer()));
 expect(account.heldAccountProofBytes(proof)).toEqual(new Uint8Array(await wire.arrayBuffer()));
 expect(nativeOpens).toBe(before);
 file.bytes.fill(0);expect(account.heldAccountProofOriginal(proof).bytes).toEqual(new Uint8Array(await original.arrayBuffer()));
 expect(()=>account.heldAccountProofOriginal(structuredClone(proof))).toThrow('VERIFIED_SOURCE_REQUIRED');
});

it('roundtrips the canonical Original through the existing Bank file reader and common strict statement checks with one canonical open',async()=>{
 const before=nativeOpens,proof=await account.verifyAccountProof(await readAccountProofFile(original),owner);
 expect(nativeOpens-before).toBe(1);expect(proof.statement.account.receizId).toBe(owner.artifactOwnerReceizId);
 const saved=account.heldAccountProofOriginal(proof);
 expect(saved.bytes).toEqual(new Uint8Array(await original.arrayBuffer()));
 const wrapper=JSON.parse(new TextDecoder().decode(account.heldAccountProofBytes(proof)));
 expect(wrapper.schema).toBe('bankeiz.account-proof.v1');expect(wrapper.source.artifactSha256).toBe(proof.sourceDigest);
 await expect(account.verifyAccountProof(original,{keyId:'f'.repeat(64),artifactOwnerReceizId:'foreign.receiz.id'})).rejects.toThrow('OWNER_MISMATCH');
 const naked=JSON.stringify(proof.statement);await expect(account.verifyAccountProof(new File([naked],'unsealed.json'))).rejects.toThrow();
});
it('classifies the real canonical Account Original in the Library with one open and exports old wrappers as their held Original',async()=>{
 let archive:ProofSource[]=[];const sealRecordExport=vi.fn(),restoreAccounts=vi.fn(async()=>true),library=createProofLibrary({binding:owner,assertOpen(){},readOwned:async()=>[],readArchive:async()=>archive,readRecoveries:async()=>[],readNotes:async()=>[],commit:async rows=>{archive=rows;return{added:rows.length,alreadyHeld:0};},restoreAccounts,sealRecordExport});
 const file=new File([await original.arrayBuffer()],original.name,{type:original.type}),before=nativeOpens,review=await library.inspect(file);
 expect(nativeOpens-before).toBe(1);expect(review.items[0].kind).toBe('account-source');await library.retain(review);expect(restoreAccounts).toHaveBeenCalledOnce();
 expect((await library.exportProof(review.items[0].digest)).bytes).toEqual(new Uint8Array(await file.arrayBuffer()));
 const legacy=await library.inspect(new File([await wire.arrayBuffer()],wire.name,{type:wire.type}));await library.retain(legacy);
 const exported=await library.exportProof(legacy.items[0].digest);expect(exported.bytes).toEqual(new Uint8Array(await original.arrayBuffer()));expect(exported.filename).toBe(original.name);expect(sealRecordExport).not.toHaveBeenCalled();
});

it('keeps Account artwork and exact backup bytes inside a canonically sealed image, reusing the successful local capture',async()=>{
 const proof=await account.verifyAccountProof(wire,owner);
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(await wire.text()));
 try{await confirmPublicAccountProof(proof);}finally{network.mockRestore();}
 const states=new Map(),blobs=new Map<string,Uint8Array>();let seals=0,renders=0;
 const exports=createRecordProofExports({assertOpen(){},read:async key=>states.get(key),write:async(key,next)=>{states.set(key,next);},retain:async bytes=>{const digest=await fixture.runtime.sha256ReceizBytes(bytes);blobs.set(digest,bytes.slice());return digest;},restore:async digest=>blobs.get(digest)!.slice(),seal:async input=>{seals++;return ownerSealer.seal(input);}});
 const render=async(svg:string)=>{renders++;return new Resvg(svg).render().asPng();};
 const pixels=new Resvg(accountProofArtwork(proof)).render().asPng();
 // Only browser rasterization is simulated; real canonical crypto below is
 // unchanged. This lets the old implementation reach its missing outer seal.
 vi.stubGlobal('Image',class{src='';async decode(){}});
 vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}}),toBlob:(done:(value:Blob)=>void)=>done(new Blob([new Uint8Array(pixels)],{type:'image/png'}))})});
 let first:Awaited<ReturnType<typeof createAccountProofImage>>;
 try{first=await createAccountProofImage(proof,input=>exports.export(input),render);}finally{vi.unstubAllGlobals();}
 expect((await fixture.runtime.verifyReceizArtifact(first.bytes)).status).toBe('verified-artifact');
 const opened=await fixture.runtime.openPayload({fileBytes:first.bytes,filename:first.filename,mime:'image/png',signatureV4RootPublicKeys:ports.roots});
 expect(opened.ok).toBe(true);expect(extractAccountProofPng(opened.payloadBytes)).toEqual(new Uint8Array(await wire.arrayBuffer()));
 const again=await createAccountProofImage(proof,input=>exports.export(input),render);
 expect(again.bytes).toEqual(first.bytes);expect(seals).toBe(1);expect(renders).toBe(1);
 const tampered=first.bytes.slice();tampered[50]^=1;expect((await fixture.runtime.verifyReceizArtifact(tampered)).status).not.toBe('verified-artifact');
 const roundtrip=await account.verifyAccountProof(await readAccountProofFile(new File([new Uint8Array(first.bytes)],first.filename,{type:'image/png'})),owner);
 expect(roundtrip.sourceDigest).toBe(proof.sourceDigest);
});
