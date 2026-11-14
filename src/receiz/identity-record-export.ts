import type {ReceizKeyFile,ReceizIdentityPublicBinding} from '@receiz/sdk';
import {loadReceiz} from './client';
import {artwork} from './identity-artwork-runtime.mjs';
import {readReceizAccountStateHead as artworkHead} from '../../native/receiz/app/lib/auth/receizAccountStateHead';
import {insertPngTextChunks} from '../../native/receiz/app/utils/pngChunks';
import {resolveProfileIdentityCreationKaiMicroPulse} from '../../native/receiz/app/lib/profile/profileIdentityCreationCoordinate';
import {rasterizeArtwork,type Stamp} from './identity-image';

export type IdentityRecordBackup={bytes:Uint8Array;filename:string;phrase:string};
type Input={source:IdentityRecordBackup;keyFile:ReceizKeyFile;binding:ReceizIdentityPublicBinding;accountUid:string|null;username:string|null;heldProfile?:unknown;
 assertCurrent():void;seal(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<{artifactBytes:Uint8Array;filename:string}>;
 readProfile?:(username:string)=>Promise<unknown>;rasterize?:(svg:string,stamp:Stamp)=>Promise<Uint8Array>};
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const png=(bytes:Uint8Array)=>[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
const username=(value:unknown):value is string=>typeof value==='string'&&/^(?:[a-z0-9_]{3,24}|receiz_[a-z0-9]{18})$/.test(value);

/** Public artwork operands only. These fields never alter the canonical key,
 * its signed portable snapshot, its native owner or its selected account. */
function presentation(value:unknown,uid:string){
 const p=object(value),createdAt=typeof p.createdAt==='string'?p.createdAt:null;
 if(p.userId!==uid||!username(p.username)||!createdAt||!Number.isFinite(Date.parse(createdAt)))return null;
 const creationKaiMicroPulse=resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:createdAt,persistedMicroPulse:typeof p.creationKaiMicroPulse==='string'?p.creationKaiMicroPulse:null,persistedSource:typeof p.creationKaiSource==='string'?p.creationKaiSource:null});
 if(!creationKaiMicroPulse)return null;
 const hash=p.authorshipPbiReceiptHash??p.pbiReceiptHash;
 return{userId:uid,createdAt,creationKaiMicroPulse,receizId:p.username,
  pbiReceiptHash:p.authorshipVerified===true&&typeof hash==='string'&&/^[a-f0-9]{64}$/i.test(hash)?hash:null,
  pbiSignedAt:typeof p.authorshipPbiSignedAt==='string'?p.authorshipPbiSignedAt:null,pbiSignedKaiMicroPulse:typeof p.authorshipPbiSignedKaiMicroPulse==='string'?p.authorshipPbiSignedKaiMicroPulse:null};
}
async function readProfile(name:string):Promise<unknown>{
 const response=await fetch(`/api/bank/public-profile/${name}?view=head`,{credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10_000)});
 if(!response.ok)throw Error('IDENTITY_RECORD_PRESENTATION_REQUIRED');
 return response.json();
}

/** Explicit download only. The already-admitted carrier remains active custody.
 * Repack the exact same key into a new canonical PNG; never issue a new ID. */
export async function exportIdentityRecord(input:Input):Promise<IdentityRecordBackup>{
 input.assertCurrent();const {source,keyFile,binding,accountUid}=input;
 if(keyFile.keyId!==binding.keyId||keyFile.alg!==binding.alg||keyFile.crypto.publicKeyRawB64u!==binding.publicKeyRawB64u)throw Error('IDENTITY_RECORD_OWNER_MISMATCH');
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(source.bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');input.assertCurrent();
 if(digest!==binding.artifactSha256)throw Error('IDENTITY_RECORD_SOURCE_MISMATCH');
 if(png(source.bytes))return{bytes:new Uint8Array(source.bytes),filename:source.filename,phrase:source.phrase};
 if(!accountUid)throw Error('IDENTITY_RECORD_ACCOUNT_MISMATCH');
 const sdk=await loadReceiz();input.assertCurrent();
 const original=sdk.serializeReceizIdentityArtifact(keyFile),projection=await sdk.projectReceizIdentityAccount(keyFile);input.assertCurrent();
 if(!projection.portableStateVerified||projection.authority!=='verified-identity-portable-state'||object(object(projection.verifiedState).account).userId!==accountUid)throw Error('IDENTITY_RECORD_ACCOUNT_MISMATCH');
 let args=presentation(input.heldProfile,accountUid);
 if(!args){
  if(!username(input.username))throw Error('IDENTITY_RECORD_PRESENTATION_REQUIRED');
  const observed=await(input.readProfile??readProfile)(input.username);input.assertCurrent();
  if(object(observed).isPrivate===true)throw Error('IDENTITY_RECORD_PRESENTATION_REQUIRED');
  args=presentation(observed,accountUid);
 }
 if(!args)throw Error('IDENTITY_RECORD_PRESENTATION_REQUIRED');
 // Exactly the existing default profile header arguments: no device key seed,
 // custom-image replacement, new birthday or invented PBI attestation.
 const art=artwork(args),kai=sdk.receizKaiNow(),savedAt=new Date().toISOString(),head=artworkHead(keyFile.portableState?.snapshot);
 const stamp={creationKaiPulse:String(BigInt(args.creationKaiMicroPulse)/1000000n),accountHeadKaiPulse:head.kaiPulse,savedKaiPulse:String(kai.pulse)};
 const image=await(input.rasterize??rasterizeArtwork)(art.bannerSvg,stamp);input.assertCurrent();
 const bytes=insertPngTextChunks(image,[
  {keyword:'receiz.identity_record.v1',text:JSON.stringify({schema:'receiz.identity_record.v1',kind:'identity-record',keyId:keyFile.keyId,ownerUid:keyFile.owner.uid,receizId:args.receizId,pulse:art.pulse,seedHash:art.seedHash,issuedAt:keyFile.issuedAt,embeddedAt:savedAt,kaiStamp:{schema:'receiz.identity_record.kai_stamp.v1',...stamp,accountHeadKaiUpulse:head.kaiUpulse,savedAt}})},
  {keyword:'receiz.identity_record.keyfile.v1',text:original},
 ]);
 const sealed=await input.seal({bytes,filename:`identity_record_${args.receizId}.png`,mimeType:'image/png'});input.assertCurrent();
 if(!png(sealed.artifactBytes)||!sealed.filename.endsWith('.png'))throw Error('IDENTITY_RECORD_PNG_REQUIRED');
 const verification=await sdk.verifyReceizArtifact(sealed.artifactBytes);input.assertCurrent();
 if(verification.status!=='verified-artifact')throw Error('IDENTITY_RECORD_SEAL_INVALID');
 const admission=await sdk.createReceizArtifactAdmissionEngine()(verification,{profile:'identity',identityPassphrase:source.phrase});input.assertCurrent();
 if(admission.verdict!=='canonical-identity')throw Error('IDENTITY_RECORD_SEAL_INVALID');
 // SDK's binding reader requires its genuine same-runtime issued admission.
 const next=await sdk.readReceizIdentityPublicBinding(admission),restored=await sdk.readReceizIdentityArtifact(sealed.artifactBytes);input.assertCurrent();
 if(next.keyId!==binding.keyId||next.alg!==binding.alg||next.publicKeyRawB64u!==binding.publicKeyRawB64u||next.artifactOwnerReceizId!==binding.artifactOwnerReceizId||next.identityOwnerReceizId!==binding.identityOwnerReceizId||sdk.serializeReceizIdentityArtifact(restored)!==original||sdk.serializeReceizIdentityArtifact(keyFile)!==original)throw Error('IDENTITY_RECORD_OWNER_MISMATCH');
 const carried=admission.recoveredState as unknown as import('@receiz/sdk').ReceizIdentityAccountProjection;
 if(!carried?.portableStateVerified||carried.completeAtSealedHead!==projection.completeAtSealedHead||carried.authority!=='verified-identity-portable-state'||object(object(carried.verifiedState).account).userId!==accountUid)throw Error('IDENTITY_RECORD_ACCOUNT_MISMATCH');
 return{bytes:new Uint8Array(sealed.artifactBytes),filename:sealed.filename,phrase:source.phrase};
}
