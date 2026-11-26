/** Public routing facts only. Existing native execution reopens the accepted
 * asset head and funded offers before authorizing any transition. */
export type PublicCurrencyTerms=Readonly<{symbol:string;supplyMicro:string;priceUsdCentsPerUnit:string}>;
export type PublicNativeAssetBinding=Readonly<{id:string;issuanceSourceSha256:string;headSourceSha256:string;publicCertificateSha256:string;currency?:PublicCurrencyTerms}>;
export function publicNativeAssetBinding(value:unknown):PublicNativeAssetBinding|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return;const v=value as Record<string,unknown>,fields=['id','issuanceSourceSha256','headSourceSha256','publicCertificateSha256'];if(Object.keys(v).length!==(Object.hasOwn(v,'currency')?5:4)||!fields.every(key=>typeof v[key]==='string'&&/^[a-f0-9]{64}$/.test(v[key] as string)))return;
 if(!Object.hasOwn(v,'currency'))return Object.freeze({...v}) as PublicNativeAssetBinding;
 const currency=v.currency as Record<string,unknown>|null;
 if(!currency||typeof currency!=='object'||Array.isArray(currency)||Object.keys(currency).length!==3
  ||typeof currency.symbol!=='string'||! /^[A-Z][A-Z0-9]{1,7}$/.test(currency.symbol)
  ||typeof currency.supplyMicro!=='string'||! /^[1-9][0-9]{0,12}000000$/.test(currency.supplyMicro)
  ||typeof currency.priceUsdCentsPerUnit!=='string'||! /^[1-9][0-9]{0,18}$/.test(currency.priceUsdCentsPerUnit)
  ||BigInt(currency.supplyMicro)*BigInt(currency.priceUsdCentsPerUnit)/1000000n>9223372036854775807n)return;
 return Object.freeze({...v,currency:Object.freeze({...currency})}) as PublicNativeAssetBinding;
}
