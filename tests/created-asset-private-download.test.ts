import {afterEach,expect,it,vi} from 'vitest';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createdAssetOriginalFile,prepareCreatedAssetPrimary} from '../src/receiz/created-asset-file';
import {composerOriginalCustody} from '../src/receiz/composer-original-custody';
import {loadDeviceIdentity,saveDeviceIdentity} from '../src/receiz/identity-vault';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {AssetComposerDraft} from '../src/receiz/asset-composer';

// Select the real bundled runtime and real offline verifier under the fixture's
// explicit synthetic roots. No SDK guard or verification result is replaced.
const selected=vi.hoisted(()=>({runtime:null as any,verify:null as any}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>selected.runtime}));
vi.mock('@receiz/sdk/offline',()=>({verifyReceizOfflineSealedFile:(input:unknown)=>selected.verify(input)}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const uid='11111111-1111-4111-8111-111111111111';
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
function pdf(){let text='%PDF-1.4\n';const offsets=[0],objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>'];for(let i=0;i<objects.length;i++){offsets.push(text.length);text+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=text.length;text+=`xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new TextEncoder().encode(text);}
function wav(){const bytes=new Uint8Array(46),view=new DataView(bytes.buffer),text=(at:number,value:string)=>bytes.set(new TextEncoder().encode(value),at);text(0,'RIFF');view.setUint32(4,38,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,8000,true);view.setUint16(32,1,true);view.setUint16(34,8,true);text(36,'data');view.setUint32(40,2,true);bytes.set([128,128],44);return bytes;}
type Cipher={key:string;iv:Uint8Array;bytes:ArrayBuffer};
async function privateOperations(){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-bank-private-custody',3);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{return await new Promise<Cipher[]>((resolve,reject)=>{const request=db.transaction('operations').objectStore('operations').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}
}
async function putPrivateOperation(row:Cipher){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('receiz-bank-private-custody',3);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
 try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('operations','readwrite');tx.objectStore('operations').put(row,row.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}

it('saves exact canonically sealed protected PDF/audio from encrypted owner custody after a cold runtime reload, without public blocks or resealing',async()=>{
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const fixture=await conformanceOfflineFixture({composer:true}),r=fixture.runtime;
 const network=vi.fn(async()=>{throw Error('PRIVATE_ORIGINAL_EXPORT_NETWORK_FORBIDDEN');});vi.stubGlobal('fetch',network);
 const admitted=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(fixture.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 expect(admitted.verdict).toBe('canonical-identity');const owner=(await r.readReceizIdentityPublicBinding(admitted)).artifactOwnerReceizId;
 const binding={artifactSha256:await hash(new Uint8Array(fixture.identity.bytes)),artifactOwnerReceizId:owner};
 await saveDeviceIdentity(new Uint8Array(fixture.identity.bytes),'identity.png',fixture.identity.phrase,true);
 expect((await loadDeviceIdentity())?.bytes).toEqual(new Uint8Array(fixture.identity.bytes));
 const privateCustody=composerOriginalCustody(binding,()=>{}),publicCustody=r.createImportedProofSourceCustody();
 const sealDocument=vi.fn(await r.createBankNativeNoteSealer({enrollment:await fixture.store.load(),resources:fixture.resources}));
 const sealer=r.offline.createReceizOfflineSealer({store:fixture.store,resources:fixture.resources,ownerIdentityAdmission:admitted});
 const seal=vi.fn((input:unknown)=>sealer.seal(input)),forbidden=vi.fn(async()=>{throw Error('PRIVATE_ORIGINAL_SAVE_MUST_NOT_RESEAL');});
 const identity={binding,accountUsername:()=> 'artist',walletReceivingAddress:()=>uid,sealRecordExport:forbidden} as unknown as OpenIdentity;
 selected.runtime=r.connectedComposer;selected.verify=r.offline.verifyReceizOfflineSealedFile;
 const inputs=[{kind:'pdf',name:'private-original.pdf',mime:'application/pdf',bytes:pdf()},
  {kind:'audio',name:'private-original.wav',mime:'audio/wav',bytes:wav()}] as const;
 let captured:{original:HeldDeposit;descriptor:{name:string;mime:string;sha256:string;bytes:{sha256:string}};bytes:Uint8Array}|undefined;
 for(const input of inputs){
  const draft:AssetComposerDraft={title:'Protected '+input.name,description:'Its exact sealed Original stays private.',kind:input.kind,longForm:'',
   collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:input.kind==='audio',originalDownloadLimit:3,derivativeDownloadLimit:null,originalDownloadPriceCents:125,derivativeDownloadPriceCents:null},
   files:[{id:'primary',role:'primary',file:new File([input.bytes],input.name,{type:input.mime})}]};
  selected.runtime=r.connectedComposer;selected.verify=r.offline.verifyReceizOfflineSealedFile;
  const count=seal.mock.calls.length,preparedDraft=await prepareCreatedAssetPrimary({draft,profileIdentity:uid,seal,assertCurrent(){}});
  expect(seal).toHaveBeenCalledTimes(count+1);expect(preparedDraft.files).toEqual([]);expect(preparedDraft.protectedOriginal?.profileIdentity).toBe(uid);
  const exactFile=preparedDraft.protectedOriginal!.file,exact=new Uint8Array(await exactFile.arrayBuffer());
  expect((await r.offline.verifyReceizOfflineSealedFile({bytes:exact,filename:exactFile.name,mimeType:exactFile.type})).ok).toBe(true);
  await expect(r.composer.prepareConnectedComposerContent({draft:preparedDraft,ownerReceizId:owner,writeBlock:publicCustody.writeBlock,assertCurrent(){}})).rejects.toThrow('COMPOSER_PROTECTED_ORIGINAL_CUSTODY_REQUIRED');
  const prepared=await r.composer.prepareConnectedComposerSource({draft:preparedDraft,ownerReceizId:owner,sealDocument,writeBlock:publicCustody.writeBlock,writeProtectedBlock:privateCustody.writeProtectedBlock,assertCurrent(){}});
  const descriptor=prepared.content.protectedOriginal.file;expect(descriptor.sha256).toBe(await hash(exact));
  await expect(publicCustody.resolveBlock(descriptor.bytes)).rejects.toThrow('IMPORTED_SOURCE_CUSTODY_SEGMENT_MISSING');
  const original={digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name} as HeldDeposit;
  const before=new Uint8Array(original.bytes),sealCount=seal.mock.calls.length,sourceSealCount=sealDocument.mock.calls.length;
  const file=await createdAssetOriginalFile(identity,original,()=>{}),bytes=new Uint8Array(await file.arrayBuffer());
  expect(bytes).toEqual(exact);expect(file.name).toBe(descriptor.name);expect(file.type).toBe(descriptor.mime);expect(file.name).not.toMatch(/\.receizbundle$/i);
  const verified=await r.offline.verifyReceizOfflineSealedFile({bytes,filename:file.name,mimeType:file.type});expect(verified.ok).toBe(true);
  const opened=await r.openPayload({fileBytes:bytes,filename:file.name,mime:file.type,signatureV4RootPublicKeys:new Map(fixture.roots.map((root:{kid:string})=>[root.kid,root]))});
  expect(opened.ok).toBe(true);expect(opened.payloadBytes).toEqual(input.bytes);
  const cold=await fixture.reloadRuntime();selected.runtime=cold.connectedComposer;selected.verify=cold.offline.verifyReceizOfflineSealedFile;
  const coldPublic=cold.createImportedProofSourceCustody();await expect(coldPublic.resolveBlock(descriptor.bytes)).rejects.toThrow('IMPORTED_SOURCE_CUSTODY_SEGMENT_MISSING');
  const reopened=await createdAssetOriginalFile(identity,original,()=>{});expect(new Uint8Array(await reopened.arrayBuffer())).toEqual(exact);
  expect((await cold.offline.verifyReceizOfflineSealedFile({bytes:new Uint8Array(await reopened.arrayBuffer()),filename:reopened.name,mimeType:reopened.type})).ok).toBe(true);
  expect(seal).toHaveBeenCalledTimes(sealCount);expect(sealDocument).toHaveBeenCalledTimes(sourceSealCount);expect(original.bytes).toEqual(before);
  captured={original,descriptor,bytes:exact};
 }
 expect(network).not.toHaveBeenCalled();expect(forbidden).not.toHaveBeenCalled();
 const databases=await indexedDB.databases();expect(databases.map(value=>value.name)).toContain('receiz-bank-private-custody');expect(databases.map(value=>value.name)).toContain('receiz-imported-source-custody-v1');
 const rawProtected=await r.composer.prepareConnectedComposerSource({draft:{title:'Unsigned private file',description:'',kind:'audio',longForm:'',files:[],
  collection:{allowOriginalDownload:true,allowDerivativeDownload:false,allowMomentRecordDownload:false,gateAudioPlayback:true,originalDownloadLimit:3,derivativeDownloadLimit:null,originalDownloadPriceCents:125,derivativeDownloadPriceCents:null},
  protectedOriginal:{profileIdentity:uid,file:new File([wav()],'unsigned.wav',{type:'audio/wav'})}},ownerReceizId:owner,sealDocument,writeBlock:publicCustody.writeBlock,writeProtectedBlock:privateCustody.writeProtectedBlock,assertCurrent(){}});
 await expect(createdAssetOriginalFile(identity,{digest:rawProtected.reference.artifactSha256,bytes:new Uint8Array(await rawProtected.artifact.arrayBuffer()),filename:rawProtected.artifact.name} as HeldDeposit,()=>{})).rejects.toThrow('ORIGINAL_FILE_PROOF_INVALID');
 const current=captured!;
 await expect(createdAssetOriginalFile({...identity,walletReceivingAddress:()=> '22222222-2222-4222-8222-222222222222'} as OpenIdentity,current.original,()=>{})).rejects.toThrow('ORIGINAL_FILE_OWNER_REQUIRED');
 await expect(createdAssetOriginalFile(identity,{...current.original,digest:'e'.repeat(64)},()=>{})).rejects.toThrow('ORIGINAL_FILE_SOURCE_MISMATCH');
 const other=await fixture.otherIdentity(),otherAdmitted=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([other.bytes],'other-identity.png')),{profile:'identity',identityPassphrase:other.phrase});
 expect(otherAdmitted.verdict).toBe('canonical-identity');const foreignOwner=(await r.readReceizIdentityPublicBinding(otherAdmitted)).artifactOwnerReceizId;
 await expect(createdAssetOriginalFile({...identity,binding:{...binding,artifactOwnerReceizId:foreignOwner}} as OpenIdentity,current.original,()=>{})).rejects.toThrow();
 await expect(createdAssetOriginalFile({...identity,binding:{...binding,artifactSha256:await hash(other.bytes)}} as OpenIdentity,current.original,()=>{})).rejects.toThrow('BANK_EXECUTION_IDENTITY_CHANGED');
 const rows=await privateOperations();expect(rows.length).toBeGreaterThanOrEqual(2);expect(rows.every(row=>row.key.startsWith('composer-original-source|'))).toBe(true);
 const row=rows.find(value=>value.key.endsWith('|'+current.descriptor.bytes.sha256))!;expect(row).toBeDefined();
 expect(new TextDecoder().decode(row.bytes)).not.toContain('WAVEfmt ');expect(new Uint8Array(row.bytes)).not.toEqual(current.bytes);
 const damaged={...row,bytes:row.bytes.slice(0)};new Uint8Array(damaged.bytes)[0]^=1;await putPrivateOperation(damaged);
 await expect(createdAssetOriginalFile(identity,current.original,()=>{})).rejects.toMatchObject({name:'OperationError'});
 expect((await privateOperations()).find(value=>value.key===row.key)?.bytes).toEqual(damaged.bytes);
 await putPrivateOperation(row);expect(new Uint8Array(await(await createdAssetOriginalFile(identity,current.original,()=>{})).arrayBuffer())).toEqual(current.bytes);
 expect(network).not.toHaveBeenCalled();expect(forbidden).not.toHaveBeenCalled();expect(seal).toHaveBeenCalledTimes(inputs.length);
},180000);
