import { PULSE_MS } from '../../native/receiz/app/utils/kai_pulse';
import { exactAmount, formatUnits, parseAmount, SCALE } from '../core/money';
import type { OpenIdentity } from './native-identity';

type PlacementInterval = Readonly<{venueId:string;startKaiUPulse:string;endKaiUPulse:string;quantityMicro:string}>;
export type PlacementSlot = PlacementInterval & (Readonly<{pulsesPerUnit:string;quantityIncrementMicro:string}>
  | Readonly<{pulsesPerUnit?:never;quantityIncrementMicro?:never}>);
export type PlacementTerms = PlacementInterval & Readonly<{
 assetId:string;bookingId:string;ownerAccountId:string;originalId:string;originalSourceSha256:string;showcaseHeadSha256:string;
 placementSha256:string;policySha256:string;inventorySha256:string;slotIndex:string;holdUntilKaiUPulse:string;pulsesPerUnit?:string;
}>;
export type PlacementAction = Readonly<{kind:'reserve-service-placement';terms:PlacementTerms;charterEvidenceSha256:string}
  |{kind:'cancel-service-placement';bookingId:string}>;
export type PlacementBooking = PlacementInterval & Readonly<{id:string;originalId:string;status:'reserved'|'started'|'delivered'|'cancelled'|'expired'}>;
export type PlacementSchedule = Readonly<{assetId:string;assetDigest:string;originals:readonly {id:string;title:string}[];
 slots:readonly PlacementSlot[];bookings:readonly PlacementBooking[]}>;
const schema='receiz.bank.currency-placement-schedule.v1';
const digest=/^[a-f0-9]{64}$/u, integer=/^(0|[1-9][0-9]{0,18})$/u, name=/^[a-z0-9][a-z0-9_-]{0,63}$/u;
const account=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u, original=/^(?:[a-f0-9-]{36}|imported-[a-f0-9]{64})$/u;
const typed=(v:unknown,p:RegExp):v is string=>typeof v==='string'&&p.test(v);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&keys.every(key=>Object.hasOwn(v,key));
const fail=():never=>{throw Error('BANK_ASSET_PLACEMENT_SOURCE_INVALID');};
const slotFields=['venueId','startKaiUPulse','endKaiUPulse','quantityMicro'] as const;

function interval(value:unknown):value is Record<string,unknown> & PlacementInterval {
 return object(value)&&typed(value.venueId,name)&&typed(value.startKaiUPulse,integer)&&typed(value.endKaiUPulse,integer)
  &&typed(value.quantityMicro,integer)&&value.quantityMicro!=='0'
  &&BigInt(value.startKaiUPulse)<BigInt(value.endKaiUPulse)&&BigInt(value.endKaiUPulse)<=BigInt(Number.MAX_SAFE_INTEGER);
}
function slot(value:unknown):value is Record<string,unknown> & PlacementSlot {
 if(!interval(value))return false;
 if(value.pulsesPerUnit===undefined&&value.quantityIncrementMicro===undefined)return true;
 if(!typed(value.pulsesPerUnit,integer)||!typed(value.quantityIncrementMicro,integer)
  ||value.pulsesPerUnit==='0'||value.quantityIncrementMicro==='0')return false;
 const maximum=BigInt(value.quantityMicro);
 return maximum%BigInt(value.quantityIncrementMicro)===0n
  &&maximum*BigInt(value.pulsesPerUnit)<=BigInt(value.endKaiUPulse)-BigInt(value.startKaiUPulse);
}

const durationNumber = new Intl.NumberFormat(undefined,{maximumSignificantDigits:4});

/** Project exact Kai micropulses as pulses and an approximate wall-clock duration. */
export function formatPlacementDuration(microPulses:bigint):string {
 const seconds=Number(microPulses)/Number(SCALE)*PULSE_MS/1000;
 let amount=seconds, unit='s';
 if(seconds>=86_400) {amount=seconds/86_400;unit='d';}
 else if(seconds>=3600) {amount=seconds/3600;unit='h';}
 else if(seconds>=60) {amount=seconds/60;unit='min';}
 return formatUnits(microPulses.toString())+' Kai '+(microPulses===SCALE?'pulse':'pulses')
  +' (about '+durationNumber.format(amount)+' '+unit+')';
}

/** Resolve the selected display terms. The native operation still verifies and authorizes its own exact offer. */
export function placementPreview(slot:PlacementSlot, amount:string):PlacementSlot {
 if(slot.pulsesPerUnit===undefined)return slot;
 const entry=amount.trim();
 const quantity=exactAmount(parseAmount(entry.startsWith('.')?'0'+entry:entry),true);
 if(quantity%BigInt(slot.quantityIncrementMicro)!==0n) {
  throw Error('Enter an amount in increments of '+formatUnits(slot.quantityIncrementMicro)+'.');
 }
 if(quantity>BigInt(slot.quantityMicro))throw Error('Enter '+formatUnits(slot.quantityMicro)+' credits or fewer for this placement.');
 const end=BigInt(slot.startKaiUPulse)+quantity*BigInt(slot.pulsesPerUnit);
 if(end>BigInt(slot.endKaiUPulse))return fail();
 return {...slot,quantityMicro:quantity.toString(),endKaiUPulse:end.toString()};
}

export function inspectPlacementAction(input:unknown):PlacementAction {
 if(!object(input))return fail();
 if(input.kind==='cancel-service-placement'&&fields(input,['kind','bookingId'])&&typed(input.bookingId,account))return input as PlacementAction;
 if(input.kind!=='reserve-service-placement'||!fields(input,['kind','terms','charterEvidenceSha256'])||!typed(input.charterEvidenceSha256,digest))return fail();
 const terms=input.terms;
 if(!interval(terms))return fail();
 const hasRate=Object.hasOwn(terms,'pulsesPerUnit');
 if(!fields(terms,[...slotFields,'assetId','bookingId','ownerAccountId','originalId','originalSourceSha256',
  'showcaseHeadSha256','placementSha256','policySha256','inventorySha256','slotIndex','holdUntilKaiUPulse',...(hasRate?['pulsesPerUnit']:[])])
  ||![terms.assetId,terms.originalSourceSha256,terms.showcaseHeadSha256,terms.placementSha256,terms.policySha256,terms.inventorySha256].every(v=>typed(v,digest))
  ||![terms.bookingId,terms.ownerAccountId].every(v=>typed(v,account))||!typed(terms.originalId,original)
  ||!typed(terms.slotIndex,integer)||!typed(terms.holdUntilKaiUPulse,integer))return fail();
 if(hasRate&&(!typed(terms.pulsesPerUnit,integer)||terms.pulsesPerUnit==='0'
  ||BigInt(terms.quantityMicro)*BigInt(terms.pulsesPerUnit)!==BigInt(terms.endKaiUPulse)-BigInt(terms.startKaiUPulse)))return fail();
 return input as PlacementAction;
}

export async function placementSchedule(identity:OpenIdentity,assetId:string):Promise<PlacementSchedule> {
 if(!identity.currencyGovernance||!typed(assetId,digest))return fail();
 const result=await identity.currencyGovernance({schema,action:'list',assetId});
 if(!object(result)||result.schema!==schema||result.assetId!==assetId||!typed(result.assetDigest,digest)
  ||!Array.isArray(result.originals)||!result.originals.every(o=>object(o)&&typed(o.id,original)&&typeof o.title==='string')
  ||!Array.isArray(result.slots)||!result.slots.every(slot)||!Array.isArray(result.bookings)
  ||!result.bookings.every(b=>object(b)&&interval(b)&&typed(b.id,account)&&typed(b.originalId,original)
  &&['reserved','started','delivered','cancelled','expired'].includes(String(b.status))))return fail();
 return result as PlacementSchedule;
}

export async function preparePlacementOffer(identity:OpenIdentity, assetId:string, originalId:string, selected:PlacementSlot, assetDigest:string) {
 if(!identity.currencyGovernance||!typed(assetDigest,digest))return fail();
 const result=await identity.currencyGovernance({
  schema,action:'prepare-offer',assetId,originalId,venueId:selected.venueId,startKaiUPulse:selected.startKaiUPulse,
  ...(selected.pulsesPerUnit===undefined?{}:{quantityMicro:selected.quantityMicro}),
 });
 if(!object(result)||result.assetDigest!==assetDigest)return fail();
 const placement=inspectPlacementAction(result.placement);
 if(placement.kind!=='reserve-service-placement'||placement.terms.assetId!==assetId||placement.terms.originalId!==originalId
  ||placement.terms.pulsesPerUnit!==selected.pulsesPerUnit||slotFields.some(key=>placement.terms[key]!==selected[key]))return fail();
 return {kind:'book-currency-service' as const,assetDigest,placement};
}
