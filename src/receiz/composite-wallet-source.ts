import {projectCompositeWalletAt,projectCompositeWalletHistory,projectCompositeWalletExtension,projectCompositeWalletCoordinates,validateCompositeWalletSource,type CompositeWalletSource} from './composite-wallet-history';
import type {WalletObservation} from './wallet-observation';
import {isWalletQuoteHeld} from './wallet-observation';
import {mergeWalletPoints,walletPointTime} from './wallet-series';

export function readCompositeWalletSource(input:unknown,userId:string):CompositeWalletSource|null{
 try{const source=input as CompositeWalletSource;if(source?.userId!==userId)return null;validateCompositeWalletSource(source);
  if(source.transport?.capturedKaiUPulse!==undefined&&(!/^\d{1,30}$/.test(source.transport.capturedKaiUPulse)||BigInt(source.transport.capturedKaiUPulse)>BigInt(source.throughKaiUPulse)))return null;
  if(source.transport && (source.transport.after!==null&&!validCursor(source.transport.after)||source.transport.cursor!==null&&!validCursor(source.transport.cursor)))return null;
  return source;
 }catch{return null;}
}
export function validCursor(value:unknown):value is string{return typeof value==='string'&&value.length<=40&&/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|\+00:00)$/.test(value)&&Number.isFinite(Date.parse(value));}
/** Only new rows append. A response cannot silently rewrite a retained movement. */
export function mergeCompositeWalletSources(previous:CompositeWalletSource,next:CompositeWalletSource):CompositeWalletSource{
 if(previous.userId!==next.userId||BigInt(next.transport?.capturedKaiUPulse??next.throughKaiUPulse)<BigInt(previous.transport?.capturedKaiUPulse??previous.throughKaiUPulse))throw Error('COMPOSITE_HISTORY_SOURCE_REGRESSED');
 const rows=new Map(previous.movements.map(row=>[row.id,row]));for(const row of next.movements){const held=rows.get(row.id);if(held&&JSON.stringify(held)!==JSON.stringify(row))throw Error('COMPOSITE_HISTORY_MOVEMENT_CHANGED');rows.set(row.id,row);}
 const source={...next,movements:[...rows.values()],lawfulValues:next.lawfulValues};validateCompositeWalletSource(source);return source;
}
function protectedFrame(value:WalletObservation){return value.source==='local-note-head'||value.walletScope==='native-full'||isWalletQuoteHeld(value);}
/** Newly received source can refine calculated display samples in the interval
 * we advanced locally. It cannot rewrite its retained original movements. */
function changedSourceFrom(previous:CompositeWalletSource,next:CompositeWalletSource):bigint|null{
 let first:bigint|null=null;
 const include=(at:string)=>{const n=BigInt(at);if(first===null||n<first)first=n;};
 for(const key of ['movements','lawfulValues'] as const){
  const held=new Map(previous[key].map(row=>[row.id,row]));
  for(const row of next[key]){const old=held.get(row.id);if(!old||JSON.stringify(old)!==JSON.stringify(row)){include(row.kaiUPulse);if(old)include(old.kaiUPulse);}held.delete(row.id);}
  for(const row of held.values())include(row.kaiUPulse);
 }
 const objects=new Map(previous.objects.map(row=>[row.id,row]));
 for(const row of next.objects){const old=objects.get(row.id);if(!old||JSON.stringify(old)!==JSON.stringify(row)){for(const item of [...(old?.intervals??[]),...row.intervals])include(item.fromKaiUPulse);}objects.delete(row.id);}
 for(const row of objects.values())for(const interval of row.intervals)include(interval.fromKaiUPulse);
 return first;
}
function reconciledHistory(source:CompositeWalletSource,retained:WalletObservation){
 const held=retained.history!,end=retained.historyBasis!.endKaiUPulse,changed=retained.chartSource?changedSourceFrom(retained.chartSource,source):BigInt(held[0].kaiUPulse!);
 if(changed!==null&&changed<=BigInt(held[0].kaiUPulse!))return projectCompositeWalletHistory(source);
 const extension=projectCompositeWalletExtension(source,end);
 if(changed===null||changed>BigInt(end))return mergeWalletPoints([held,extension],source.userId);
 const boundary=changed-1n,coordinates=held.filter(row=>row.kaiUPulse&&BigInt(row.kaiUPulse)>=boundary).map(row=>row.kaiUPulse!);
 coordinates.push(boundary.toString(),changed.toString());
 // Every newly admitted event gets its exact before/after edge, even if it
 // falls between the retained display grid coordinates.
 for(const row of [...source.movements,...source.lawfulValues]){const at=BigInt(row.kaiUPulse);if(at>=changed&&at<=BigInt(end))coordinates.push((at-1n).toString(),at.toString());}
 for(const object of [...(retained.chartSource?.objects??[]),...source.objects])for(const interval of object.intervals)for(const edge of [interval.fromKaiUPulse,interval.toKaiUPulse])if(edge!==null){const at=BigInt(edge);if(at>=changed&&at<=BigInt(end))coordinates.push((at-1n).toString(),at.toString());}
 return mergeWalletPoints([held.filter(row=>row.kaiUPulse&&BigInt(row.kaiUPulse)<boundary),projectCompositeWalletCoordinates(source,coordinates),extension],source.userId);
}
export function compositeWalletObservation(value:WalletObservation,source:CompositeWalletSource,retained?:WalletObservation):WalletObservation|null{
 if(protectedFrame(value)||source.userId!==value.wallet.userId)return null;
 try{const point=projectCompositeWalletAt(source,source.throughKaiUPulse);
  if(!(['totalUsdCents','settlementUsdCents','reserveUsdCents','balancePhiMicro'] as const).every(field=>value.wallet[field]===point[field]))return null;
  if(retained&&(protectedFrame(retained)||retained.wallet.userId!==value.wallet.userId))return null;
  const history=retained?.historyBasis?.kind==='portfolio-model-v129'&&retained.history?.length ? mergeWalletPoints([reconciledHistory(source,retained),[point]],value.wallet.userId) : projectCompositeWalletHistory(source);
  return {...value,observedAt:point.at,history,chartSource:source,historyBasis:{schema:'bank.account-history-display.v1',kind:'portfolio-model-v129',startKaiUPulse:history[0].kaiUPulse!,endKaiUPulse:point.kaiUPulse!,balancePhiMicro:point.balancePhiMicro,reserveUsdCents:point.reserveUsdCents}};
 }catch{return null;}
}
/** Local pulse advancement never replays the held past or needs a network quote. */
export function advanceCompositeWalletObservation(value:WalletObservation,kaiUPulse:string):WalletObservation|null{
 if(protectedFrame(value)||value.historyBasis?.kind!=='portfolio-model-v129'||!value.chartSource||!/^\d{1,30}$/.test(kaiUPulse)||BigInt(kaiUPulse)<=BigInt(value.historyBasis.endKaiUPulse))return null;
 const source={...value.chartSource,throughKaiUPulse:kaiUPulse};
 try{const point=projectCompositeWalletAt(source,kaiUPulse),gap=BigInt(kaiUPulse)-BigInt(value.historyBasis.endKaiUPulse),history=gap<=2_000_000n?mergeWalletPoints([value.history??[],[point]],value.wallet.userId):mergeWalletPoints([value.history??[],projectCompositeWalletExtension(source,value.historyBasis.endKaiUPulse)],value.wallet.userId);
  return {...value,wallet:{...value.wallet,totalUsdCents:point.totalUsdCents,settlementUsdCents:point.settlementUsdCents,reserveUsdCents:point.reserveUsdCents,balancePhiMicro:point.balancePhiMicro},observedAt:walletPointTime(kaiUPulse),history,chartSource:source,historyBasis:{...value.historyBasis,endKaiUPulse:kaiUPulse,balancePhiMicro:point.balancePhiMicro,reserveUsdCents:point.reserveUsdCents}};
 }catch{return null;}
}
/** An ordinary authenticated quote can confirm this same source without
 * downloading or recomputing its held historical samples. */
export function reconcileCompositeWalletObservation(previous:WalletObservation,wallet:WalletObservation['wallet'],kaiUPulse:string):WalletObservation|null{
 if(!previous.chartSource||previous.wallet.userId!==wallet.userId||protectedFrame(previous))return null;
 if(!/^\d{1,30}$/.test(kaiUPulse))return null;
 if(previous.historyBasis?.endKaiUPulse&&BigInt(kaiUPulse)<BigInt(previous.historyBasis.endKaiUPulse)){
  try{const point=projectCompositeWalletAt(previous.chartSource,kaiUPulse);return (['totalUsdCents','settlementUsdCents','reserveUsdCents','balancePhiMicro'] as const).every(field=>point[field]===wallet[field])?previous:null;}catch{return null;}
 }
 const next=kaiUPulse===previous.historyBasis?.endKaiUPulse?previous:advanceCompositeWalletObservation(previous,kaiUPulse);
 if(!next||!(['totalUsdCents','settlementUsdCents','reserveUsdCents','balancePhiMicro'] as const).every(field=>next.wallet[field]===wallet[field]))return null;
 return {...next,wallet};
}
