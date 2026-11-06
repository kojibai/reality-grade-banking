/** Public display records derived only by server admission of the exact Original. */
export interface RegistryPublication {
 schema:'bank.registry.publication.v1';
 institutionId:string;
 name:string;
 scope:'Public integration contract';
 cases:number;
 artifactSha256:string;
 evidenceSha256:string;
 holderReceizId:string;
 implementationBuildSha256:string;
 officialProofUrl:string;
 acceptedAt:string;
 url:string;
}
export interface RegistryInstitutionState {
 institutionId:string;
 revision:number;
 current:RegistryPublication;
 /** Earlier accepted Originals, newest first. */
 history:RegistryPublication[];
}
export interface RegistryPublicResponse {
 schema:'bank.registry.public.v1';
 publishingAvailable:boolean;
 records:RegistryInstitutionState[];
}
export const REGISTRY_PROOF_PATH='/.well-known/reality-grade-banking/conformance.png';
export const REGISTRY_MAX_PROOF_BYTES=4*1024*1024;
export const REGISTRY_NATIVE_PART_BYTES=128*1024;
export const REGISTRY_NATIVE_INDEX_NAMESPACE='bankeiz.registry.conformance.v2';
export const REGISTRY_NATIVE_PART_NAMESPACE='bankeiz.registry.originals.v2';
export interface RegistryPublicationPlan {
 publication:RegistryPublication;
 originalBytes:number;
 partCount:number;
}
export interface RegistryOriginalPart {
 schema:'receiz.app.bank.registry.original-part.v1';
 institutionId:string;
 artifactSha256:string;
 index:number;
 count:number;
 originalBytes:number;
 publisherReceizId:string;
 publisherKeyId:string;
 transportNonce:string;
 bytesB64u:string;
}
export interface RegistryOriginalIndex {
 schema:'receiz.app.bank.registry.original-index.v1';
 publication:RegistryPublication;
 originalBytes:number;
 partCount:number;
 publisherReceizId:string;
 publisherKeyId:string;
 transportNonce:string;
 partIds:string[];
}
export const registryNativePartId=(institutionId:string,sha256:string,index:number,publisherKeyId:string,nonce:string)=>`bank.registry.part.v2:${institutionId}:${sha256}:${encodeURIComponent(publisherKeyId)}:${nonce}:${index}`;
export const registryNativeIndexId=(institutionId:string,sha256:string,publisherKeyId:string,nonce:string)=>`bank.registry.proof.v2:${institutionId}:${sha256}:${encodeURIComponent(publisherKeyId)}:${nonce}`;
export const registryNativeSourceUrl=(id:string)=>'https://bankeiz.com/registry/native/'+encodeURIComponent(id);
