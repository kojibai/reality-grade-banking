/** Public routing facts only. Existing native execution reopens the accepted
 * asset head and funded offers before authorizing any transition. */
export type PublicNativeAssetBinding=Readonly<{id:string;issuanceSourceSha256:string;headSourceSha256:string;publicCertificateSha256:string}>;
export function publicNativeAssetBinding(value:unknown):PublicNativeAssetBinding|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return;const v=value as Record<string,unknown>,fields=['id','issuanceSourceSha256','headSourceSha256','publicCertificateSha256'];if(Object.keys(v).length!==4||!fields.every(key=>typeof v[key]==='string'&&/^[a-f0-9]{64}$/.test(v[key] as string)))return;return Object.freeze({...v}) as PublicNativeAssetBinding;
}
