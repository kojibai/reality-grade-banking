import type {OrganizerEvent} from './organizer-types';
import type {OpenIdentity} from './native-identity';
import type {PublicRecord} from './public-network';
import {mergePublicRecords} from './public-network';
import {projectPersonalHistory} from './personal-history';
import {peekPrivateHistory} from './private-history-restore';
import {safeReceiptSourceUrl} from './ledger-receipts';
import {normalizeLocalPbiAuthorshipProof} from '../../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {isVerifiedAccountProof,type VerifiedAccountProof,type AccountStatement} from './account-proof';
import {walletPointTime} from './wallet-series';

export type CalendarSourceProof={kind:'original'|'ledger'|'account';moment:'seal'|'signature'|'movement';sourceId:string;url?:string;pbiReceiptHash?:string;accountSourceSha256?:string};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512):v is string=>typeof v==='string'&&!!v&&v.length<=max;
const date=(v:unknown):v is string=>text(v,64)&&Number.isFinite(Date.parse(v));
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
const uint=(v:unknown)=>typeof v==='string'&&/^(0|[1-9]\d{0,29})$/.test(v)?v:undefined;
function event(owner:string,id:string,title:string,kind:string,at:string,metadata:Record<string,unknown>,sourceProof:CalendarSourceProof):OrganizerEvent{
 return{id,ownerUserId:owner,createdByUserId:owner,title,kind,source:'system',startAt:at,endAt:new Date(Date.parse(at)+600000).toISOString(),createdAt:at,updatedAt:at,location:'',note:'',attendees:[],metadata,sourceProof};
}
/** Display only. The caller already holds this canonically admitted Original;
 * no flag, URL or Calendar record re-admits it or supplies financial authority. */
export function projectCalendarOriginal(owner:string,value:unknown):OrganizerEvent[]{
 const row=object(value),id=row.id,pulse=uint(row.pulse),url=safeReceiptSourceUrl(row.verifyUrl??row.verifyPath);
 if(!owner||!text(id,128)||!text(row.slug,64)||!text(row.code,64)||!pulse||!date(row.createdAt)||!url)return[];
 if(new URL(url).pathname.replace(/\/$/,'')!==`/v/${row.slug}/${row.code}/${pulse}`)return[];
 const source=object(row.importedSource),proof:CalendarSourceProof={kind:'original',moment:'seal',sourceId:id,url};
 const rows=[event(owner,`source:original:${id}:seal`,'Original sealed','sealed_file',row.createdAt,{actionKind:'receiz.record.insert',receizId:id,slug:row.slug,code:row.code,pulse,...(hash(object(source.reference).artifactSha256)?{artifactSha256:object(source.reference).artifactSha256}:{})},proof)];
 const pbi=row.hasPbiSignature===true?normalizeLocalPbiAuthorshipProof(row.pbiAuthorshipProof):null;
 if(pbi&&pbi.pbiReceiptHash===row.pbiReceiptHash&&date(pbi.verifiedAt)&&pbi.input.slug===row.slug&&pbi.input.code===row.code&&pbi.input.pulse===pulse&&pbi.input.claimHashHex===row.claimHashHex){
  const upulse=uint(pbi.input.proofObjectScope?.kaiUpulse);
  rows.push(event(owner,`source:original:${id}:pbi:${pbi.pbiReceiptHash}`,'Original signed','recorded_moment',pbi.verifiedAt,{actionKind:'receiz.authorship.pbi',receizId:id,pbiReceiptHash:pbi.pbiReceiptHash,...(upulse?{kaiUpulse:upulse,pulse:(BigInt(upulse)/1000000n).toString()}:{})},{...proof,moment:'signature',pbiReceiptHash:pbi.pbiReceiptHash}));
 }
 return rows;
}
export function projectCalendarPortableOriginals(owner:string,value:unknown):OrganizerEvent[]{
 const state=object(value);if(object(state.account).userId!==owner)return[];
 const view=object(state.profileView);if(object(view.profile).userId&&object(view.profile).userId!==owner)return[];
 return [view.originals,object(state.originalsManifest).originals,state.originals,object(state.showcase).originals].flatMap(rows=>Array.isArray(rows)?rows.flatMap(row=>projectCalendarOriginal(owner,row)):[]);
}
/** Already parsed same-account Ledger rows retain their exact IDs, amounts,
 * carried dates and Kai. A quote or Original valuation cannot create a row. */
export function projectCalendarFinancialRecords(owner:string,records:readonly PublicRecord[]):OrganizerEvent[]{
 return records.flatMap(record=>{
  if(record.authority!=='account-source-projection'||record.accountFlowConflict||!['wallet','actions'].includes(record.source)||!date(record.time)||record.amountUsdCents===null)return[];
  const ledgerKind=String(record.details?.ledgerEntryKind??record.kind),kind=/note_mint/.test(ledgerKind)?'receiz.wallet.note_mint':/note_claim/.test(ledgerKind)?'receiz.wallet.note_claim':/market_buy|share.buy/.test(ledgerKind)?'receiz.wallet.market_buy':/market_sell|share.sell/.test(ledgerKind)?'receiz.wallet.market_sell':/transfer|chat_transfer/.test(ledgerKind)?'receiz.wallet.transfer':record.kind;
  const metadata={actionKind:kind,ledgerEntryId:record.sourceId,amountUsdCents:record.amountUsdCents,...record.evidence,...(record.pulse?{pulse:record.pulse}:{}),...(record.kaiUpulse?{kaiUpulse:record.kaiUpulse}:{}),...(record.accountFlow==='out'?{senderUserId:owner}:record.accountFlow==='in'?{recipientUserId:owner}:{})};
  return[event(owner,`source:ledger:${record.id}`,record.title,'traction',record.time,metadata,{kind:'ledger',moment:'movement',sourceId:record.id})];
 });
}
/** Mechanical presentation of the held signed statement. Exact deltas remain
 * separate rails; today's quote cannot value a historical Phi movement. */
export function projectCalendarStatement(owner:string,statement:AccountStatement,sourceDigest:string,represented:readonly PublicRecord[]):OrganizerEvent[]{
 const known=represented.filter(row=>row.authority==='account-source-projection'&&!row.accountFlowConflict),ids=new Set(known.map(row=>row.sourceId.replace(/^wallet_ledger:/,''))),digests=new Set(known.map(row=>row.evidence.entryHash));
 return statement.transactions.flatMap(row=>{
  if(ids.has(row.transactionId)||digests.has(row.eventDigest)||row.reserveDeltaUsdCents==='0'&&row.settlementDeltaPhiMicro==='0'&&(!row.balanceDeltaPhiMicro||row.balanceDeltaPhiMicro==='0'))return[];
  const metadata={actionKind:`receiz.account.${row.kind}`,ledgerEntryId:row.transactionId,entryHash:row.eventDigest,kaiUpulse:row.kaiUPulse,pulse:(BigInt(row.kaiUPulse)/1000000n).toString(),reserveDeltaUsdCents:row.reserveDeltaUsdCents,settlementDeltaPhiMicro:row.settlementDeltaPhiMicro,...(row.balanceDeltaPhiMicro?{balanceDeltaPhiMicro:row.balanceDeltaPhiMicro}:{})};
  return[event(owner,`source:account:${row.transactionId}:${row.eventDigest}`,row.description,'traction',walletPointTime(row.kaiUPulse),metadata,{kind:'account',moment:'movement',sourceId:row.transactionId,accountSourceSha256:sourceDigest})];
 });
}
/** Keep already-admitted capabilities for the exact displayed snapshots. This
 * never reads storage, opens a Source, reparses history or refreshes a head. */
export function createCalendarStatementProjection(owner:{keyId:string;artifactOwnerReceizId:string}){
 const files=new Map<string,{uid:string;proof:WeakRef<VerifiedAccountProof>}>(),cache=new WeakMap<VerifiedAccountProof,{uid:string;represented:readonly PublicRecord[];events:OrganizerEvent[]}>();
 return{
  events(uid:string,proof:VerifiedAccountProof|null,represented:readonly PublicRecord[]){
   if(!proof||!isVerifiedAccountProof(proof)||proof.statement.account.keyId!==owner.keyId||proof.statement.account.receizId!==owner.artifactOwnerReceizId)return[];
   const old=cache.get(proof);if(old?.uid===uid&&old.represented===represented)return old.events;
   const events=projectCalendarStatement(uid,proof.statement,proof.sourceDigest,represented);files.set(proof.sourceDigest,{uid,proof:new WeakRef(proof)});cache.set(proof,{uid,represented,events});return events;
  },
  file(sourceDigest:string,uid:string){const held=files.get(sourceDigest);return held?.uid===uid?held.proof.deref()??null:null;},
 };
}
const id=(v:unknown)=>typeof v==='string'?v.replace(/^wallet_ledger:/,''):undefined;
function sameSource(a:OrganizerEvent,b:OrganizerEvent){
 if(a.ownerUserId!==b.ownerUserId||a.source!=='system'||b.source!=='system')return false;
 const left=a.sourceProof,right=b.sourceProof,held=left??right;if(!held)return false;
 if(left&&right&&(left.kind==='original'||right.kind==='original'||left.kind===right.kind))return left.kind===right.kind&&left.moment===right.moment&&left.sourceId===right.sourceId&&left.pbiReceiptHash===right.pbiReceiptHash;
 const legacy=left?b:a,m=legacy.metadata;
 if(held.kind==='original')return m.receizId===held.sourceId&&(held.moment==='signature'?m.pbiReceiptHash===held.pbiReceiptHash:typeof m.actionKind==='string'&&/^(receiz\.record\.insert|receiz\.seal(?:\.|$))/.test(m.actionKind));
 const derived=left?a:b,n=derived.metadata;
 if(m.amountUsdCents!==undefined&&n.amountUsdCents!==undefined&&m.amountUsdCents!==n.amountUsdCents)return false;
 return Boolean(hash(m.entryHash)&&m.entryHash===n.entryHash||text(m.ledgerEntryId)&&id(m.ledgerEntryId)===id(n.ledgerEntryId)||text(m.transferId)&&m.transferId===n.transferId&&String(m.actionKind).includes('transfer')&&String(n.actionKind).includes('transfer'));
}
/** Keep the stored Calendar record byte exact, including its allocated UUID
 * and proof-bound metadata. A source link is a separate display field. */
function sourceKeys(row:OrganizerEvent):string[]{
 const m=row.metadata,p=row.sourceProof,keys=[`id:${row.id}`];
 if(row.source==='system'){
  if(p?.kind==='original')keys.push(`original:${p.moment}:${p.sourceId}:${p.pbiReceiptHash??''}`);
  if(text(m.receizId)){if(typeof m.actionKind==='string'&&/^(receiz\.record\.insert|receiz\.seal(?:\.|$))/.test(m.actionKind))keys.push(`original:seal:${m.receizId}:`);if(hash(m.pbiReceiptHash))keys.push(`original:signature:${m.receizId}:${m.pbiReceiptHash}`);}
  if(hash(m.entryHash))keys.push(`entry:${m.entryHash}`);
  if(text(m.ledgerEntryId))keys.push(`ledger:${id(m.ledgerEntryId)}`);
  if(text(m.transferId)&&String(m.actionKind).includes('transfer'))keys.push(`transfer:${m.transferId}`);
 }
 return keys.map(key=>row.ownerUserId+'|'+key);
}
export function mergeCalendarSourceEvents(current:readonly OrganizerEvent[],incoming:readonly OrganizerEvent[]):OrganizerEvent[]{
 let changed=false;const rows=[...current],index=new Map<string,Set<number>>();
 const remember=(row:OrganizerEvent,i:number)=>{for(const key of sourceKeys(row)){let values=index.get(key);if(!values)index.set(key,values=new Set());values.add(i);}};
 rows.forEach(remember);
 for(const next of incoming){
  const candidates=new Set<number>();for(const key of sourceKeys(next))for(const i of index.get(key)??[])candidates.add(i);
  const position=[...candidates].find(i=>rows[i].id===next.id||sameSource(rows[i],next));
  if(position===undefined){rows.push(next);remember(next,rows.length-1);changed=true;continue;}
  const prior=rows[position],oldLegacy=!prior.id.startsWith('source:'),newLegacy=!next.id.startsWith('source:');
  const chosen=oldLegacy!==newLegacy?(oldLegacy?prior:next):(Date.parse(next.updatedAt)>=Date.parse(prior.updatedAt)?next:prior),proof=next.sourceProof??prior.sourceProof;
  const merged=proof&&JSON.stringify(chosen.sourceProof)!==JSON.stringify(proof)?{...chosen,sourceProof:proof}:chosen;
  if(merged!==prior&&JSON.stringify(merged)!==JSON.stringify(prior)){rows[position]=merged;remember(merged,position);changed=true;}
 }
 return changed?rows:current as OrganizerEvent[];
}
export const isCalendarSourceEvent=(event:OrganizerEvent)=>event.id.startsWith('source:')&&Boolean(event.sourceProof);
export function calendarSourceProofUrl(event:OrganizerEvent){return event.sourceProof?.kind==='original'?safeReceiptSourceUrl(event.sourceProof.url):null;}

// Memoize this derived presentation by held references, never by a clock or a
// claimed latest head. No entry supplies admission, ownership or spend authority.
const projected=new WeakMap<OpenIdentity,{uid:string;projection:unknown;privateRows:unknown;records:PublicRecord[]}>();
export function heldCalendarRecords(identity:OpenIdentity,uid:string):PublicRecord[]{
 const projection=identity.localHistory,privateRows=peekPrivateHistory(identity,uid)?.records,old=projected.get(identity);
 if(old?.uid===uid&&old.projection===projection&&old.privateRows===privateRows)return old.records;
 const state=object(projection?.verifiedState),bound=projection?.portableStateVerified===true&&projection.authority==='verified-identity-portable-state'&&projection.keyId===identity.binding?.keyId&&projection.owner?.uid===identity.binding?.identityOwnerReceizId&&object(state.account).userId===uid;
 const records=mergePublicRecords(bound?projectPersonalHistory(projection,uid).records:[],privateRows??[]);
 projected.set(identity,{uid,projection,privateRows,records});return records;
}
