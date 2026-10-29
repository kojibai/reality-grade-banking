export type BookingOffer=Readonly<{id:string;name:string;slotMinutes:number;priceUsdCents:string}>;
const invalid=():never=>{throw Error('BOOKING_SOURCE_INVALID');};
export function bookingOfferId(value:unknown):string{if(typeof value!=='string'||!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(value))invalid();return value as string;}
/** Offer terms project the existing accepted Calendar policy. This parser
 * admits shape only; it grants no booking or payment authority. */
export function readBookingOffers(value:unknown):BookingOffer[]{
 if(!Array.isArray(value)||value.length>12)invalid();const ids=new Set<string>();
 return (value as unknown[]).map(raw=>{const row=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};const id=bookingOfferId(row.id),price=row.priceUsdCents;
  if(Object.keys(row).sort().join('|')!=='id|name|priceUsdCents|slotMinutes'||ids.has(id)||typeof row.name!=='string'||row.name!==row.name.trim()||!row.name||row.name.length>80||/[\u0000-\u001f\u007f]/.test(row.name)||!Number.isInteger(row.slotMinutes)||Number(row.slotMinutes)<15||Number(row.slotMinutes)>180||typeof price!=='string'||!/^(0|[1-9]\d{0,7})$/.test(price)||BigInt(price)>10000000n)invalid();
  ids.add(id);return {id,name:row.name as string,slotMinutes:row.slotMinutes as number,priceUsdCents:price as string};
 });
}
export function selectBookingOffer(offers:readonly BookingOffer[],id?:unknown):BookingOffer|null{if(id===undefined)return offers[0]??null;const found=offers.find(row=>row.id===bookingOfferId(id));if(!found)invalid();return found!;}
