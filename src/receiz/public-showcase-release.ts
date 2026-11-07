/** Selected public display metadata only. It grants no Source, proof,
 * ownership or financial authority. Canonical Source acceptance stays separate. */
export type PublicShowcaseRelease=Readonly<{schema:'receiz.native-public-showcase-release.v1';ownerUserId:string;username:string;artifactDigest:string;operationCount:number;revision:string}>;
export function readPublicShowcaseRelease(input:unknown,profile:{userId:string;username:string}):PublicShowcaseRelease|null{
 try{
  const value=typeof input==='string'?JSON.parse(input):input;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='artifactDigest,operationCount,ownerUserId,revision,schema,username'||value.schema!=='receiz.native-public-showcase-release.v1'||value.ownerUserId!==profile.userId||value.username!==profile.username||typeof value.ownerUserId!=='string'||!value.ownerUserId||value.ownerUserId.length>256||/[\x00-\x1f\x7f]/.test(value.ownerUserId)||!/^[a-z0-9_]{3,24}$/.test(value.username)||!/^[a-f0-9]{64}$/.test(value.artifactDigest)||!/^[a-f0-9]{64}$/.test(value.revision)||!Number.isSafeInteger(value.operationCount)||value.operationCount<0)return null;
  return Object.freeze({...value});
 }catch{return null;}
}
