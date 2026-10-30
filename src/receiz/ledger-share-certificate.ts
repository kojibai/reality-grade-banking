import type {PublicRecord} from './public-network';
export interface LedgerShareCertificate {noteToken:string;shareQuantityMicro:string;noteId?:string;positionId?:string;marketItemId?:string;assetId?:string;title?:string}
export const isCertificateMovement=(kind:string)=>/^market\.share\.(export|import)$/.test(kind);
/** Selected source facts only. A certificate link is not deposit authority. */
export function readLedgerShareCertificate(input:unknown):LedgerShareCertificate|null{
 if(!input||typeof input!=='object'||Array.isArray(input))return null;const v=input as Record<string,unknown>,quantity=typeof v.shareQuantityMicro==='number'&&Number.isSafeInteger(v.shareQuantityMicro)?String(v.shareQuantityMicro):v.shareQuantityMicro;
 if(typeof v.noteToken!=='string'||! /^[A-Za-z0-9._:-]{16,200}$/.test(v.noteToken)||typeof quantity!=='string'||! /^[1-9]\d{0,39}$/.test(quantity))return null;
 const result:LedgerShareCertificate={noteToken:v.noteToken,shareQuantityMicro:quantity};for(const key of ['noteId','positionId','marketItemId','assetId','title']as const){const text=v[key];if(typeof text==='string'&&text&&text.length<=512&&!/[\x00-\x1f\x7f]/.test(text))result[key]=text;}return result;
}
export function ledgerShareCertificate(record:PublicRecord){
 if(!isCertificateMovement(record.kind))return null;const facts=readLedgerShareCertificate(record.details?.certificate);
 if(!facts||facts.marketItemId&&record.valueOperands?.marketItemId&&facts.marketItemId!==record.valueOperands.marketItemId||facts.assetId&&record.valueOperands?.assetId&&facts.assetId!==record.valueOperands.assetId)return null;return facts;
}
export function certificateShareValue(cents:string,quantity:string){return String(BigInt(cents)*BigInt(quantity)/1000000n);}

/** A retained certificate reference can connect its existing export/deposit
 * projections in the same ledger window. Missing or conflicting references
 * never receive invented asset identity or quantity. */
export function enrichLedgerCertificateReferences(records:PublicRecord[]):PublicRecord[]{
 const models=new Map<string,NonNullable<NonNullable<PublicRecord['valueOperands']>['proofValuation']>|null>();
 for(const record of records){const proof=record.source==='proofs'?record.valueOperands?.proofValuation:null;if(!proof||record.sourceId!==proof.marketItemId)continue;const prior=models.get(proof.marketItemId);models.set(proof.marketItemId,prior===null||prior&&JSON.stringify(prior)!==JSON.stringify(proof)?null:proof);}
 const bindings=new Map<string,LedgerShareCertificate|null>();
 for(const record of records){const facts=ledgerShareCertificate(record);if(!facts?.marketItemId)continue;const held=bindings.get(facts.noteToken);bindings.set(facts.noteToken,held===null||held&&(held.marketItemId!==facts.marketItemId||held.assetId&&facts.assetId&&held.assetId!==facts.assetId)?null:facts);}
 return records.map(record=>{
  const facts=ledgerShareCertificate(record),binding=facts&&bindings.get(facts.noteToken);if(!facts)return record;
  const certificate=!facts.marketItemId&&binding?.marketItemId&&(!facts.assetId||!binding.assetId||facts.assetId===binding.assetId)?{...facts,marketItemId:binding.marketItemId,...(binding.assetId?{assetId:binding.assetId}:{})}:facts;
  const proof=certificate.marketItemId?models.get(certificate.marketItemId):null,carried=!record.valueOperands?.proofValuation&&proof&&(!certificate.assetId||proof.assetId===certificate.assetId)?proof:null;
  if(certificate===facts&&!carried)return record;
  return{...record,details:{...record.details,certificate:{...certificate}},valueOperands:{...record.valueOperands,...(certificate.marketItemId?{marketItemId:certificate.marketItemId}:{}),...(certificate.assetId?{assetId:certificate.assetId}:{}),...(carried?{proofValuation:carried}:{})}};
 });
}
