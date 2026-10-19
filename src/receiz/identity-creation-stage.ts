export type IdentityCreationStage='proof-resources'|'device-signer'|'identity-seal'|'account-genesis'|'portable-identity'|'device-custody';
/** Diagnostics contain only a fixed stage and recognized error code, never
 * source bytes, private key material, an unlock phrase or server response text. */
export async function atIdentityCreationStage<T>(stage:IdentityCreationStage,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}
 catch(cause){
  const code=cause instanceof Error&&/^offline_(?:seal_(?:certificate_invalid|resources_invalid|enrollment_required|enrollment_failed:\d{3}|signature_failed|output_verification_failed|input_fields_invalid|input_invalid|identity_owner_mismatch)|identity_(?:private_passphrase_required|already_bound))$/.test(cause.message)?cause.message:
   cause instanceof Error&&['OperationError','NotSupportedError','SecurityError','QuotaExceededError','DataCloneError','InvalidStateError','AbortError','NotAllowedError','ConstraintError','VersionError'].includes(cause.name)?cause.name:'Error';
  throw new Error(`Your ID could not be created. Stage: ${stage} · ${code}`,{cause});
 }
}
