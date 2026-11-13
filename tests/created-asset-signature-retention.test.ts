import {afterEach,expect,it,vi} from 'vitest';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {IDBFactory,IDBKeyRange} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createdAssetOriginalFile} from '../src/receiz/created-asset-file';
import {createLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';

// The fixture provides explicit synthetic trust roots. Every seal, canonical
// read, source binding, WebAuthn signature and PBI receipt check remains real.
const selected=vi.hoisted(()=>({runtime:null as any,verify:null as any}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>selected.runtime}));
vi.mock('@receiz/sdk/offline',()=>({verifyReceizOfflineSealedFile:(input:unknown)=>selected.verify(input)}));
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const encode=(bytes:ArrayBuffer|Uint8Array)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');

function pdf(){let text='%PDF-1.4\n';const offsets=[0],objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>'];for(let i=0;i<objects.length;i++){offsets.push(text.length);text+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=text.length;text+=`xref\n0 4\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new TextEncoder().encode(text);}
function wav(){const b=new Uint8Array(46),v=new DataView(b.buffer),text=(at:number,value:string)=>b.set(new TextEncoder().encode(value),at);text(0,'RIFF');v.setUint32(4,38,true);text(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);text(36,'data');v.setUint32(40,2,true);b.set([128,128],44);return b;}

const examples=[
 {kind:'image',name:'original.png',mime:'image/png',bytes:new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64'))},
 {kind:'pdf',name:'original.pdf',mime:'application/pdf',bytes:pdf()},
 {kind:'image',name:'original.jpg',mime:'image/jpeg',bytes:new Uint8Array(readFileSync('public/receiz-bank-learn-share.jpg'))},
 {kind:'audio',name:'original.wav',mime:'audio/wav',bytes:wav()},
 {kind:'file',name:'original.json',mime:'application/json',bytes:new TextEncoder().encode('{"work":"An exact retained record"}')},
 {kind:'image',name:'original.svg',mime:'image/svg+xml',bytes:new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20"><rect width="30" height="20" fill="blue"/></svg>')}
];
it.each(examples)('$name retains the actual asset signature in the downloaded proof, without signing, resealing or network work at Save',async example=>{
 vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('IDBKeyRange',IDBKeyRange);
 const values=new Map<string,string>(),events=new EventTarget();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size;}};
 vi.stubGlobal('window',{localStorage:storage,sessionStorage:storage,location:{origin:'https://bankeiz.com',pathname:'/',href:'https://bankeiz.com/'},setTimeout,clearTimeout,dispatchEvent:events.dispatchEvent.bind(events),addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 vi.stubGlobal('document',{visibilityState:'visible',addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)});
 const f=await conformanceOfflineFixture({composer:true}),r=f.runtime;
 const network=vi.fn(async()=>{throw Error('SIGNED_ORIGINAL_DOWNLOAD_NETWORK_FORBIDDEN');});vi.stubGlobal('fetch',network);
 const admission=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(new File([new Uint8Array(f.identity.bytes)],'identity.png')),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(admission)).artifactOwnerReceizId;
 const sealer=r.offline.createReceizOfflineSealer({store:f.store,resources:f.resources,ownerIdentityAdmission:admission});
 const sealDocument=vi.fn(await r.createBankNativeNoteSealer({enrollment:await f.store.load(),resources:f.resources}));
 const native=await sealer.seal({bytes:example.bytes,filename:example.name,mimeType:example.mime});
 const primary=new File([new Uint8Array(native.artifactBytes)],native.filename,{type:example.mime}),custody=r.createImportedProofSourceCustody();
 const prepared=await r.composer.prepareConnectedComposerSource({draft:{title:'The work and its witness',description:'The exact work, together with its existing authorship.',kind:example.kind,longForm:'',files:[{id:'primary',role:'primary',file:primary}]},ownerReceizId:owner,sealDocument,writeBlock:custody.writeBlock,assertCurrent(){}});
 selected.runtime=r.connectedComposer;selected.verify=r.offline.verifyReceizOfflineSealedFile;
 const opened=await r.connectedComposer.admitConnectedComposerSource({file:prepared.artifact,ownerReceizId:owner,username:'creator',assertCurrent(){}});
 const input=await r.sourceAuthorship.importedSourceAuthorshipInput(opened.source,owner,'');
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(await crypto.subtle.exportKey('spki',keys.publicKey)).toString('base64')}\n-----END PUBLIC KEY-----`};
 const proof=await createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false}));
  const bytes=new Uint8Array(69);bytes.set(auth);bytes.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,bytes))};
 },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 const signed=await r.sourceAuthorship.projectPbiSignedImportedSourceOriginal(opened.source,opened.reference,proof);
 expect(signed.hasPbiSignature).toBe(true);expect(signed.pbiReceiptHash).toBe(proof.pbiReceiptHash);
 // Use the actual publisher's local signature retention. Failed optional
 // delivery cannot erase this accepted proof or become a Save prerequisite.
 let retainedSignedFile:Promise<File>|undefined;
 const publisher=await r.connectedComposer.createConnectedAssetPublicationRuntime({onLocalAdmission:(admission:any)=>{if(admission.authoredFile)retainedSignedFile=admission.authoredFile;},identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid:'11111111-1111-4111-8111-111111111111',username:'creator'},assertCurrent(){},fetchImpl:network,sealDocument});
 await expect(publisher.publish(prepared.artifact,async()=>proof)).rejects.toThrow();
 expect(await publisher.readSignedSource(prepared.artifact)).toEqual({pbiReceiptHash:proof.pbiReceiptHash});
 expect(await retainedSignedFile).toBeInstanceOf(File);
 network.mockClear();
 const sourceCount=sealDocument.mock.calls.length;
 const downloaded=await createdAssetOriginalFile({username:'creator',accountUsername:()=> 'creator',binding:{artifactOwnerReceizId:owner}} as OpenIdentity,{digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name,pbiSigned:true} as HeldDeposit,()=>{});
 const bytes=new Uint8Array(await downloaded.arrayBuffer());
 expect(bytes).toEqual(new Uint8Array(await (await retainedSignedFile!).arrayBuffer()));
 const verified=await r.offline.verifyReceizOfflineSealedFile({bytes,filename:downloaded.name,mimeType:downloaded.type});
 expect(verified.errors).toEqual([]);expect(verified.ok).toBe(true);
 const canonical=await r.verifyReceizArtifact(new File([bytes],downloaded.name,{type:downloaded.type}));
 expect(canonical.status).toBe('verified-artifact');
 expect(canonical.verification.carriedAuthorship.pbiReceiptHash).toBe(proof.pbiReceiptHash);
 expect(sealDocument).toHaveBeenCalledTimes(sourceCount);expect(network).not.toHaveBeenCalled();
 expect(proof.input.claimHashHex).toBe(opened.source.verification.bundle.artifactSha256Basis);
 expect(proof.input.claimHashHex).toBe(verified.bundle?.artifactSha256Basis);
 // Diagnostic output is confined to temporary fixture custody. These are
 // synthetic test identities and roots, never a production verification claim.
 const retainedStorage=[...values];values.clear(); // A completed queue is not Original custody.
 const cold=await f.reloadRuntime();selected.runtime=cold.connectedComposer;selected.verify=cold.offline.verifyReceizOfflineSealedFile;
 const reopened=await createdAssetOriginalFile({username:'creator',accountUsername:()=> 'creator',binding:{artifactOwnerReceizId:owner}} as OpenIdentity,{digest:prepared.reference.artifactSha256,bytes:new Uint8Array(await prepared.artifact.arrayBuffer()),filename:prepared.artifact.name,pbiSigned:true} as HeldDeposit,()=>{});
 expect(new Uint8Array(await reopened.arrayBuffer())).toEqual(bytes);expect(network).not.toHaveBeenCalled();expect(sealDocument).toHaveBeenCalledTimes(sourceCount);
 const carried=r.carriedFileAuthorship.readCarriedFileAuthorship(bytes)!;expect(carried.original).toEqual(new Uint8Array(await primary.arrayBuffer()));
 const changed=carried.original.slice();changed[Math.floor(changed.length/2)]^=1;
 let altered:Uint8Array|undefined;try{altered=r.carriedFileAuthorship.appendCarriedFileAuthorship({...carried,original:changed});}catch(error){expect(error).toBeInstanceOf(Error);}
 if(altered)expect((await r.offline.verifyReceizOfflineSealedFile({bytes:altered,filename:downloaded.name,mimeType:downloaded.type})).ok).toBe(false);
 const invalidProof={...proof,pbiReceiptHash:'a'.repeat(64)},invalid=r.carriedFileAuthorship.appendCarriedFileAuthorship({...carried,proof:invalidProof});
 expect((await r.offline.verifyReceizOfflineSealedFile({bytes:invalid,filename:downloaded.name,mimeType:downloaded.type})).ok).toBe(false);
 const directory=process.env.BANK_SIGNED_ORIGINAL_EVIDENCE;
 if(directory){
 await mkdir(directory,{recursive:true});
 await writeFile(`${directory}/${example.name}.roots.json`,JSON.stringify(f.roots));
 await writeFile(`${directory}/downloaded-${example.name}`,bytes);
 await writeFile(`${directory}/${example.name}.binding.json`,JSON.stringify({fixtureOnly:true,canonicalSourceVerified:verified.ok,sourcePbiVerified:signed.hasPbiSignature,receiptHash:proof.pbiReceiptHash,signedSourceBasis:proof.input.claimHashHex,downloadedFileBasis:verified.bundle?.artifactSha256Basis,downloadedPbiHistory:verified.bundle?.pbiAuthorshipHistory??[],networkCallsDuringSave:network.mock.calls.length,newSealsDuringSave:sealDocument.mock.calls.length-sourceCount},null,2));
 const blocks:unknown[]=[];await custody.exportBlocks(prepared.reference,async(reference:any,body:Uint8Array)=>{blocks.push({reference,bytes:Buffer.from(body).toString('base64')});});
 await writeFile(`${directory}/${example.name}.save-context.json`,JSON.stringify({source:Buffer.from(await prepared.artifact.arrayBuffer()).toString('base64'),filename:prepared.artifact.name,digest:prepared.reference.artifactSha256,owner,receiptHash:proof.pbiReceiptHash,blocks,storage:retainedStorage}));
 }
 // Both the exact signed Source and its native-file commitment survive Save.
 expect(verified.carriedAuthorship).toEqual({state:'verified',scope:'enclosing-source',pbiReceiptHash:proof.pbiReceiptHash,sourceArtifactSha256:prepared.reference.artifactSha256,originalArtifactSha256:prepared.content.files[0]!.sha256});
},120000);
