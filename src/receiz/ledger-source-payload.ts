import {readLedgerCausalLineage,type LedgerCausalLineage} from './ledger-causal-source';
import {readLedgerProofHistory,type LedgerProofHistory} from './ledger-proof-history';
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
/** Decode a payload already opened by the canonical reader once. Only public
 * curated history leaves this function, never arbitrary source state. */
export function ledgerSourceHistoryFromPayload(bytes:Uint8Array,mime:string):{proofHistory?:LedgerProofHistory;causalLineage?:LedgerCausalLineage}{
 if(!/(?:application\/(?:json|[^;]+\+json))/.test(mime)||bytes.length>24*1024*1024)return {};
 try{const payload=object(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))),proofHistory=readLedgerProofHistory(object(payload.receizProofHistory).history??payload.proofHistory),causalLineage=readLedgerCausalLineage(payload);return {...(proofHistory?{proofHistory}:{}),...(causalLineage?{causalLineage}:{})};}catch{return {};}
}
