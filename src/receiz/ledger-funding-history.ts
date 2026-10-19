import {readWalletFundingAttribution,walletFundingTimeKey,type WalletFundingAttribution} from './ledger-wallet-fifo';
export type WalletFundingHistory={viaSourceId:string;parent:WalletFundingAttribution}[];
/** Existing transfer/note foreign keys connect parent transactions. This is
 * their full funding basis, distinct from the selected debit's FIFO slices.
 * Reject disconnected or cyclic graphs; no amount/actor/time-neighbor joins. */
export function readWalletFundingHistory(raw:unknown,root:WalletFundingAttribution|undefined):WalletFundingHistory|undefined{
 if(!root||!Array.isArray(raw)||!raw.length||raw.length>1000)return;
 const sources=new Map(root.parts.flatMap(part=>part.sources.map(source=>[source.sourceId,source]as const))),used=new Set<string>(),debits=new Set([root.walletDebitId]),out:WalletFundingHistory=[];
 for(const value of raw){const row=value as {viaSourceId?:unknown;parent?:unknown}|null;if(!row||typeof row.viaSourceId!=='string'||used.has(row.viaSourceId))return;const source=sources.get(row.viaSourceId),parent=readWalletFundingAttribution(row.parent);if(!source||!parent||parent.walletDebitId===root.walletDebitId||(!source.transferId||source.transferId!==parent.transferId)&&(!source.noteId||source.noteId!==parent.noteId)||walletFundingTimeKey(parent.occurredAt)!>walletFundingTimeKey(source.occurredAt)!||source.creditPhiMicro!==undefined&&parent.amountPhiMicro!==source.creditPhiMicro)return;used.add(row.viaSourceId);out.push({viaSourceId:row.viaSourceId,parent});
  if(debits.has(parent.walletDebitId))return;debits.add(parent.walletDebitId);for(const part of parent.parts)for(const next of part.sources){const held=sources.get(next.sourceId);if(held&&(held.occurredAt!==next.occurredAt||held.transferId!==next.transferId||held.noteId!==next.noteId||held.creditPhiMicro!==next.creditPhiMicro))return;sources.set(next.sourceId,next);}
 }
 return out;
}
/** Traverse already calculated originals only. No reads, hashing or valuation. */
export function linkWalletFundingHistory(root:WalletFundingAttribution,transfers:ReadonlyMap<string,WalletFundingAttribution>,notes:ReadonlyMap<string,WalletFundingAttribution>):WalletFundingHistory|undefined{
 const out:WalletFundingHistory=[],seen=new Set<string>(),debits=new Set([root.walletDebitId]);
 const visit=(value:WalletFundingAttribution)=>{for(const part of value.parts)for(const source of part.sources){if(seen.has(source.sourceId))continue;seen.add(source.sourceId);const parent=source.transferId?transfers.get(source.transferId):source.noteId?notes.get(source.noteId):undefined;if(!parent||debits.has(parent.walletDebitId))continue;debits.add(parent.walletDebitId);out.push({viaSourceId:source.sourceId,parent});if(out.length>1000)throw Error('FUNDING_HISTORY_CAPACITY');visit(parent);}};
 try{visit(root);return readWalletFundingHistory(out,root);}catch{return;}
}
