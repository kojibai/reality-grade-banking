import {loadReceiz} from './client';
import {readNativeAssetPublicArtifact} from './native-asset-public-reader.mjs';
/** A public snapshot describes an existing asset; it never admits a position,
 * authorizes an operation, or replaces a current offer. */
export async function openNativeAssetPublic(bytes:Uint8Array){
 const [opened,sdk]=await Promise.all([readNativeAssetPublicArtifact(bytes),loadReceiz()]);
 if(BigInt(opened.certificate.issuedAtKaiUPulse)>BigInt(sdk.receizKaiNow().uPulse))throw Error('BANK_NATIVE_ASSET_PUBLIC_UNVERIFIED');
 return opened;
}
