import type { OpenIdentity } from './native-identity';

export type PlacementSlot = Readonly<{venueId:string;startKaiUPulse:string;endKaiUPulse:string;quantityMicro:string}>;
export type PlacementTerms = PlacementSlot & Readonly<{
  assetId:string;bookingId:string;ownerAccountId:string;originalId:string;originalSourceSha256:string;showcaseHeadSha256:string;
  placementSha256:string;policySha256:string;inventorySha256:string;slotIndex:string;holdUntilKaiUPulse:string;
}>;
export type PlacementAction = Readonly<{kind:'reserve-service-placement';terms:PlacementTerms;charterEvidenceSha256:string}
  |{kind:'cancel-service-placement';bookingId:string}>;
export type PlacementBooking = PlacementSlot & Readonly<{id:string;originalId:string;status:'reserved'|'started'|'delivered'|'cancelled'|'expired'}>;
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

function slot(value:unknown):value is Record<string,unknown> & PlacementSlot {
 return object(value)&&typed(value.venueId,name)&&typed(value.startKaiUPulse,integer)&&typed(value.endKaiUPulse,integer)
  &&typed(value.quantityMicro,integer)&&value.quantityMicro!=='0'
  &&BigInt(value.startKaiUPulse)<BigInt(value.endKaiUPulse)&&BigInt(value.endKaiUPulse)<=BigInt(Number.MAX_SAFE_INTEGER);
}
export function inspectPlacementAction(input:unknown):PlacementAction {
 if(!object(input))return fail();
 if(input.kind==='cancel-service-placement'&&fields(input,['kind','bookingId'])&&typed(input.bookingId,account))return input as PlacementAction;
 if(input.kind!=='reserve-service-placement'||!fields(input,['kind','terms','charterEvidenceSha256'])||!typed(input.charterEvidenceSha256,digest))return fail();
 const terms=input.terms;
 if(!object(terms)||!slot(terms)||!fields(terms,[...slotFields,'assetId','bookingId','ownerAccountId','originalId','originalSourceSha256',
  'showcaseHeadSha256','placementSha256','policySha256','inventorySha256','slotIndex','holdUntilKaiUPulse'])
  ||![terms.assetId,terms.originalSourceSha256,terms.showcaseHeadSha256,terms.placementSha256,terms.policySha256,terms.inventorySha256].every(v=>typed(v,digest))
  ||![terms.bookingId,terms.ownerAccountId].every(v=>typed(v,account))||!typed(terms.originalId,original)
  ||!typed(terms.slotIndex,integer)||!typed(terms.holdUntilKaiUPulse,integer))return fail();
 return input as PlacementAction;
}

export async function placementSchedule(identity:OpenIdentity,assetId:string):Promise<PlacementSchedule> {
 if(!identity.currencyGovernance||!typed(assetId,digest))return fail();
 const result=await identity.currencyGovernance({schema,action:'list',assetId});
 if(!object(result)||result.schema!==schema||result.assetId!==assetId||!typed(result.assetDigest,digest)
  ||!Array.isArray(result.originals)||!result.originals.every(o=>object(o)&&typed(o.id,original)&&typeof o.title==='string')
  ||!Array.isArray(result.slots)||!result.slots.every(slot)||!Array.isArray(result.bookings)
  ||!result.bookings.every(b=>object(b)&&slot(b)&&typed(b.id,account)&&typed(b.originalId,original)
  &&['reserved','started','delivered','cancelled','expired'].includes(String(b.status))))return fail();
 return result as PlacementSchedule;
}

export async function preparePlacementOffer(identity:OpenIdentity, assetId:string, originalId:string, selected:PlacementSlot) {
 if(!identity.currencyGovernance)return fail();
 const result=await identity.currencyGovernance({schema,action:'prepare-offer',assetId,originalId,venueId:selected.venueId,startKaiUPulse:selected.startKaiUPulse});
 if(!object(result)||!typed(result.assetDigest,digest))return fail();
 const placement=inspectPlacementAction(result.placement);
 if(placement.kind!=='reserve-service-placement'||placement.terms.assetId!==assetId||placement.terms.originalId!==originalId
  ||slotFields.some(key=>placement.terms[key]!==selected[key]))return fail();
 return {kind:'book-currency-service' as const,assetDigest:result.assetDigest,placement};
}
