import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import {receizCurrentPinnedSignatureV4Roots} from '../../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import {loadVaultNative,type VaultNativeRuntime} from './runtime';
import {vaultPublicChallenge,type VaultPublicPayload,type VaultPublicRecord} from './public-record';

export type VaultDisclosureHolding={kind:'money'|'asset'|'investment';id:string;title:string;quantityMicro?:string;amountUsdCents?:string;amountPhiMicro?:string;sourceHead:string;atKaiUPulse:string};
type Ports={native?():Promise<VaultNativeRuntime>};
const object=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('VAULT_PUBLIC_PROJECTION_INVALID');return value as Record<string,unknown>;};
const text=(v:unknown)=>{if(typeof v!=='string'||!v)throw Error('VAULT_PUBLIC_PROJECTION_INVALID');return v;};

/** Every displayed field comes from closed, independently admitted native
 * witnesses. The record is a disclosure at its original coordinate, with no
 * unlock/login/spending interface and no present-unspentness assertion. */
export async function inspectVaultDisclosure(value:unknown,expectedDigest?:string,ports:Ports={}){
 const native=await(ports.native??loadVaultNative)(),result=await native.verifyVaultPublicRecord(value,{roots:receizCurrentPinnedSignatureV4Roots()});
 if(expectedDigest!==undefined&&result.recordSha256!==expectedDigest)throw Error('VAULT_PUBLIC_LOCATOR_MISMATCH');
 return projectVaultDisclosure(result);
}
/** Presentation of an already native-admitted record; this function is not a
 * substitute for native source/signature verification. */
export function projectVaultDisclosure(result:Awaited<ReturnType<VaultNativeRuntime['verifyVaultPublicRecord']>>){
 const record=result.record as unknown as VaultPublicRecord,holdings:VaultDisclosureHolding[]=[];
 if(record.holdings.length!==result.witnesses.length)throw Error('VAULT_PUBLIC_PROJECTION_INVALID');
 for(let i=0;i<record.holdings.length;i++){
  const kind=record.holdings[i].kind,w=object(result.witnesses[i]);
  if(kind==='money'){
   if(!Array.isArray(w.notes))throw Error('VAULT_PUBLIC_PROJECTION_INVALID');
   for(const raw of w.notes){const note=object(raw);holdings.push({kind,id:text(note.noteId),title:note.rail==='reserve'?'Reserve note':note.rail==='settlement'?'Settlement note':'Settlement Reserve note',amountUsdCents:text(note.amountUsdCents),amountPhiMicro:text(note.amountPhiMicro),sourceHead:text(note.sourceSha256),atKaiUPulse:text(w.kaiUPulse)});}
   if(w.nativeMoney!==null){const m=object(w.nativeMoney);holdings.push({kind,id:'native:'+text(m.sourceSha256),title:'Money in custody',amountUsdCents:text(m.reserveUsdCents),amountPhiMicro:text(m.balancePhiMicro),sourceHead:text(m.sourceSha256),atKaiUPulse:text(w.kaiUPulse)});}
  }else if(kind==='asset'){
   const a=object(w.asset),definition=object(a.definition);
   holdings.push({kind,id:text(a.id),title:text(definition.name),quantityMicro:text(a.quantityMicro),sourceHead:text(a.headSourceSha256),atKaiUPulse:text(w.issuedAtKaiUPulse)});
  }else{
   if(!Array.isArray(w.holdings))throw Error('VAULT_PUBLIC_PROJECTION_INVALID');
   for(const raw of w.holdings){const p=object(raw);holdings.push({kind,id:text(w.lotId)+':'+text(p.positionId),title:text(p.title),quantityMicro:text(p.quantityMicro),sourceHead:text(w.sourceHeadSha256),atKaiUPulse:text(w.recordedAtKaiUPulse)});}
  }
 }
 return Object.freeze({record,recordSha256:result.recordSha256,vaultId:record.vaultId,name:record.name,ownerReceizId:result.custody.ownerReceizId,holdings,sealedAtKaiUPulse:record.kaiUPulse,grantsAccess:false as const,currentUnspentness:false as const});
}
export async function createVaultDisclosure(payload:VaultPublicPayload,sign:(challenge:string)=>Promise<ReceizIdentityLoginProof>,ports:Ports={}){
 const captured=structuredClone(payload),holderProof=await sign(await vaultPublicChallenge(captured));
 return inspectVaultDisclosure({...captured,holderProof},undefined,ports);
}
