import type {NativeAssetPublicProjection} from './native-asset-holding-protocol';

export function readNativeAssetPublicArtifact(bytes: Uint8Array): Promise<{
  certificate: NativeAssetPublicProjection;
  artifactSha256: string;
}>;
