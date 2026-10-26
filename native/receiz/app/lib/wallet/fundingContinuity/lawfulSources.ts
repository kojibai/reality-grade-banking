export type LawfulActionFundingSource=Readonly<{membershipId:string;artifactId:string;proofDigest:string;lawDigest:string;valueHeadDigest:string;admissionDigest:string;valuationKai:string;amountPhiMicro:string}>;
/** Exact original references beneath the existing amount projection. */
export function readLawfulActionFundingSources(raw:unknown,total:bigint):readonly LawfulActionFundingSource[]|undefined{
 if(!Array.isArray(raw)||raw.length>10000)return;
 const result:LawfulActionFundingSource[]=[],seen=new Set<string>();let sum=0n;
 for(const value of raw){if(!value||typeof value!=='object'||Array.isArray(value))return;const v=value as Record<string,unknown>,out:Record<string,string>={};
  for(const key of ['membershipId','artifactId','proofDigest','lawDigest','valueHeadDigest','admissionDigest']){if(typeof v[key]!=='string'||!/^[a-f0-9]{64}$/.test(v[key]))return;out[key]=v[key];}
  for(const key of ['valuationKai','amountPhiMicro']){if(typeof v[key]!=='string'||!/^(0|[1-9]\d{0,38})$/.test(v[key]))return;out[key]=v[key];}
  if(seen.has(out.membershipId)||BigInt(out.amountPhiMicro)===0n)return;seen.add(out.membershipId);sum+=BigInt(out.amountPhiMicro);result.push(Object.freeze(out) as LawfulActionFundingSource);
 }
 return sum===total?Object.freeze(result):undefined;
}
