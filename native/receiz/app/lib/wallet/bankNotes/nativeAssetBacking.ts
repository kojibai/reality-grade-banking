/** Closed data inspection beneath the existing native financial source.
 * This does not admit funds, identity, signatures or an execution outcome. */
export type NativeAssetFundingComponent=Readonly<{rail:'reserve'|'settlement';amountUsdCents:string;amountPhiMicro:string}>;
const fail=():never=>{throw Error('BANK_ASSET_BACKING_INVALID');};
const number=(v:unknown):bigint=>{if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,18})$/u.test(v))return fail();const n=BigInt(v);if(n>9223372036854775807n)return fail();return n;};
export function inspectNativeAssetFundingComponents(input:unknown,totals:Readonly<{amountUsdCents:string;amountPhiMicro:string}>,allowEmpty=false):readonly NativeAssetFundingComponent[]{
 if(!Array.isArray(input))return fail();if(input.length>2||!allowEmpty&&input.length===0)fail();
 let cents=0n,phi=0n,prior=-1;
 for(const v of input){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='amountPhiMicro,amountUsdCents,rail')fail();
  const order=v.rail==='reserve'?0:v.rail==='settlement'?1:-1;if(order<=prior)fail();prior=order;
  const c=number(v.amountUsdCents),p=number(v.amountPhiMicro);if(c===0n||p===0n)fail();cents+=c;phi+=p;
 }
 if(cents!==number(totals.amountUsdCents)||phi!==number(totals.amountPhiMicro))fail();
 return structuredClone(input) as NativeAssetFundingComponent[];
}
export function inspectNativeAssetBacking(input:unknown):void{
 if(!input||typeof input!=='object'||Array.isArray(input))fail();const v=input as Record<string,unknown>;
 // Historical encodings are inspected by their original reader; do not add
 // fields or impose the new component encoding on a retained signed record.
 if(!Object.hasOwn(v,'backingComponents')){if(v.backingRail!=='reserve'&&v.backingRail!=='settlement')fail();return;}
 if(!['reserve','settlement','composite'].includes(String(v.backingRail))||!['active','redeemed'].includes(String(v.status)))fail();
 const components=inspectNativeAssetFundingComponents(v.backingComponents,{amountUsdCents:v.backingUsdCents as string,amountPhiMicro:v.backingPhiMicro as string},v.status==='redeemed');
 if(v.status==='redeemed'){if(components.length||v.backingUsdCents!=='0'||v.backingPhiMicro!=='0')fail();}
 else if(v.backingRail!==(components.length===2?'composite':components[0]?.rail))fail();
}
