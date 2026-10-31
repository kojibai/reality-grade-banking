/** Merchant presentation records. Payment originals remain the payment authority. */
export interface CounterVariant{id:string;name:string;priceUsdCents:string;sku:string;barcode:string;stockMicros:string|null;lowStockMicros:string;costUsdCents?:string;compareAtUsdCents?:string;}
export interface CounterModifier{id:string;name:string;priceUsdCents:string;}
export interface CounterModifierGroup{id:string;name:string;required:boolean;max:number;options:CounterModifier[];}
export interface CounterProductDetails{description?:string;receiptName?:string;brand?:string;supplier?:string;supplierCode?:string;website?:string;internalNotes?:string;customerNote?:string;categories?:string[];tags?:string[];images?:{source:string;alt:string}[];taxable?:boolean;taxRateBps?:string;taxIncluded?:boolean;location?:string;bin?:string;reorderQuantityMicros?:string;leadTimeDays?:string;shippingRequired?:boolean;weight?:string;weightUnit?:string;length?:string;width?:string;height?:string;dimensionUnit?:string;prepMinutes?:string;durationMinutes?:string;ingredients?:string;allergens?:string;customFields:{id:string;name:string;value:string}[];}
export interface CounterOffering{id:string;name:string;category:string;kind:'item'|'service';unit:string;favorite:boolean;archived:boolean;variants:CounterVariant[];modifiers:CounterModifierGroup[];details?:CounterProductDetails;}
export interface CounterLine{id:string;itemId:string|null;variantId:string|null;name:string;variantName:string;unit:string;unitPriceUsdCents:string;quantityMicros:string;modifiers:CounterModifier[];taxable?:boolean;taxRateBps?:string;taxIncluded?:boolean;customerNote?:string;unitCostUsdCents?:string;}
export interface CounterCart{lines:CounterLine[];discount:{kind:'percent'|'amount';value:string};taxRateBps:string;taxIncluded:boolean;tipUsdCents:string;customer:string;fulfillment:'takeaway'|'dine-in'|'delivery'|'service';note:string;}
export type CounterAmounts=ReturnType<typeof calculateCart>;
const fail=(message='Check the item details and try again.'):never=>{throw Error(message);};
export const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,19})$/.test(v);
export const text=(v:unknown,max=160):v is string=>typeof v==='string'&&v.length<=max;
export const key=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=100;
export function parsePrice(raw:string):string{
 const value=raw.trim().replace(/^\$\s*/,'');if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value))return fail('Enter a price with up to two decimal places.');
 const [whole,fraction='']=value.replaceAll(',','').split('.'),result=(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))).toString();if(!uint(result))return fail('This amount is too large.');return result;
}
export function parseQuantity(raw:string,allowZero=false):string{
 if(!/^\d+(?:\.\d{1,6})?$/.test(raw.trim()))return fail('Enter a quantity with up to six decimal places.');const [whole,fraction='']=raw.trim().split('.'),result=(BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'))).toString();if(!uint(result)||!allowZero&&result==='0')return fail('Enter a quantity greater than zero.');return result;
}
export function quantityText(micros:string):string{const n=BigInt(micros);return`${n/1000000n}${n%1000000n?'.'+String(n%1000000n).padStart(6,'0').replace(/0+$/,''):''}`;}
export function priceText(cents:string):string{const n=BigInt(cents);return`${n/100n}.${String(n%100n).padStart(2,'0')}`;}
const distinct=(values:string[])=>new Set(values).size===values.length;
export function productImageSource(value:unknown):value is string{if(typeof value!=='string')return false;if(/^sha256:[a-f0-9]{64}$/.test(value))return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&value.length<=2048;}catch{return false;}}
export function validateProductDetails(d:CounterProductDetails){
 if(!d||typeof d!=='object'||Array.isArray(d))return fail();for(const [name,value] of Object.entries(d)){if(value===undefined)continue;if(['categories','tags'].includes(name)){if(!Array.isArray(value)||value.length>50||value.some(v=>!text(v,80)||!v.trim())||!distinct(value))return fail('Check product categories and tags.');}
 else if(name==='images'){if(!Array.isArray(value)||value.length>12||value.some(v=>!v||!productImageSource(v.source)||!text(v.alt,160)))return fail('Choose a valid product image.');}
 else if(name==='customFields'){if(!Array.isArray(value)||value.length>50||value.some(v=>!v||!key(v.id)||!text(v.name,80)||!v.name.trim()||!text(v.value,2000))||!distinct(value.map(v=>v.id)))return fail('Check the custom product fields.');}
 else if(['taxable','taxIncluded','shippingRequired'].includes(name)){if(typeof value!=='boolean')return fail();}
 else if(['taxRateBps','reorderQuantityMicros'].includes(name)){if(!uint(value)||name==='taxRateBps'&&BigInt(value)>10000n)return fail('Check tax and stock quantities.');}
 else if(!text(value,['description','internalNotes','ingredients'].includes(name)?8000:2000))return fail('One product detail is too long.');}
 for(const key of ['leadTimeDays','prepMinutes','durationMinutes']as const)if(d[key]&&!/^\d{1,9}$/.test(d[key]!))return fail('Enter a whole number for timing details.');for(const key of ['weight','length','width','height']as const)if(d[key]&&!/^\d+(?:\.\d{1,6})?$/.test(d[key]!))return fail('Check the product weight and dimensions.');if(d.website){try{const url=new URL(d.website);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return fail('Use a valid product website.');}catch{return fail('Use a valid product website.');}}if(!Array.isArray(d.customFields))return fail();return d;
}
export function validateOffering(raw:CounterOffering):CounterOffering{
 const v=raw;if(!v||!key(v.id)||!text(v.name)||!v.name.trim()||!text(v.category,80)||!['item','service'].includes(v.kind)||!text(v.unit,24)||!v.unit.trim()||typeof v.favorite!=='boolean'||typeof v.archived!=='boolean'||!Array.isArray(v.variants)||!v.variants.length||v.variants.length>200||!Array.isArray(v.modifiers)||v.modifiers.length>20)return fail();
 for(const variant of v.variants)if(!variant||!key(variant.id)||!text(variant.name,80)||!uint(variant.priceUsdCents)||!text(variant.sku,100)||!text(variant.barcode,100)||variant.stockMicros!==null&&!uint(variant.stockMicros)||!uint(variant.lowStockMicros)||variant.costUsdCents!==undefined&&!uint(variant.costUsdCents)||variant.compareAtUsdCents!==undefined&&!uint(variant.compareAtUsdCents))return fail();
 if(!distinct(v.variants.map(row=>row.id))||!distinct(v.variants.map(row=>row.sku).filter(Boolean))||!distinct(v.variants.map(row=>row.barcode).filter(Boolean)))return fail('Each variant needs a distinct SKU and barcode.');
 const optionIds:string[]=[];for(const group of v.modifiers){if(!group||!key(group.id)||!text(group.name,80)||!group.name.trim()||typeof group.required!=='boolean'||!Number.isInteger(group.max)||group.max<1||group.max>50||!Array.isArray(group.options)||!group.options.length||group.options.length>50)return fail();for(const option of group.options){if(!option||!key(option.id)||!text(option.name,80)||!option.name.trim()||!uint(option.priceUsdCents))return fail();optionIds.push(option.id);}}
 if(!distinct(v.modifiers.map(row=>row.id))||!distinct(optionIds))return fail();if(v.details!==undefined)validateProductDetails(v.details);return v;
}
export function validateCatalog(items:CounterOffering[]):CounterOffering[]{
 if(!Array.isArray(items)||items.length>25000)return fail('A catalog can contain up to 25,000 offerings.');items.forEach(validateOffering);
 if(!distinct(items.map(row=>row.id)))return fail();for(const field of ['sku','barcode'] as const)if(!distinct(items.flatMap(item=>item.variants.map(v=>v[field])).filter(Boolean)))return fail(`Each ${field==='sku'?'SKU':'barcode'} must identify only one variant.`);return items;
}
export function freezeLine(item:CounterOffering,variantId:string,quantityMicros:string,selected:string[],id:string=crypto.randomUUID()):CounterLine{
 validateOffering(item);const variant=item.variants.find(row=>row.id===variantId);if(item.archived||!variant||!key(id)||!uint(quantityMicros)||quantityMicros==='0'||!distinct(selected))return fail('Choose an available item and quantity.');
 const modifiers:CounterModifier[]=[];for(const group of item.modifiers){const chosen=group.options.filter(option=>selected.includes(option.id));if(group.required&&!chosen.length||chosen.length>group.max)return fail(`Choose ${group.required?'at least one and ':''}up to ${group.max} for ${group.name}.`);modifiers.push(...chosen.map(option=>({...option})));}
 if(modifiers.length!==selected.length)return fail('One of these options is no longer available.');
 return{id,itemId:item.id,variantId:variant.id,name:item.details?.receiptName?.trim()||item.name,variantName:variant.name,unit:item.unit,unitPriceUsdCents:(BigInt(variant.priceUsdCents)+modifiers.reduce((n,m)=>n+BigInt(m.priceUsdCents),0n)).toString(),quantityMicros,modifiers,...(item.details?.taxable!==undefined?{taxable:item.details.taxable}:{}),...(item.details?.taxRateBps!==undefined?{taxRateBps:item.details.taxRateBps}:{}),...(item.details?.taxIncluded!==undefined?{taxIncluded:item.details.taxIncluded}:{}),...(item.details?.customerNote?{customerNote:item.details.customerNote}:{}),...(variant.costUsdCents!==undefined?{unitCostUsdCents:variant.costUsdCents}:{})};
}
export function validateLine(v:CounterLine):CounterLine{
 if(!v||!key(v.id)||(v.itemId!==null&&!key(v.itemId))||(v.variantId!==null&&!key(v.variantId))||!text(v.name)||!v.name.trim()||!text(v.variantName,80)||!text(v.unit,24)||!uint(v.unitPriceUsdCents)||!uint(v.quantityMicros)||v.quantityMicros==='0'||!Array.isArray(v.modifiers)||v.modifiers.length>100||v.modifiers.some(m=>!key(m.id)||!text(m.name,80)||!uint(m.priceUsdCents)))return fail('This cart line is invalid.');if(v.taxable!==undefined&&typeof v.taxable!=='boolean'||v.taxIncluded!==undefined&&typeof v.taxIncluded!=='boolean'||v.taxRateBps!==undefined&&(!uint(v.taxRateBps)||BigInt(v.taxRateBps)>10000n)||v.customerNote!==undefined&&!text(v.customerNote,2000))return fail();return v;
}
const round=(numerator:bigint,denominator:bigint)=>(numerator+denominator/2n)/denominator;
export function lineAmount(line:CounterLine):string{validateLine(line);return round(BigInt(line.unitPriceUsdCents)*BigInt(line.quantityMicros),1000000n).toString();}
export function calculateCart(cart:Pick<CounterCart,'lines'|'discount'|'taxRateBps'|'taxIncluded'|'tipUsdCents'>){
 if(!Array.isArray(cart.lines)||cart.lines.length>1000||!distinct(cart.lines.map(row=>row.id))||!cart.discount||!['amount','percent'].includes(cart.discount.kind)||!uint(cart.discount.value)||!uint(cart.taxRateBps)||BigInt(cart.taxRateBps)>10000n||typeof cart.taxIncluded!=='boolean'||!uint(cart.tipUsdCents))return fail('Check the sale totals.');
 const subtotal=cart.lines.reduce((sum,line)=>sum+BigInt(lineAmount(line)),0n),value=BigInt(cart.discount.value);if(cart.discount.kind==='percent'&&value>10000n)return fail('Discount cannot exceed 100%.');
 const discount=cart.discount.kind==='percent'?round(subtotal*value,10000n):value;if(discount>subtotal)return fail('Discount cannot exceed the item total.');
 const net=subtotal-discount,groups=new Map<string,{base:bigint;rate:bigint;included:boolean}>();let cumulative=0n,allocated=0n;
 for(const line of cart.lines){const base=BigInt(lineAmount(line));cumulative+=base;const next=subtotal?discount*cumulative/subtotal:0n,lineDiscount=next-allocated;allocated=next;if(line.taxable===false)continue;const rate=BigInt(line.taxRateBps??cart.taxRateBps),included=line.taxIncluded??cart.taxIncluded,key=`${rate}:${included}`,group=groups.get(key)??{base:0n,rate,included};group.base+=base-lineDiscount;groups.set(key,group);}
 let tax=0n,addedTax=0n,taxable=0n;for(const group of groups.values()){const amount=round(group.base*group.rate,group.included?10000n+group.rate:10000n);tax+=amount;if(!group.included)addedTax+=amount;taxable+=group.base-(group.included?amount:0n);}
 const tip=BigInt(cart.tipUsdCents),total=net+addedTax+tip;if(!uint(total.toString())||total>9223372036854775807n)return fail('This sale amount is too large.');
 return{subtotalUsdCents:subtotal.toString(),discountUsdCents:discount.toString(),taxableUsdCents:taxable.toString(),taxUsdCents:tax.toString(),tipUsdCents:tip.toString(),totalUsdCents:total.toString()};
}
export function emptyCart():CounterCart{return{lines:[],discount:{kind:'amount',value:'0'},taxRateBps:'0',taxIncluded:false,tipUsdCents:'0',customer:'',fulfillment:'takeaway',note:''};}
export function validateCart(cart:CounterCart):CounterCart{calculateCart(cart);if(!text(cart.customer,200)||!text(cart.note,2000)||!['takeaway','dine-in','delivery','service'].includes(cart.fulfillment))return fail();return cart;}
