import { ReceizError } from "./errors.js";
import type { ReceizProofHistory } from "./proofHistory.js";
export type PortableJson = null | boolean | number | string | PortableJson[] | {
    [key: string]: PortableJson;
};
export type ReceizPortableAssetType = "proof_object" | "sports_card" | "signal_card" | "wallet_note" | "reserve_funding" | "market_certificate" | "profile_original" | "document";
export type ReceizPortableAssetErrorCode = "continuity_payload_missing" | "continuity_media_unbound" | "continuity_ownership_missing" | "continuity_provenance_missing" | "continuity_settlement_missing" | "continuity_append_mismatch" | "continuity_schema_unsupported" | "continuity_identity_mismatch" | "continuity_namespace_mismatch" | "continuity_offline_verification_failed" | "continuity_round_trip_failed" | "profile_showcase_carrier_invalid" | "profile_showcase_identity_invalid";
export declare class ReceizPortableAssetError extends ReceizError<ReceizPortableAssetErrorCode> {
    constructor(code: ReceizPortableAssetErrorCode);
}
export type ReceizPortableAssetDocument = Readonly<{
    schema: "receiz.portable_asset.v1";
    assetType: ReceizPortableAssetType;
    payload: Readonly<{
        mimeType: string;
        bytesBase64Url: string;
        sha256: string;
    }>;
    ownership: Readonly<{
        ownerReceizId: string;
        custody: string;
        proofRef: string;
    }>;
    provenance: Readonly<{
        root: string;
        appends: readonly Readonly<Record<string, PortableJson>>[];
    }>;
    settlement: Readonly<Record<string, PortableJson>>;
    receizProofHistory?: Readonly<{
        schema: "receiz.carried-proof-history.v113";
        history: ReceizProofHistory;
        commitmentDigest: string;
    }>;
}>;
export type ReceizProfileShowcaseArtifactId = `profile-showcase:${string}`;
export type ReceizProfileShowcaseCarrier = Readonly<{
    schema: "receiz.profile-showcase-carrier.v114";
    artifactId: ReceizProfileShowcaseArtifactId;
    ownerReceizIdentity: string;
    "profile-showcase": Readonly<Record<string, PortableJson>>;
    receizProofHistory: Readonly<{
        schema: "receiz.carried-proof-history.v113";
        history: ReceizProofHistory;
        commitmentDigest: string;
    }>;
}>;
export type ReceizPortableOwnershipContinuity = Readonly<{
    artifactId: string;
    namespace: string;
    genesisOwnerReceizId: string;
    ownerReceizId: string;
    historyDigestSha256: string;
    appendCount: number;
}>;
export type ReceizPortableAssetInput = Readonly<{
    assetType: ReceizPortableAssetType;
    payload: Readonly<{
        mimeType: string;
        bytes: Uint8Array;
    }>;
    ownership: ReceizPortableAssetDocument["ownership"];
    provenance: ReceizPortableAssetDocument["provenance"];
    settlement: ReceizPortableAssetDocument["settlement"];
}>;
export declare const HEX64_RE: RegExp;
export declare const OWNER_RECEIZ_ID_RE: RegExp;
export declare const OWNERSHIP_APPEND_TYPE: "receiz.ownership.bearer-claim.v108";
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function canonicalize(value: unknown): string;
export declare function nonempty(value: unknown): string | null;
export declare function base64UrlDecode(value: string): Uint8Array;
export declare function sha256Hex(bytes: Uint8Array): Promise<string>;
export declare function parseReceizPortableAssetDocument(value: unknown): Promise<ReceizPortableAssetDocument>;
export declare function canonicalOwnerReceizId(value: unknown): string | null;
export declare function ownershipHistoryDigest(value: unknown): Promise<string>;
export declare function deriveReceizPortableOwnershipContinuity(document: ReceizPortableAssetDocument): Promise<ReceizPortableOwnershipContinuity>;
//# sourceMappingURL=portableAssetReader.d.ts.map