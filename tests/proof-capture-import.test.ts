import {beforeAll,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createProofLibrary,type ProofSource} from '../src/receiz/proof-library';
import {openCanonicalProofFile} from '../src/receiz/proof-capture';
import {captureNoteDepositProof,readNoteProofImport} from '../src/receiz/note-proof-portability';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
// @ts-expect-error Generated, typed through the application port.
import * as native from '../public/native/offline-notes.v129.mjs';
import {openConnectedAccountNote,type ConnectedNoteModule} from '../src/receiz/connected-note-application';
import {Resvg} from '@resvg/resvg-js';
const ports=vi.hoisted(()=>({sdk:null as unknown,native:vi.fn(),recover:vi.fn(),noteReceiver:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));
vi.mock('../src/receiz/note-proof-portability',async importOriginal=>{
 const actual=await importOriginal<typeof import('../src/receiz/note-proof-portability')>();
 return{...actual,inspectNoteProof:(source:ProofSource,keyId:string)=>ports.noteReceiver?actual.inspectNoteProof(source,keyId,async()=>ports.noteReceiver as Awaited<ReturnType<NonNullable<Parameters<typeof actual.inspectNoteProof>[2]>>>):actual.inspectNoteProof(source,keyId)};
});
// Capture routing only. Other tests below exercise the actual native Note
// verifier with its recorded synthetic root policy, without changing roots.
vi.mock('../src/receiz/native-payment',()=>({verifyNativePaymentSource:async(value:unknown)=>ports.native(value)}));
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>,sealer:ReturnType<typeof f.runtime.offline.createReceizOfflineSealer>,binding:{keyId:string;artifactOwnerReceizId:string};
let opens=0,seals=0;
beforeAll(async()=>{
 f=await conformanceOfflineFixture({account:true});const r=f.runtime,admission=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
 binding=await r.readReceizIdentityPublicBinding(admission);sealer=r.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 ports.sdk={...r,recoverReceizPortableExecutionTransitionSetV124:ports.recover,createReceizClient:()=>{const client=r.createReceizClient();return{...client,artifacts:{...client.artifacts,verifyAndOpen:async(file:File)=>{opens++;return client.artifacts.verifyAndOpen(file);}}};}};
},60000);
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
async function capture(bytes:Uint8Array,filename='private-native.json',mimeType='application/octet-stream'){
 seals++;const result=await sealer.seal({bytes,filename,mimeType});return new File([result.artifactBytes],result.filename,{type:result.mimeType});
}
async function bundleCapture(bytes:Uint8Array,filename:string,mimeType:string){
 // Existing native SDK sealing primitive, with an explicit ephemeral fixture
 // enrollment and its actual bundle option. No format or signature is forged.
 const seal=await native.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const result=await seal({fileBytes:bytes,filename,mime:mimeType,options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId:binding.artifactOwnerReceizId,recordId:`record:${await f.runtime.sha256ReceizBytes(bytes)}`}}});
 return new File([new Uint8Array(result.artifactBytes)],result.downloadName,{type:'application/vnd.receiz.bundle+json'});
}
function library(){let archive:ProofSource[]=[],open=true;const commit=vi.fn(async(rows:ProofSource[])=>{archive=structuredClone(rows);return{added:rows.length,alreadyHeld:0};});const seal=vi.fn(async(input:{bytes:Uint8Array;filename:string;mimeType:string})=>capture(input.bytes,input.filename,input.mimeType));return{commit,seal,close(){open=false;},api:createProofLibrary({binding,assertOpen(){if(!open)throw Error('PROOF_IDENTITY_CLOSED');},readOwned:async()=>[],readArchive:async()=>archive,readRecoveries:async()=>[],readNotes:async()=>[],commit,sealRecordExport:seal})};}
it('coalesces the canonical open of one immutable File and isolates returned payload bytes',async()=>{
 const file=await capture(encode({private:'unchanged'})),before=opens,[a,b]=await Promise.all([openCanonicalProofFile(file),openCanonicalProofFile(file)]);
 expect(opens-before).toBe(1);expect(a.verifiedPayload.bytes).toEqual(b.verifiedPayload.bytes);a.verifiedPayload.bytes.fill(0);
 expect(JSON.parse(new TextDecoder().decode((await openCanonicalProofFile(file)).verifiedPayload.bytes))).toEqual({private:'unchanged'});
 const other=new File(['forged'],file.name,{type:file.type});await expect(openCanonicalProofFile(other)).rejects.toThrow();
});
it('retains a captured native payment outer file while its unchanged receiver gets the exact private packet',async()=>{
 const packet={schema:'receiz.bank.native-payment-result.v1',status:'committed',source:{fullPrivatePacket:'preserved'}},bytes=encode(packet),file=await capture(bytes),s=library(),before=opens;
 ports.native.mockImplementation(async(value:unknown)=>{expect(value).toEqual(packet);return{receipt:{schema:'receiz.bank.native-payment-receipt.v1',review:{keyId:binding.keyId,request:{actorReceizId:binding.artifactOwnerReceizId,requestId:'synthetic-payment'}}}};});
 const review=await s.api.inspect(file);expect(opens-before).toBe(1);expect(review.items[0].kind).toBe('payment-receipt');expect(s.commit).not.toHaveBeenCalled();await s.api.retain(review);
 expect(s.commit.mock.calls[0][0][0].bytes).toEqual(new Uint8Array(await file.arrayBuffer()));
 const exported=await s.api.exportProof(review.items[0].digest);expect(exported.bytes).toEqual(new Uint8Array(await file.arrayBuffer()));expect(s.seal).not.toHaveBeenCalled();
 expect((await s.api.inspect(new File([new Uint8Array(exported.bytes)],exported.filename))).items[0].kind).toBe('payment-receipt');
 ports.native.mockResolvedValueOnce({receipt:{schema:'receiz.bank.native-payment-receipt.v1',review:{keyId:'foreign',request:{actorReceizId:binding.artifactOwnerReceizId,requestId:'synthetic-payment'}}}});
 await expect(s.api.inspect(file)).rejects.toThrow('PROOF_BACKUP_IDENTITY_MISMATCH');
});
it('captures an old raw native export once through the existing port and reimports that outer file',async()=>{
 const packet={schema:'receiz.bank.native-payment-result.v1',status:'committed',source:{fullPrivatePacket:'preserved'}},s=library();
 ports.native.mockResolvedValue({receipt:{schema:'receiz.bank.native-payment-receipt.v1',review:{keyId:binding.keyId,request:{actorReceizId:binding.artifactOwnerReceizId,requestId:'synthetic-payment'}}}});
 const review=await s.api.inspect(new File([encode(packet)],'legacy.json'));await s.api.retain(review);
 const exported=await s.api.exportProof(review.items[0].digest);expect(s.seal).toHaveBeenCalledOnce();expect(s.seal.mock.calls[0][0].bytes).toEqual(encode(packet));
 const file=new File([new Uint8Array(exported.bytes)],exported.filename);expect((await s.api.inspect(file)).items[0].kind).toBe('payment-receipt');
});
it('refuses a private native export when the owner closes during the final SDK-file read',async()=>{
 const packet={schema:'receiz.bank.native-payment-result.v1',status:'committed',source:{fullPrivatePacket:'preserved'}},s=library();
 ports.native.mockResolvedValue({receipt:{schema:'receiz.bank.native-payment-receipt.v1',review:{keyId:binding.keyId,request:{actorReceizId:binding.artifactOwnerReceizId,requestId:'synthetic-payment'}}}});
 const review=await s.api.inspect(new File([encode(packet)],'legacy.json'));await s.api.retain(review);
 let reading!:(value:ArrayBuffer)=>void,release!:(value:ArrayBuffer)=>void,original!:ArrayBuffer;const started=new Promise<void>(resolve=>{reading=()=>resolve();});
 s.seal.mockImplementationOnce(async input=>{const file=await capture(input.bytes,input.filename,input.mimeType);original=await file.arrayBuffer();Object.defineProperty(file,'arrayBuffer',{value:()=>{reading(original);return new Promise<ArrayBuffer>(resolve=>{release=resolve;});}});return file;});
 const pending=s.api.exportProof(review.items[0].digest);await started;s.close();release(original);await expect(pending).rejects.toThrow('PROOF_IDENTITY_CLOSED');
});
it('never downgrades an invalid JSON-whitespace capture to its otherwise valid raw native packet',async()=>{
 const packet={schema:'receiz.bank.native-payment-result.v1',status:'committed',source:{fullPrivatePacket:'preserved'}},file=await capture(encode(packet),'native.json','application/json'),changed=new Uint8Array(await file.arrayBuffer()),s=library();
 // Preserve the JSON value and carrier delimiters; corrupt its proof bits.
 changed[changed.length-80]=changed[changed.length-80]===32?9:32;expect(JSON.parse(new TextDecoder().decode(changed))).toEqual(packet);
 ports.native.mockClear();await expect(s.api.inspect(new File([changed],file.name,{type:file.type}))).rejects.toThrow();expect(ports.native).not.toHaveBeenCalled();expect(s.commit).not.toHaveBeenCalled();
});
it('does not convert an ordinary canonical Original into a new capture or authority',async()=>{
 const file=await capture(encode({text:'ordinary original'}),'ordinary.json','application/json'),s=library(),before=seals,review=await s.api.inspect(file);expect(review.items[0].kind).toBe('owned-source');await s.api.retain(review);
 expect((await s.api.exportProof(review.items[0].digest)).bytes).toEqual(new Uint8Array(await file.arrayBuffer()));expect(seals).toBe(before);expect(s.seal).not.toHaveBeenCalled();
});
it('verifies the complete private recovery payload and refuses forged outer bytes before the recovery reader',async()=>{
 const {BANK_APPLICATION_ID}=await import('../src/receiz/config'),packet={schema:'receiz.portable-execution-transition-recovery.v124',transitionSet:{applicationId:BANK_APPLICATION_ID,members:[{operationPlan:{applicationId:BANK_APPLICATION_ID,attemptId:'synthetic-attempt'}}]},members:[{completePrivateRecovery:'preserved'}]},file=await capture(encode(packet)),s=library();ports.recover.mockResolvedValue({});
 const review=await s.api.inspect(file);expect(review.items[0]).toMatchObject({kind:'execution-recovery',operationId:'synthetic-attempt'});expect(ports.recover).toHaveBeenLastCalledWith(packet,{audience:BANK_APPLICATION_ID});
 const changed=new Uint8Array(await file.arrayBuffer());changed[0]^=1;ports.recover.mockClear();await expect(s.api.inspect(new File([changed],file.name))).rejects.toThrow();expect(ports.recover).not.toHaveBeenCalled();expect(s.commit).not.toHaveBeenCalled();
});
it('carries the actual connected receipt through canonical capture and the unchanged strict native receiver',async()=>{
 const bytes=new Uint8Array(gunzipSync(readFileSync(new URL('./fixtures/connected-note/credit.receipt.gz',import.meta.url)))),meta=JSON.parse(readFileSync(new URL('./fixtures/connected-note/metadata.json',import.meta.url),'utf8')),roots=new Map(meta.issuerRootPublicKeys.map((root:{kid:string})=>[root.kid,root]));
 const before=await native.verifyBankConnectedNoteReceipt(bytes,{roots});
 const seal=vi.fn(async(input:{bytes:Uint8Array;filename:string;mimeType:string})=>capture(input.bytes,input.filename,input.mimeType));
 const file=await captureNoteDepositProof(bytes,'native-receipt.receiz.json',seal),opened=await openCanonicalProofFile(file);
 expect(opened.verifiedPayload.bytes).toEqual(bytes);
 expect(await readNoteProofImport(file)).toEqual(bytes);
 const after=await native.verifyBankConnectedNoteReceipt(opened.verifiedPayload.bytes,{roots});
 expect(after.credit.receiverKeyId).toBe(before.credit.receiverKeyId);expect(after.credit.redemptionDigest).toBe(before.credit.redemptionDigest);expect(after.terminalSourceBytes).toEqual(before.terminalSourceBytes);
 expect(seal.mock.calls[0][0].mimeType).toBe('application/octet-stream');
 // Strict native readers receive the original bytes, never the enclosing
 // artifact or JSON reserialized with carrier fields/whitespace.
 await expect(native.verifyBankConnectedNoteReceipt(new Uint8Array(await file.arrayBuffer()),{roots})).rejects.toThrow();
 const changed=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));changed.privateAccountOpening='e30';
 await expect(native.verifyBankConnectedNoteReceipt(encode(changed),{roots})).rejects.toThrow();
},60000);
it('reopens a captured older connected Note PNG as exact native bytes while retaining receiver and corruption checks',async()=>{
 const png=new Uint8Array(gunzipSync(readFileSync(new URL('./fixtures/connected-note/note.png.gz',import.meta.url)))),meta=JSON.parse(readFileSync(new URL('./fixtures/connected-note/metadata.json',import.meta.url),'utf8')),roots=new Map(meta.issuerRootPublicKeys.map((root:{kid:string})=>[root.kid,root]));
 const module={...native,readBankConnectedNoteImage:(bytes:Uint8Array)=>native.readBankConnectedNoteImage(bytes,{roots}),readBankConnectedNoteSource:(bytes:Uint8Array)=>native.readBankConnectedNoteSource(bytes,{roots})}as ConnectedNoteModule;
 const context={receiverUserId:meta.receiver.uid,receiverKeyId:meta.receiver.keyId},original=await openConnectedAccountNote(module,png,context);
 const reader=async()=>({isBankConnectedNoteImage:native.isBankConnectedNoteImage,openReserveNoteImage:(bytes:Uint8Array)=>native.openBankNoteImage(bytes,{roots}),inspectReserveNote:(handle:unknown)=>native.readBankFundedNoteHead(handle)});
 const direct=await capture(png,'older-note.png','application/octet-stream'),file=await bundleCapture(png,'older-note.png','application/octet-stream'),bytes=await readNoteProofImport(file,reader);
 const directBytes=await readNoteProofImport(direct,reader);expect(directBytes).toEqual(new Uint8Array(await direct.arrayBuffer()));expect((await openConnectedAccountNote(module,directBytes,context)).terminalSourceBytes).toEqual(original.terminalSourceBytes);
 expect(bytes).toEqual(png);const reopened=await openConnectedAccountNote(module,bytes,context);expect(reopened.terminalArtifactSha256).toBe(original.terminalArtifactSha256);expect(reopened.redemptionDigest).toBe(original.redemptionDigest);expect(reopened.terminalSourceBytes).toEqual(original.terminalSourceBytes);
 await expect(openConnectedAccountNote(module,bytes,{...context,receiverKeyId:'f'.repeat(64)})).rejects.toThrow('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 const changed=new Uint8Array(await file.arrayBuffer());changed[changed.length-50]^=1;await expect(readNoteProofImport(new File([changed],file.name),reader)).rejects.toThrow();
 const inner=png.slice();inner[inner.length-30]^=1;await expect(openConnectedAccountNote(module,inner,context)).rejects.toThrow();
 const ordinary=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="blue"/></svg>').render().asPng(),ordinaryFile=await capture(ordinary,'ordinary.png','image/png');
 expect(await readNoteProofImport(ordinaryFile,reader)).toEqual(new Uint8Array(await ordinaryFile.arrayBuffer()));
},60000);
it('retains Note-image role and exact outer bytes across Library export/import of the real older PNG',async()=>{
 const png=new Uint8Array(gunzipSync(readFileSync(new URL('./fixtures/connected-note/note.png.gz',import.meta.url)))),meta=JSON.parse(readFileSync(new URL('./fixtures/connected-note/metadata.json',import.meta.url),'utf8')),roots=new Map(meta.issuerRootPublicKeys.map((root:{kid:string})=>[root.kid,root]));
 const unexpected=async()=>{throw Error('UNEXPECTED_NATIVE_RECEIVER_PATH');};
 ports.noteReceiver={isBankConnectedNoteImage:native.isBankConnectedNoteImage,isBankConnectedNoteSource:native.isBankConnectedNoteSource,inspectConnectedNote:async(bytes:Uint8Array)=>await native.isBankConnectedNoteImage(bytes)?native.readBankConnectedNoteImage(bytes,{roots}):native.readBankConnectedNoteSource(bytes,{roots}),isBankNoteAccountDeposit:native.isBankNoteAccountDeposit,inspectAccountNoteDeposit:unexpected,openReserveNoteImage:(bytes:Uint8Array)=>native.openBankNoteImage(bytes,{roots}),inspectReserveNote:native.readBankFundedNoteHead,inspectNoteDepositReceipt:unexpected,inspectConnectedNoteReceipt:unexpected,exportVerifiedNoteDepositReceipt:unexpected};
 try{
  const s=library(),review=await s.api.inspect(new File([png],'older-note.png',{type:'image/png'}));expect(review.items[0].kind).toBe('note-image');await s.api.retain(review);
  s.seal.mockImplementationOnce(async input=>bundleCapture(input.bytes,input.filename,input.mimeType));
  const exported=await s.api.exportProof(review.items[0].digest);expect(s.seal).toHaveBeenCalledOnce();expect(s.seal.mock.calls[0][0].bytes).toEqual(png);
  const next=await s.api.inspect(new File([new Uint8Array(exported.bytes)],exported.filename));expect(next.items[0].kind).toBe('note-image');await s.api.retain(next);
  expect(s.commit.mock.calls.at(-1)![0][0].bytes).toEqual(exported.bytes);expect((await s.api.exportProof(next.items[0].digest)).bytes).toEqual(exported.bytes);expect(s.seal).toHaveBeenCalledOnce();
 }finally{ports.noteReceiver=null;}
},60000);
