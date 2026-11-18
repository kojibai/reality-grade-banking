import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { type ReceizPortableAssetDocument } from "./portableAsset.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
export type ReceizV125EnclosingArtifactVerifierOptions = Readonly<{
    canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;
export type ReceizV125EnclosingArtifactBinding = Readonly<{
    artifactSha256: string;
    artifactPayloadSha256: string;
    proofObjectId: string;
    ownerReceizId: string;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
}>;
export type ReceizV125VerifiedArtifactPayload<T> = ReceizV125EnclosingArtifactBinding & Readonly<{
    projection: T;
}>;
export type ReceizV125VerifiedArtifactPayloadBytes = ReceizV125EnclosingArtifactBinding & Readonly<{
    payloadBytes: Uint8Array;
    payloadMimeType: string;
}>;
/** Internal custody only: a cloned projection cannot recreate canonical admission. */
export declare function readReceizV125BindingAdmission(binding: ReceizV125EnclosingArtifactBinding): ReceizVerifiedArtifactAdmission;
/**
 * Package-internal composition seam. The callback is invoked only after the
 * canonical v124 verifier and portable-state admission both retain custody of
 * the exact enclosing proof bytes.
 */
export declare function openVerifiedReceizV125ArtifactPayload<T>(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
    expectedPayloadMimeType: string;
    enclosingProofError: string;
    payloadError: string;
}>, parseVerifiedPayload: (payloadBytes: Uint8Array, binding: ReceizV125EnclosingArtifactBinding) => T | Promise<T>): Promise<ReceizV125VerifiedArtifactPayload<T>>;
export declare function openVerifiedReceizV125ArtifactPayloadBytes(input: Readonly<{
    artifact: ReceizPortableSealedArtifactV124;
    verifier: ReceizV125EnclosingArtifactVerifierOptions;
    enclosingProofError: string;
    payloadError: string;
}>): Promise<ReceizV125VerifiedArtifactPayloadBytes>;
//# sourceMappingURL=v125ArtifactBinding.d.ts.map