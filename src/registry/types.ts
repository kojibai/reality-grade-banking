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
