import {insertPngTextChunks,readPngTextChunks} from '../../../native/receiz/app/utils/pngChunks';
import {drawVaultArtwork,vaultPublicUrl} from './artwork';
import {readVaultCarrier,type VaultCarrier} from './carrier';
import {vaultCanonical,vaultDigest} from './encoding';
import type {VaultPublicRecord} from './public-record';

const PRIVATE='receiz.bank.vault.private.v1',PUBLIC='receiz.bank.vault.public.v1',MAX=48*1024*1024;
const json=(value:unknown)=>new TextEncoder().encode(vaultCanonical(value));
type VerifiedPublic={record:VaultPublicRecord;recordSha256:string;vaultId:string;name:string;ownerReceizId:string;holdings:readonly unknown[];sealedAtKaiUPulse:string};
export type VaultImagePorts={render(svg:string):Promise<Uint8Array>;seal(input:{bytes:Uint8Array;filename:string;mimeType:'image/png'}):Promise<{artifactBytes:Uint8Array}>;verify(bytes:Uint8Array):Promise<boolean>};

/** This reader admits the standard outer seal and closed carrier only. It
 * deliberately grants no custody: callers must independently admit every
 * enclosed native source before displaying holdings or opening authority. */
export async function openVaultImage(input:Uint8Array,verify:(bytes:Uint8Array)=>Promise<boolean>):Promise<{kind:'private';value:VaultCarrier}|{kind:'public';value:unknown}>{
 const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>MAX)throw Error('VAULT_IMAGE_CAPACITY');
 if(!await verify(bytes))throw Error('VAULT_IMAGE_SEAL_INVALID');
 const chunks=readPngTextChunks(bytes,{maxCompressedBytes:MAX,maxTextBytes:MAX}).filter(v=>v.keyword===PRIVATE||v.keyword===PUBLIC);
 if(chunks.length!==1||new TextEncoder().encode(chunks[0].text).length>MAX)throw Error('VAULT_IMAGE_FORMAT_INVALID');
 const value=JSON.parse(chunks[0].text);
 return chunks[0].keyword===PRIVATE?{kind:'private',value:readVaultCarrier(value)}:{kind:'public',value};
}
async function seal(svg:string,keyword:string,value:unknown,filename:string,ports:VaultImagePorts){
 const captured=vaultCanonical(value),png=await ports.render(svg);
 const carried=insertPngTextChunks(png,[{keyword,text:captured}]);
 if(carried.length>MAX)throw Error('VAULT_IMAGE_CAPACITY');
 const result=await ports.seal({bytes:carried,filename,mimeType:'image/png'}),bytes=new Uint8Array(result.artifactBytes);
 const opened=await openVaultImage(bytes,ports.verify);
 if(opened.kind!==(keyword===PRIVATE?'private':'public')||vaultCanonical(opened.value)!==captured)throw Error('VAULT_IMAGE_SOURCE_CHANGED');
 return{bytes,filename,mimeType:'image/png' as const,digest:await vaultDigest(bytes),svg};
}
export async function exportVaultPrivateImage(value:VaultCarrier,details:{name:string;kaiUPulse:string;holdings:number},ports:VaultImagePorts){
 const carrier=readVaultCarrier(structuredClone(value)),id=carrier.header.id;
 const svg=drawVaultArtwork({vaultId:id,name:details.name,ownerReceizId:carrier.header.owner.receizId,sourceDigest:await vaultDigest(json(carrier)),kaiUPulse:details.kaiUPulse,kind:'private',protection:carrier.schema==='bank.vault.encrypted.v1'?'passkey':'image',publicUrl:vaultPublicUrl(id),holdings:details.holdings});
 return seal(svg,PRIVATE,carrier,`vault-${id}.private.png`,ports);
}
export async function exportVaultPublicImage(input:unknown,inspect:(value:unknown)=>Promise<VerifiedPublic>,ports:VaultImagePorts){
 const verified=await inspect(structuredClone(input));
 const svg=drawVaultArtwork({vaultId:verified.vaultId,name:verified.name,ownerReceizId:verified.ownerReceizId,sourceDigest:verified.recordSha256,kaiUPulse:verified.sealedAtKaiUPulse,kind:'public',publicUrl:vaultPublicUrl(verified.vaultId,verified.recordSha256),holdings:verified.holdings.length});
 const result=await seal(svg,PUBLIC,verified.record,`vault-${verified.vaultId}.public.png`,ports);
 const reopened=await openVaultImage(result.bytes,ports.verify);if(reopened.kind!=='public')throw Error('VAULT_IMAGE_SOURCE_CHANGED');
 const checked=await inspect(reopened.value);if(checked.recordSha256!==verified.recordSha256)throw Error('VAULT_IMAGE_SOURCE_CHANGED');
 return{...result,publicUrl:vaultPublicUrl(verified.vaultId,verified.recordSha256)};
}
export async function rasterizeVaultArtwork(svg:string):Promise<Uint8Array>{
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();image.decoding='async';
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(Error('VAULT_IMAGE_RENDER_FAILED'));image.src=url;});
  const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;
  const context=canvas.getContext('2d');if(!context)throw Error('VAULT_IMAGE_RENDER_FAILED');context.drawImage(image,0,0);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('VAULT_IMAGE_RENDER_FAILED')),'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
 }finally{URL.revokeObjectURL(url);}
}
