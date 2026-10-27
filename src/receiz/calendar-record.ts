import type {OrganizerEvent} from './organizer-types';
import type {PublicRecord} from './public-network';
import {readLedgerDetails} from './ledger-inspection';
import {readLedgerValueOperands} from './ledger-value';
import {calendarEventTitle} from './calendar-labels';
export {calendarEventTitle} from './calendar-labels';
const uint=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):typeof v==='string'&&/^(0|[1-9]\d{0,39})$/.test(v)?v:null;
const text=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=512?v:null;
/** Selected-record projection only. Exact retained originals stay by reference;
 * titles, approximate time and matching amounts never identify a transaction. */
export function calendarRecord(event:OrganizerEvent,owner:string,held:readonly PublicRecord[]):PublicRecord|null{
 if(event.ownerUserId!==owner||event.source!=='system')return null;
 const m=event.metadata,kind=text(m.actionKind);if(!kind||!(/^(?:market\.share\.(?:buy|sell)|market_(?:buy|sell)|wallet\.transfer\.connect|receiz\.wallet\.(?:transfer|note_mint|note_claim|market_buy|market_sell))$/.test(kind)))return null;
 const amount=uint(m.settlementUsdCents??m.amountUsdCents),entryId=text(m.ledgerEntryId),hash=typeof m.entryHash==='string'&&/^[a-f0-9]{64}$/i.test(m.entryHash)?m.entryHash:null,transferId=text(m.transferId);
 const matching=held.filter(row=>row.authority==='account-source-projection'&&(amount===null||row.amountUsdCents===amount)&&
  (hash&&row.evidence.entryHash===hash&&(!entryId||row.sourceId===entryId)||transferId&&row.source==='wallet'&&row.evidence.transferId===transferId));
 if(matching.length===1)return matching[0]!;
 const side=/buy$/.test(kind)?'buy':/sell$/.test(kind)?'sell':null,transfer=/transfer/.test(kind),pulse=uint(m.pulse),upulse=uint(m.kaiUpulse??m.kaiUPulse);
 const sourceId=entryId??'calendar:'+event.id;
 return{id:'actions:'+sourceId,sourceId,source:'actions',kind,title:calendarEventTitle(event,owner),detail:'',time:event.startAt,actor:null,sender:null,recipient:null,amountUsdCents:amount,pulse,kaiUpulse:upulse,sourceUrl:null,evidence:{...(hash?{entryHash:hash}:{}),...(transferId?{transferId}:{})},authority:'account-source-projection',origin:'private-account',...(transfer?{accountFlow:m.senderUserId===owner?'out' as const:m.recipientUserId===owner?'in' as const:undefined}:{}),valueOperands:readLedgerValueOperands(m),details:readLedgerDetails({...m,kind,payload:side?{...m,side}:undefined})};
}
