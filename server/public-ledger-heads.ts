export type PublicLedgerHeads=Readonly<{
 actions:Readonly<{count:string;lastSeq:string;entryHash?:string|null}>;
 wallet:Readonly<{count:string;lastKaiUpulse:string|null}>;
 graph?:Readonly<{revision:string;count:string}>;
}>;

function fields(value:unknown,keys:readonly string[]):value is Record<string,unknown>{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
}
const counter=(value:unknown)=>typeof value==='string'&&/^(0|[1-9]\d{0,29})$/.test(value);
export function isPublicLedgerHeads(value:unknown):value is PublicLedgerHeads{
 if(!fields(value,['actions','wallet','graph']))return false;
 const {actions,wallet,graph}=value;
 return fields(actions,['count','lastSeq','entryHash'])&&counter(actions.count)&&counter(actions.lastSeq)
  &&(actions.entryHash===undefined||actions.entryHash===null||typeof actions.entryHash==='string'&&/^[a-f0-9]{64}$/.test(actions.entryHash))
  &&fields(wallet,['count','lastKaiUpulse'])&&counter(wallet.count)&&(wallet.lastKaiUpulse===null||counter(wallet.lastKaiUpulse))
  &&(graph===undefined||fields(graph,['revision','count'])&&typeof graph.revision==='string'&&graph.revision.length>0&&graph.revision.length<=256&&counter(graph.count));
}
export function sameActionHead(a:PublicLedgerHeads['actions'],b:PublicLedgerHeads['actions']){
 return a.count===b.count&&a.lastSeq===b.lastSeq&&(a.entryHash??null)===(b.entryHash??null);
}
export function sameWalletHead(a:PublicLedgerHeads['wallet'],b:PublicLedgerHeads['wallet']){
 return a.count===b.count&&a.lastKaiUpulse===b.lastKaiUpulse;
}
