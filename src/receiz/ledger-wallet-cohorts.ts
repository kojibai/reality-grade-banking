import {walletFundingTimeKey,type WalletFundingSource} from './ledger-wallet-fifo';
export type WalletProofMember={objectId:string;title:string;pulse?:string;createdAt:string;verifyUrl:string;anchorId?:string;basis:'owned'|'received';receivedSourceId?:string;firstSeenAt?:string};
export type WalletProofCohort={rule:'receiz-profile-rollup-v1-owned-and-received';basis:'reconstructed-membership';creditSourceId:string;computedAt:string;amountPhiMicro:string;members:WalletProofMember[]};
const rule='receiz-profile-rollup-v1-owned-and-received' as const;
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v);
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,38})$/.test(v);
function locator(value:unknown){
 if(!text(value,8192))return;
 try{const url=new URL(value,'https://receiz.com');if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash||![...url.searchParams.keys()].every(key=>['a','ms','c','p','tz','r'].includes(key)&&url.searchParams.getAll(key).length===1))return;
  const parts=url.pathname.match(/^\/v\/([^/]+)\/([^/]+)(?:\/(\d+))?\/?$/);if(!parts)return;
  const anchor=url.searchParams.get('a');if(anchor!==null&&!/^[a-f0-9]{8}$/i.test(anchor))return;
  return {url:url.href,slug:parts[1],code:parts[2],pulse:parts[3],anchor:anchor?.toLowerCase()};
 }catch{return;}
}
function member(raw:unknown,computedAt:bigint):WalletProofMember|undefined{
 const v=object(raw),time=walletFundingTimeKey(v.createdAt),where=locator(v.verifyUrl);
 if(!text(v.objectId,128)||!text(v.title,280)||v.pulse!==undefined&&!uint(v.pulse)||time===undefined||time>computedAt||!where||where.pulse!==v.pulse||!['owned','received'].includes(String(v.basis))||v.anchorId!==where.anchor)return;
 const result:WalletProofMember={objectId:v.objectId,title:v.title,...(where.pulse?{pulse:where.pulse}:{}),createdAt:String(v.createdAt),verifyUrl:where.url,basis:v.basis as 'owned'|'received',...(where.anchor?{anchorId:where.anchor}:{})};
 if(v.basis==='received'){const seen=walletFundingTimeKey(v.firstSeenAt);if(!text(v.receivedSourceId)||seen===undefined||seen>computedAt||!where.anchor)return;result.receivedSourceId=v.receivedSourceId;result.firstSeenAt=String(v.firstSeenAt);}
 return result;
}
const parsed=new WeakMap<object,WalletProofCohort[]|undefined>();
/** A display reconstruction of the v1 source cohort, never a newly admitted
 * payment allocation or a reconstructed per-object historical dollar quote. */
export function readWalletProofCohorts(raw:unknown):WalletProofCohort[]|undefined{
 if(!Array.isArray(raw)||!raw.length||raw.length>100)return;
 if(parsed.has(raw))return parsed.get(raw);
 const finish=(out:WalletProofCohort[]|undefined)=>{parsed.set(raw,out);if(out)parsed.set(out,out);return out;};
 const ids=new Set<string>(),out:WalletProofCohort[]=[];let size=0;
 for(const input of raw){const v=object(input),time=walletFundingTimeKey(v.computedAt);
  if(v.rule!==rule||v.basis!=='reconstructed-membership'||!text(v.creditSourceId)||ids.has(v.creditSourceId)||time===undefined||!uint(v.amountPhiMicro)||BigInt(v.amountPhiMicro)===0n||!Array.isArray(v.members)||!v.members.length||v.members.length>10000)return finish(undefined);
  size+=v.members.length;if(size>10000)return finish(undefined);ids.add(v.creditSourceId);
  const members:WalletProofMember[]=[],seen=new Set<string>();for(const input of v.members){const value=member(input,time);if(!value||seen.has(value.objectId))return finish(undefined);seen.add(value.objectId);members.push(value);}
  out.push({rule,basis:'reconstructed-membership',creditSourceId:v.creditSourceId,computedAt:String(v.computedAt),amountPhiMicro:v.amountPhiMicro,members});
 }return finish(out);
}
/** Exact credit ID and original native units bind the source list. The total
 * credit supports the chosen FIFO slice; individual members are not spend lots. */
export function walletProofCohortForSource(cohorts:WalletProofCohort[]|undefined,source:WalletFundingSource){
 return cohorts?.find(cohort=>cohort.creditSourceId===source.sourceId&&source.source==='profile_rollup_seed'&&source.creditPhiMicro===cohort.amountPhiMicro&&walletFundingTimeKey(cohort.computedAt)!<=walletFundingTimeKey(source.occurredAt)!&&cohort.members.every(member=>!member.pulse||!source.kaiUpulse||BigInt(member.pulse)<=BigInt(source.kaiUpulse)/1000000n));
}
/** Operator-time replay beneath the original v1 backfill's owned-plus-received
 * query. Its nullable database pulse column is not the canonical verify-path
 * pulse. A matching count alone never selects an original or fixes an anchor. */
export function reconstructWalletProofCohort(raw:unknown):WalletProofCohort|undefined{
 const s=object(raw),time=walletFundingTimeKey(s.computedAt);
 if(!text(s.creditId)||time===undefined||!uint(s.amountPhiMicro)||!Number.isSafeInteger(s.scanned)||Number(s.scanned)<1||Number(s.scanned)>10000||!Array.isArray(s.owned)||!Array.isArray(s.received)||s.owned.length+s.received.length>20000)return;
 const members=new Map<string,WalletProofMember>();
 const fromOriginal=(raw:unknown,basis:'owned'|'received',received?:Record<string,unknown>)=>{const row=object(raw),where=locator(row.verifyPath)??locator(row.verifyUrl);if(!where)return;
  const title=typeof row.title==='string'?row.title.replace(/\s+/g,' ').trim().slice(0,280):'';
  return member({objectId:row.id,title:text(title,280)?title:`Proof object ${String(row.id)}`,pulse:where.pulse,createdAt:row.createdAt,verifyUrl:where.url,anchorId:where.anchor,basis,...(received?{receivedSourceId:received.sourceId,firstSeenAt:received.firstSeenAt}:{})},time);};
 for(const raw of s.owned){const value=fromOriginal(raw,'owned');if(!value||members.has(value.objectId))return;members.set(value.objectId,value);}
 for(const raw of s.received){const r=object(raw),seen=walletFundingTimeKey(r.firstSeenAt);if(seen===undefined||seen>time||!Array.isArray(r.canonical)||r.canonical.length>1000)return;
  const matches=r.canonical.filter(raw=>{const c=object(raw),where=locator(c.verifyPath)??locator(c.verifyUrl);return where&&where.slug===r.slug&&where.code.toUpperCase()===String(r.code).toUpperCase()&&where.pulse===r.pulse&&where.anchor===r.anchorId;});
  if(matches.length>1)return;if(!matches.length)continue;
  const value=fromOriginal(matches[0],'received',r);if(!value)return;if(!members.has(value.objectId))members.set(value.objectId,value);
 }
 if(members.size!==s.scanned)return;
 return readWalletProofCohorts([{rule,basis:'reconstructed-membership',creditSourceId:s.creditId,computedAt:s.computedAt,amountPhiMicro:s.amountPhiMicro,members:[...members.values()].sort((a,b)=>walletFundingTimeKey(a.createdAt)!<walletFundingTimeKey(b.createdAt)!?-1:walletFundingTimeKey(a.createdAt)!>walletFundingTimeKey(b.createdAt)!?1:a.objectId.localeCompare(b.objectId))}])?.[0];
}
