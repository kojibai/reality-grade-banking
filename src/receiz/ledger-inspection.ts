import {RECEIZ_VERSION} from './client';
import type {PublicRecord} from './public-network';
import type {LedgerValueDisplay} from './ledger-value';
import {readLedgerValueOperands} from './ledger-value';
import {safeReceizPublicUrl} from './public-market';
import {DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';

export type LedgerField = string | number | boolean | LedgerFields | LedgerField[];
export interface LedgerFields { [key:string]:LedgerField; }
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const primitive=(value:unknown):string|number|boolean|undefined=>typeof value==='string'&&value.length>0&&value.length<=4096?value:typeof value==='number'&&Number.isFinite(value)?value:typeof value==='boolean'?value:undefined;
function select(raw:unknown,keys:readonly string[]):LedgerFields {
 const result:LedgerFields={},source=object(raw);
 for(const key of keys){const value=primitive(source[key]);if(value!==undefined)result[key]=value;}
 return result;
}
function identity(raw:unknown):LedgerFields {
 const result=select(raw,['username','displayName','createdAt','kaiSignature','pulse','chakraDay']),source=object(raw);
 for(const key of ['userId','phiKey'])if(typeof source[key]==='string'&&/^[1-9A-HJ-NP-Za-km-z]{26,36}$/.test(source[key]))result[key]=source[key];
 return result;
}
/** Selected public evidence only. Never retain arbitrary metadata or custody payloads. */
export function readLedgerDetails(raw:unknown):LedgerFields {
 const source=object(raw),result=select(source,['sourceObservedAt','seq','actionScope','chakraDay','objectId','objectLabel','assetId','marketItemId','collectibleId','receizId','claimHash','noteId','sortKaiPulse','sortOrdinal','transactionLinkKind']);
 for(const key of ['actorUserId','subjectUserId'])if(typeof source[key]==='string'&&/^[1-9A-HJ-NP-Za-km-z]{26,36}$/.test(source[key]))result[key]=source[key];
 for(const key of ['actorKaiSignature','subjectKaiSignature','actorCreatedAt','subjectCreatedAt','actorPulse','subjectPulse','actorChakraDay','subjectChakraDay']){const value=primitive(source[key]);if(value!==undefined)result[key]=value;}
 for(const key of ['actor','subject','sender','recipient','fromActor','toActor','owner','previousOwner','newOwner','creator']){
  const value=identity(source[key]);if(Object.keys(value).length)result[key]=value;
 }
 const bundle=object(source.proofBundle),proof=select(bundle,['capsuleHash','bundleHash','claimHash','artifactDigest','verificationVersion','verifiedAtPulse']);
 const capsule=select(bundle.proofCapsule,['v','upulse','pulse','chakraDay','kaiKlok','kaiSignature','phiKey','verifierSlug']);
 if(Object.keys(capsule).length)proof.proofCapsule=capsule;
 if(Object.keys(proof).length)result.proofBundle=proof;
 const moment=select(source.receiz,['ts','slug','code','pulse','ms','anchorId']);if(Object.keys(moment).length)result.receiz=moment;
 const chart=select(source.marketAssetChart,['live','pv','premiumX','momentX','usdPerPhi','changePct','liveValueLabel','sourceValueLabel']);
 const points=object(source.marketAssetChart).chart;
 if(Array.isArray(points)&&points.length<=512&&points.every(point=>typeof point==='number'&&Number.isFinite(point)))chart.chart=points;
 if(Object.keys(chart).length)result.marketAssetChart=chart;
 const original=safeReceizPublicUrl(source.originalUrl,'original');if(original)result.originalUrl=original;
 const reading=safeReceizPublicUrl(source.readingUrl,'proof');if(reading){result.readingUrl=reading;if(typeof source.hasLongForm==='boolean')result.hasLongForm=source.hasLongForm;}
 return result;
}
export function readLedgerValuationTrace(raw:unknown):LedgerFields|null {
 const source=object(raw),result=select(source,['sdk','calculationKind','cardValueUsdCents','projectionDigest','projectionObservedAt','projectionPulse','valuationRow','source','sourceValueUsd','evaluationPulse','intrinsicFunction','quoteFunction','rounding']);
 if(source.sdk!==RECEIZ_VERSION||!Object.keys(result).length)return null;
 const seed=select(source.seed,['kind','claimPulse','beat','stepIndex','creatorVerified','chakraDay','kaiSignature','userPhiKey']);if(Object.keys(seed).length)result.seed=seed;
 const quote=select(source.quote,['referenceUsd','currentStreakDays','lifetimeUsdSoFar','plannedHoldBeats']);if(Object.keys(quote).length)result.quote=quote;
 // The display model is version-pinned, so a transported policy must exactly
 // match the public implementation before it is included in its trace.
 if(JSON.stringify(source.policy)===JSON.stringify(DEFAULT_ISSUANCE_POLICY))result.policy=JSON.parse(JSON.stringify(DEFAULT_ISSUANCE_POLICY)) as LedgerFields;
 return result;
}
export function ledgerInspectionDocument(record:PublicRecord,value:LedgerValueDisplay) {
 return {schema:'bankeiz.ledger-inspection.v1',authority:record.authority,id:record.sourceId,source:record.source,kind:record.kind,title:record.title,detail:record.detail,time:record.time,pulse:record.pulse,kaiUpulse:record.kaiUpulse,actor:record.actor,sender:record.sender??null,recipient:record.recipient??null,amountUsdCents:record.amountUsdCents,value,valueOperands:readLedgerValueOperands(record.valueOperands),evidence:record.evidence,details:readLedgerDetails(record.details),sourceUrl:record.sourceUrl};
}
