import {jcsCanonicalize} from '../../utils/jcs';
/** Exact immutable closure lengths plus maxima of CLOSED accepted successor
 * fields. No buffers or placeholder arrays proportional to a budget exist. */
export const MARKET_SHARE_EXECUTE_MAX_BYTES=2*1024*1024;
export const MARKET_SHARE_PRIVATE_MAX_BYTES=32*1024*1024;
export const MARKET_SHARE_METADATA_MAX_BYTES=65536+128;
export type NativeMarketShareCapacityMetrics=Readonly<{retainedSources:readonly Readonly<{sha256:string;byteLength:number}>[];newOriginalMaxBytes:readonly number[];futureFamilyCount:number;preparedMaxBytes:number;providerExportMaxBytes:number;creditMaxBytes:number;statementPayloadMaxBytes:number}>;
const size=(v:unknown)=>new TextEncoder().encode(jcsCanonicalize(v)).length,h='f'.repeat(64),b64=(n:number)=>Math.ceil(n*4/3),block=(n:number)=>b64(n)+size({sha256:h,exactBytesB64u:''})+1;
export function nativeMarketShareCapacityBudget(m:NativeMarketShareCapacityMetrics){
 if(!Array.isArray(m.retainedSources)||new Set(m.retainedSources.map(s=>s.sha256)).size!==m.retainedSources.length||m.retainedSources.some(s=>!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isSafeInteger(s.byteLength)||s.byteLength<=0)||!Array.isArray(m.newOriginalMaxBytes)||!m.newOriginalMaxBytes.length||m.newOriginalMaxBytes.length>6||![1,2].includes(m.futureFamilyCount)||![m.preparedMaxBytes,m.providerExportMaxBytes,m.creditMaxBytes,m.statementPayloadMaxBytes,...m.newOriginalMaxBytes].every(n=>Number.isSafeInteger(n)&&n>=0)||m.newOriginalMaxBytes.some(n=>n<=0||n>23*1024*1024))throw Error('NATIVE_MARKET_SHARE_CAPACITY_INVALID');
 const closure=m.retainedSources.reduce((sum,s)=>sum+block(s.byteLength),0),future=m.newOriginalMaxBytes.reduce((sum,n)=>sum+block(n),0),count=m.retainedSources.length+m.newOriginalMaxBytes.length;
 const familyDescriptor=size({schema:'bank.vault.market-source.v1',headSourceSha256:h,sources:[]})+count*(size(h)+1),requestDescriptor=size({schema:'bank.vault.market-result.v1',status:'committed',originalRequest:{schema:'receiz.vault.market-share-transfer.v1',applicationId:'r'.repeat(131),requestId:'r'.repeat(120),sourceAccountId:'r'.repeat(36),recipientAccountId:'r'.repeat(36),positionId:'r'.repeat(36),marketItemId:'\0'.repeat(240),sourceHeadSha256:h,quantityMicro:'9'.repeat(19)},sourceRef:h,witnessRef:h});
 const resultMaxBytes=closure+future+b64(m.newOriginalMaxBytes.at(-1)!)+requestDescriptor;
 const reservedSourceBytes=closure+future+m.futureFamilyCount*(block(familyDescriptor)+block(requestDescriptor))+m.preparedMaxBytes+size({lotId:h,sourceRef:h,witnessRef:h})+4;
 if(!Number.isSafeInteger(reservedSourceBytes)||resultMaxBytes>MARKET_SHARE_PRIVATE_MAX_BYTES||reservedSourceBytes>MARKET_SHARE_PRIVATE_MAX_BYTES)throw Error('NATIVE_MARKET_SHARE_SOURCE_CAPACITY');return{resultMaxBytes,reservedSourceBytes};
}
