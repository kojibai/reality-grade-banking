import {loadReceiz} from './client';
import {BANK_APPLICATION_ID} from './config';
export const ACCOUNT_PRIVATE_SOURCE_MAX_BYTES=3*1024*1024;
/** Retain an explicitly chosen owner archive privately. The host reopens the
 * complete source against the accepted account head; this does not publish it. */
export async function retainAccountArtifactSource(input:{file:File;assertOpen():void;request(path:string,body:{archiveBytesB64u:string}):Promise<unknown>}):Promise<string>{
 input.assertOpen();
 if(!input.file.size||input.file.size>ACCOUNT_PRIVATE_SOURCE_MAX_BYTES)throw Error('ACCOUNT_PRIVATE_SOURCE_CAPACITY');
 const bytes=new Uint8Array(await input.file.arrayBuffer()),sdk=await loadReceiz();input.assertOpen();
 let identity=false;try{await sdk.readReceizIdentityArtifact(bytes);identity=true;}catch{/* Only the existing owner archive is accepted by the host. */}
 if(identity)throw Error('ACCOUNT_PRIVATE_SOURCE_IDENTITY_FORBIDDEN');
 const result=await input.request(`/api/connect/account-proof/sources?applicationId=${BANK_APPLICATION_ID}`,{archiveBytesB64u:sdk.receizBase64UrlEncode(bytes)});input.assertOpen();
 if(!result||typeof result!=='object'||Array.isArray(result)||Object.keys(result).sort().join()!=='schema,sourceSha256')throw Error('ACCOUNT_PRIVATE_SOURCE_UNVERIFIED');
 const r=result as {schema:unknown;sourceSha256:unknown};
 if(r.schema!=='bankeiz.account-private-source-retained.v1'||typeof r.sourceSha256!=='string'||r.sourceSha256!==await sdk.sha256ReceizBytes(bytes))throw Error('ACCOUNT_PRIVATE_SOURCE_UNVERIFIED');
 return r.sourceSha256;
}
