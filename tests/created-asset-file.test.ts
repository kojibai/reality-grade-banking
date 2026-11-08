import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {composerCustodyIdb} from './helpers/composer-custody-idb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createdAssetOriginalFile,prepareCreatedAssetPrimary} from '../src/receiz/created-asset-file';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {OpenIdentity} from '../src/receiz/native-identity';
// The compiled runtime and verifier are selected below under explicit synthetic
// roots. Both are the real unchanged Receiz implementations; no admission guard
// or cryptographic verdict is replaced by a permissive implementation.
const selected=vi.hoisted(()=>({runtime:null as any,verify:null as any}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>selected.runtime}));
vi.mock('@receiz/sdk/offline',()=>({verifyReceizOfflineSealedFile:(input:unknown)=>selected.verify(input)}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function pdf(){let text='%PDF-1.4\n';const offsets=[0],objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>'];for(let i=0;i<objects.length;i++){offsets.push(text.length);text+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=text.length;text+=`xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new TextEncoder().encode(text);}
function wav(){const b=new Uint8Array(46),v=new DataView(b.buffer),text=(at:number,value:string)=>b.set(new TextEncoder().encode(value),at);text(0,'RIFF');v.setUint32(4,38,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);text(36,'data');v.setUint32(40,2,true);b.set([128,128],44);return b;}
it('seals format-native primaries during creation once and saves their exact bytes without another seal',async()=>{
 vi.stubGlobal('indexedDB',composerCustodyIdb());
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 vi.stubGlobal('fetch',vi.fn(async()=>{throw Error('FILE_EXPORT_NETWORK_FORBIDDEN');}));
 const admitted=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(admitted)).artifactOwnerReceizId;
 const sealDocument=await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources});
 const sealer=r.offline.createReceizOfflineSealer({store:f.store,resources:f.resources,ownerIdentityAdmission:admitted});
 const seal=vi.fn((input:unknown)=>sealer.seal(input)),forbidden=vi.fn(async()=>{throw Error('DOWNLOAD_MUST_NOT_SEAL_OR_EXPORT');});
 const identity={binding:{artifactOwnerReceizId:owner},accountUsername:()=> 'artist',sealRecordExport:forbidden}as unknown as OpenIdentity;
 selected.runtime=r.connectedComposer;selected.verify=r.offline.verifyReceizOfflineSealedFile;
 const inputs=[{kind:'pdf',name:'original.pdf',mime:'application/pdf',bytes:pdf()},
  {kind:'image',name:'original.png',mime:'image/png',bytes:new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64'))},
  {kind:'image',name:'original.jpg',mime:'image/jpeg',bytes:new Uint8Array(readFileSync('public/receiz-bank-learn-share.jpg'))},
  {kind:'audio',name:'original.wav',mime:'audio/wav',bytes:wav()}];
 let captured:HeldDeposit|undefined,exported:File|undefined;
 for(const input of inputs){
  const draft={title:'Retained '+input.name,description:'Complete original source',kind:input.kind,longForm:'Its carried essay remains with the composer Original.',files:[{id:'primary',role:'primary',file:new File([input.bytes],input.name,{type:input.mime})}]};
  const count=seal.mock.calls.length,sealedDraft=await prepareCreatedAssetPrimary({draft:draft as any,seal,assertCurrent(){}});expect(seal).toHaveBeenCalledTimes(count+1);
  const prepared=await r.composer.prepareConnectedComposerSource({draft:sealedDraft,ownerReceizId:owner,sealDocument,assertCurrent(){}});
  const original={digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name}as HeldDeposit;
  const before=new Uint8Array(original.bytes);
  const file=await createdAssetOriginalFile(identity,original,()=>{});expect(file.name).toMatch(new RegExp('\\.'+input.name.split('.').at(-1)+'$'));expect(file.name).not.toMatch(/receizbundle$/);
  const sealed=new Uint8Array(await file.arrayBuffer()),verified=await r.offline.verifyReceizOfflineSealedFile({bytes:sealed,filename:file.name,mimeType:file.type});expect(verified.ok).toBe(true);
  const opened=await r.openPayload({fileBytes:sealed,filename:file.name,mime:file.type,signatureV4RootPublicKeys:new Map(f.roots.map((root:{kid:string})=>[root.kid,root]))});expect(opened.ok).toBe(true);expect(opened.payloadBytes).toEqual(input.bytes);
  const damaged=new Uint8Array(sealed);damaged[10]^=1;expect((await r.offline.verifyReceizOfflineSealedFile({bytes:damaged,filename:file.name,mimeType:file.type})).ok).toBe(false);
  selected.runtime=(await f.reloadRuntime()).connectedComposer;const reopened=await createdAssetOriginalFile(identity,original,()=>{});expect(new Uint8Array(await reopened.arrayBuffer())).toEqual(sealed);expect(seal).toHaveBeenCalledTimes(count+1);expect(original.bytes).toEqual(before);
  captured=original;exported=file;
 }
 expect(fetch).not.toHaveBeenCalled();expect(forbidden).not.toHaveBeenCalled();
 await expect(createdAssetOriginalFile({...identity,binding:{artifactOwnerReceizId:'another.receiz.id'}}as OpenIdentity,captured!,()=>{})).rejects.toThrow();
 const raw=inputs[0],old=await r.composer.prepareConnectedComposerSource({draft:{title:'Earlier raw PDF',description:'',kind:'pdf',longForm:'',files:[{id:'primary',role:'primary',file:new File([raw.bytes],raw.name,{type:raw.mime})}]},ownerReceizId:owner,sealDocument,assertCurrent(){}});
 const countBeforeOld=seal.mock.calls.length,oldBytes=new Uint8Array(await old.artifact.arrayBuffer()),oldSaved=await createdAssetOriginalFile(identity,{digest:old.reference.artifactSha256,bytes:oldBytes,filename:old.artifact.name}as HeldDeposit,()=>{});
 expect(new Uint8Array(await oldSaved.arrayBuffer())).toEqual(oldBytes);expect(seal).toHaveBeenCalledTimes(countBeforeOld);expect(forbidden).not.toHaveBeenCalled();
 const sealedPrimary=exported!,count=seal.mock.calls.length;
 const alreadyDraft={title:'Already sealed audio',description:'',kind:'audio',longForm:'',files:[{id:'primary',role:'primary',file:sealedPrimary}]};expect(await prepareCreatedAssetPrimary({draft:alreadyDraft as any,seal,assertCurrent(){}})).toBe(alreadyDraft);expect(seal).toHaveBeenCalledTimes(count);
 const prepared=await r.composer.prepareConnectedComposerSource({draft:{title:'Already sealed audio',description:'',kind:'audio',longForm:'',files:[{id:'primary',role:'primary',file:sealedPrimary}]},ownerReceizId:owner,sealDocument,assertCurrent(){}});
 const exact=await createdAssetOriginalFile(identity,{digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name}as HeldDeposit,()=>{});
 expect(new Uint8Array(await exact.arrayBuffer())).toEqual(new Uint8Array(await sealedPrimary.arrayBuffer()));expect(seal).toHaveBeenCalledTimes(count);
 const invalid=new Uint8Array(await sealedPrimary.arrayBuffer());invalid[10]^=1;
 const invalidDraft={...alreadyDraft,files:[{id:'primary',role:'primary',file:new File([invalid],sealedPrimary.name,{type:'audio/wav'})}]};await expect(prepareCreatedAssetPrimary({draft:invalidDraft as any,seal,assertCurrent(){}})).rejects.toThrow('ORIGINAL_FILE_PROOF_INVALID');
 const invalidSource=await r.composer.prepareConnectedComposerSource({draft:{title:'Changed sealed audio',description:'',kind:'audio',longForm:'',files:[{id:'primary',role:'primary',file:new File([invalid],sealedPrimary.name,{type:'audio/wav'})}]},ownerReceizId:owner,sealDocument,assertCurrent(){}});
 await expect(createdAssetOriginalFile(identity,{digest:invalidSource.reference.artifactSha256,bytes:new Uint8Array(await invalidSource.artifact.arrayBuffer()),filename:invalidSource.artifact.name}as HeldDeposit,()=>{})).rejects.toThrow('ORIGINAL_FILE_PROOF_INVALID');expect(seal).toHaveBeenCalledTimes(count);

},180000);
