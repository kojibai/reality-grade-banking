import {openVaultCarrier,readVaultCarrier} from './carrier';
import {readVaultPrivateSource} from './source';
import {admitVaultPrivateSourceForBank,type VaultPrivateAdmissionOptions} from './admit';
import {inspectVaultDisclosure} from './disclose';
import {openVaultImage} from './export';
import {vaultBytes,vaultDigest} from './encoding';
import {readVaultNoteSource,admitVaultNoteSource,type VaultNoteSourcePorts} from './note-source';
type Ports={verifyOuter(bytes:Uint8Array):Promise<boolean>;privateOptions?:VaultPrivateAdmissionOptions;public?:typeof inspectVaultDisclosure;private?:typeof admitVaultPrivateSourceForBank;notes?:VaultNoteSourcePorts};
export type VaultRecoveredSource={kind:'note'|'owned-original';filename:string;sha256:string;bytes:Uint8Array};
/** Read-only inspection. No signer enrollment, account grant or financial
 * execution capability exists here. Never return a private carrier or key. */
async function inspectOriginal(input:Uint8Array,ports:Ports,recover?:(sources:VaultRecoveredSource[])=>void){
 const bytes=new Uint8Array(input);if(!bytes.length||bytes.length>48*1024*1024)throw Error('VAULT_IMAGE_CAPACITY');
 const artifactSha256=await vaultDigest(bytes),png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const opened=png?await openVaultImage(bytes,ports.verifyOuter):{kind:'public' as const,value:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
 if(opened.kind==='public'){
  const checked=await(ports.public??inspectVaultDisclosure)(opened.value);
  return{kind:'public' as const,verified:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const,record:checked};
 }
 const carrier=readVaultCarrier(opened.value);
 if(carrier.header.purpose!=='vault-private')throw Error('VAULT_PURPOSE_INVALID');
 if(carrier.schema==='bank.vault.encrypted.v1')return{kind:'protected-private' as const,verified:false as const,outerVerified:true as const,contentsVerified:false as const,passkeyRequired:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const};
 if(opened.kind==='note-private'){
  if(!ports.notes)throw Error('VAULT_NOTE_READER_REQUIRED');
  const source=await readVaultNoteSource(await openVaultCarrier(carrier));
  if(source.id!==carrier.header.id||source.owner.keyId!==carrier.header.owner.keyId||source.owner.receizId!==carrier.header.owner.receizId)throw Error('VAULT_OWNER_MISMATCH');
  const admitted=await admitVaultNoteSource(source,ports.notes);
  // Inspection reports the existing carried records, never the private Note
  // keys, source bytes, live account balance or a new spending capability.
  const record={schema:'bank.vault.note-inspection.v1' as const,vaultId:source.id,name:source.name,ownerReceizId:source.owner.receizId,
   notes:admitted.notes.map(note=>({noteId:note.noteId,digest:note.digest,filename:note.filename,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,...(note.rail?{rail:note.rail}:{})})),
   originals:admitted.originals.map(original=>({digest:original.digest,filename:original.filename,title:original.title,size:original.size})),
   recordedNoteValueUsdCents:admitted.notes.reduce((sum,note)=>sum+BigInt(note.amountUsdCents),0n).toString()};
  // Exact source recovery is explicit and separate from the safe inspection
  // output. Never place private bytes or Note authority in diagnostics or JSON.
  recover?.([...source.notes.map(note=>({kind:'note' as const,filename:note.filename,sha256:note.sha256,bytes:vaultBytes(note.bytesB64u,32*1024*1024)})),...source.originals.sources.map(original=>({kind:'owned-original' as const,filename:original.filename,sha256:original.sha256,bytes:vaultBytes(original.bytesB64u,32*1024*1024)}))]);
  return{kind:'note-private' as const,verified:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const,privateOriginalGrantsAccess:true as const,record};
 }
 const source=await readVaultPrivateSource(await openVaultCarrier(carrier));
 if(source.vaultId!==carrier.header.id||source.owner.keyId!==carrier.header.owner.keyId||source.owner.receizId!==carrier.header.owner.receizId)throw Error('VAULT_CUSTODY_MISMATCH');
 const record=await(ports.private??admitVaultPrivateSourceForBank)(source,ports.privateOptions);
 return{kind:'private' as const,verified:true as const,artifactSha256,grantsAccess:false as const,currentUnspentness:false as const,privateOriginalGrantsAccess:true as const,record};
}
export const inspectVaultOriginal=(input:Uint8Array,ports:Ports)=>inspectOriginal(input,ports);
/** Local file opening for an explicit private reader. The returned sources
 * must remain private; render only inspection in machine-readable output. */
export async function openVaultOriginalSources(input:Uint8Array,ports:Ports){
 let sources:VaultRecoveredSource[]|undefined;
 const inspection=await inspectOriginal(input,ports,value=>{sources=value;});
 return{inspection,...(sources?{sources}:{})};
}
/** Explicit private-file recovery. Runs the same canonical admission once,
 * returns only the exact carried sources and performs no financial action. */
export async function recoverVaultOriginalSources(input:Uint8Array,ports:Ports){
 const {inspection,sources}=await openVaultOriginalSources(input,ports);
 if(inspection.kind!=='note-private'||!sources)throw Error(inspection.kind==='protected-private'?'VAULT_PRESENCE_REQUIRED':'VAULT_NOTE_RECOVERY_REQUIRED');
 return{inspection,sources};
}
