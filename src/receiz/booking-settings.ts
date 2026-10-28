import {organizerRecord,type BookingPrice,type BookingSettings,type BookingSettingsInput} from './organizer-types';
const invalid=():never=>{throw Error('BOOKING_SOURCE_INVALID');};
export function readBookingPrice(raw:unknown):BookingPrice|undefined{
 if(raw===undefined)return undefined;const value=organizerRecord(raw),price=value.priceUsdCents,revision=value.policyRevision;
 if(value.currency!=='usd'||value.feeUsdCents!=='0'||typeof price!=='string'||!/^(0|[1-9]\d{0,7})$/.test(price)||BigInt(price)>10000000n||revision!==null&&(typeof revision!=='string'||!revision||revision.length>200||/[\u0000-\u001f\u007f]/.test(revision))||price!=='0'&&revision===null)invalid();
 return{currency:'usd',priceUsdCents:price as string,feeUsdCents:'0',policyRevision:revision as string|null};
}
export function readBookingSettings(raw:unknown):BookingSettings|undefined{
 if(raw===undefined)return undefined;const value=organizerRecord(raw);if(typeof value.conversationEnabled!=='boolean'||value.conversationAvailable!==undefined&&typeof value.conversationAvailable!=='boolean')invalid();
 return{conversationEnabled:value.conversationEnabled as boolean,...(value.conversationAvailable===undefined?{}:{conversationAvailable:value.conversationAvailable as boolean})};
}
/** Input formatting only; the accepted owner policy supplies the actual price. */
export function bookingPriceInputCents(input:string){const value=input.trim()||'0';if(!/^\d{1,6}(?:\.\d{1,2})?$/.test(value))throw Error('Enter a price with up to two decimal places.');const [whole,fraction='']=value.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));if(cents>10000000n)throw Error('Enter a price up to $100,000.00.');return cents.toString();}
export function bookingPriceDollars(cents:string){const value=BigInt(cents);return `${value/100n}.${(value%100n).toString().padStart(2,'0')}`;}
export function readSavedBookingOptions(result:Record<string,unknown>,input:BookingSettingsInput){
 const bookingPrice=readBookingPrice(result.bookingPrice),bookingSettings=readBookingSettings(result.bookingSettings);
 if(input.bookingPriceUsdCents!==undefined&&bookingPrice?.priceUsdCents!==input.bookingPriceUsdCents||input.conversationEnabled!==undefined&&bookingSettings?.conversationEnabled!==input.conversationEnabled)throw Error('ORGANIZER_WRITE_UNCONFIRMED');
 return{...(bookingPrice?{bookingPrice}:{}),...(bookingSettings?{bookingSettings}:{})};
}
