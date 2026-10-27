/** Passive, owner-visible references beneath the existing selected proof and
 * financial heads. These references never admit proof or authorize spending. */
export type BalanceOriginalProofReference=Readonly<{sourceSha256:string;pbiReceiptHash:string;verifyPath?:string;verifyUrl?:string}>;
export type ReserveFundingMovement=Readonly<{ledgerId:string;direction:'credit'|'debit';kind:string;kaiUpulse:string|null;amountPhiMicro:string;amountUsdCents:string;usdPerPhiMicrocents?:string;sourceArtifactSha256:string|null;receipt?:Readonly<{acceptedInputSha256:string;checkoutSessionId:string|null;paymentIntentId:string|null}>}>;
export type ReserveFundingSource=Readonly<{accountId:string;sourceSha256:string;reservePhiMicro:string;recordedReserveUsdCents:string;complete:boolean;movements:readonly ReserveFundingMovement[];displayedReserveUsdCents:string;displayCap:Readonly<{accountBalancePhiMicro:string;accountBalanceUsdCents:string;usdPerPhiMicrocents:string}>}>;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const uint=(value:unknown):value is string=>typeof value==='string'&&/^(0|[1-9]\d{0,39})$/.test(value);
const text=(value:unknown,limit=512):value is string=>typeof value==='string'&&value.length>0&&value.length<=limit&&!/[\x00-\x1f\x7f]/.test(value);
const knownOriginals=new Map<string,BalanceOriginalProofReference>(),knownFunding=new Map<string,ReserveFundingSource>();
export function readBalanceOriginalProofReference(input:unknown,id:string):BalanceOriginalProofReference|undefined{
 if(!record(input)||!hex(input.sourceSha256))return;
 const known=knownOriginals.get(`${id}:${input.sourceSha256}`);if(known&&hex(input.pbiReceiptHash)&&input.pbiReceiptHash!==known.pbiReceiptHash)return known;const receipt=hex(input.pbiReceiptHash)?input.pbiReceiptHash:known?.pbiReceiptHash;if(!receipt)return;
 const value={sourceSha256:input.sourceSha256,pbiReceiptHash:receipt,...(typeof input.verifyPath==='string'&&!/[\x00-\x1f\x7f]/.test(input.verifyPath)?{verifyPath:input.verifyPath}:known?.verifyPath?{verifyPath:known.verifyPath}:{}),...(typeof input.verifyUrl==='string'&&!/[\x00-\x1f\x7f]/.test(input.verifyUrl)?{verifyUrl:input.verifyUrl}:known?.verifyUrl?{verifyUrl:known.verifyUrl}:{})};
 knownOriginals.set(`${id}:${value.sourceSha256}`,value);return value;
}
export function readBalanceOriginalProofReferences(input:unknown):Readonly<Record<string,BalanceOriginalProofReference>>|undefined{
 if(!record(input)||Object.keys(input).length>10_000)return;
 const output:Record<string,BalanceOriginalProofReference>={};for(const [id,value]of Object.entries(input)){if(!text(id))continue;const ref=readBalanceOriginalProofReference(value,id);if(ref)output[id]=ref;}return output;
}
/** Whitelist only already carried ledger/receipt identifiers. No provider
 * secret, customer field, transport token or private key is projected here. */
export function readReserveFundingSource(input:unknown,accountId:string,displayedReserveUsdCents:string):ReserveFundingSource|undefined{
 if(!record(input)||input.accountId!==accountId||!hex(input.sourceSha256)||!uint(input.reservePhiMicro)||!uint(input.recordedReserveUsdCents)||input.displayedReserveUsdCents!==displayedReserveUsdCents||typeof input.complete!=='boolean'||!record(input.displayCap)||!Array.isArray(input.movements)||input.movements.length>100_000)return;
 const cap=input.displayCap;if(![cap.accountBalancePhiMicro,cap.accountBalanceUsdCents,cap.usdPerPhiMicrocents].every(uint))return;
 const recorded=BigInt(input.recordedReserveUsdCents),quoted=BigInt(cap.accountBalanceUsdCents as string);if((recorded<quoted?recorded:quoted).toString()!==displayedReserveUsdCents)return;
 const key=`${accountId}:${input.sourceSha256}`,known=knownFunding.get(key),rows:ReserveFundingMovement[]=[];
 if(known&&(known.reservePhiMicro!==input.reservePhiMicro||known.recordedReserveUsdCents!==input.recordedReserveUsdCents))return;
 const economic=(row:{ledgerId?:unknown;direction?:unknown;kind?:unknown;kaiUpulse?:unknown;amountPhiMicro?:unknown;amountUsdCents?:unknown})=>JSON.stringify([row.ledgerId,row.direction,row.kind,row.kaiUpulse,row.amountPhiMicro,row.amountUsdCents]);
 const heldRows=new Map(known?.movements.map(row=>[economic(row),row])),remaining=new Map<string,number>();for(const row of known?.movements??[])remaining.set(economic(row),(remaining.get(economic(row))??0)+1);let phi=0n,usd=0n;
 for(const row of input.movements){
  if(!record(row)||!text(row.ledgerId)||!text(row.kind,128)||!['credit','debit'].includes(String(row.direction))||!(row.kaiUpulse===null||typeof row.kaiUpulse==='string'&&/^\d{1,30}$/.test(row.kaiUpulse))||!uint(row.amountPhiMicro)||!uint(row.amountUsdCents)||!(row.sourceArtifactSha256===null||hex(row.sourceArtifactSha256)))return;
  const sign=row.direction==='credit'?1n:-1n;phi+=sign*BigInt(row.amountPhiMicro);usd+=sign*BigInt(row.amountUsdCents);
  const rowKey=economic(row),prior=heldRows.get(rowKey);if(prior)remaining.set(rowKey,(remaining.get(rowKey)??0)-1);
  if(known&&!prior)return known.reservePhiMicro===input.reservePhiMicro&&known.recordedReserveUsdCents===input.recordedReserveUsdCents?{...known,displayedReserveUsdCents,displayCap:{accountBalancePhiMicro:cap.accountBalancePhiMicro as string,accountBalanceUsdCents:cap.accountBalanceUsdCents as string,usdPerPhiMicrocents:cap.usdPerPhiMicrocents as string}}:undefined;
  const candidateReceipt=record(row.receipt)&&hex(row.receipt.acceptedInputSha256)&&(row.receipt.checkoutSessionId===null||text(row.receipt.checkoutSessionId))&&(row.receipt.paymentIntentId===null||text(row.receipt.paymentIntentId))?{acceptedInputSha256:row.receipt.acceptedInputSha256,checkoutSessionId:row.receipt.checkoutSessionId,paymentIntentId:row.receipt.paymentIntentId}:undefined;
  const receipt=prior?.receipt??candidateReceipt;
  const ingressQuote=prior?.usdPerPhiMicrocents??(uint(row.usdPerPhiMicrocents)&&row.usdPerPhiMicrocents!=='0'?row.usdPerPhiMicrocents:undefined);
  rows.push({ledgerId:row.ledgerId,direction:row.direction as 'credit'|'debit',kind:row.kind,kaiUpulse:row.kaiUpulse as string|null,amountPhiMicro:row.amountPhiMicro,amountUsdCents:row.amountUsdCents,...(ingressQuote?{usdPerPhiMicrocents:ingressQuote}:{}),sourceArtifactSha256:prior?.sourceArtifactSha256??row.sourceArtifactSha256??null,...(receipt?{receipt}: {})});
 }
 if(known&&[...remaining.values()].some(count=>count!==0))return {...known,displayedReserveUsdCents,displayCap:{accountBalancePhiMicro:cap.accountBalancePhiMicro as string,accountBalanceUsdCents:cap.accountBalanceUsdCents as string,usdPerPhiMicrocents:cap.usdPerPhiMicrocents as string}};
 if(phi.toString()!==input.reservePhiMicro||usd.toString()!==input.recordedReserveUsdCents){if(known&&known.reservePhiMicro===input.reservePhiMicro&&known.recordedReserveUsdCents===input.recordedReserveUsdCents)return {...known,displayedReserveUsdCents,displayCap:{accountBalancePhiMicro:cap.accountBalancePhiMicro as string,accountBalanceUsdCents:cap.accountBalanceUsdCents as string,usdPerPhiMicrocents:cap.usdPerPhiMicrocents as string}};return;}
 if(known){const enriched=new Map(rows.map(row=>[economic(row),row]));rows.splice(0,rows.length,...known.movements.map(row=>enriched.get(economic(row))!));}
 const value:ReserveFundingSource={accountId,sourceSha256:input.sourceSha256,reservePhiMicro:input.reservePhiMicro,recordedReserveUsdCents:input.recordedReserveUsdCents,complete:(input.complete||known?.complete===true)&&rows.every(row=>row.sourceArtifactSha256!==null),movements:rows,displayedReserveUsdCents,displayCap:{accountBalancePhiMicro:cap.accountBalancePhiMicro as string,accountBalanceUsdCents:cap.accountBalanceUsdCents as string,usdPerPhiMicrocents:cap.usdPerPhiMicrocents as string}};
 knownFunding.set(key,value);return value;
}
export function balanceProofHref(reference:BalanceOriginalProofReference):string|null{
 const raw=reference.verifyUrl??reference.verifyPath;if(!raw)return null;try{const url=new URL(raw,'https://receiz.com');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
