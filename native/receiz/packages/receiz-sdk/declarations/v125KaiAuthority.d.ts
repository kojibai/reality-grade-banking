import { type ReceizKaiSealedUpulseMoment } from "./v124Kai.js";
export declare const RECEIZ_KKS_V1_VERSION: "KKSv1.0";
export declare const RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA: "receiz.kks-v1.proof-coordinate.v1";
export declare const RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA: "receiz.kaisigil.temporal-proof.v1";
export declare const RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA: "receiz.kaisigil.temporal-payload.v1";
export declare const RECEIZ_KAI_SIGIL_GROTH16_SCHEMA: "receiz.kaisigil.groth16-poseidon.v1";
export declare const RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID: "sha256:7889fc795b72acb774d72c86bb5c09cf726dcffdbb95c9c7b8ffb6337fbf2b21";
export type ReceizKksV1CoordinateSource = "live-monotonic-frequency-from-genesis" | "sealed-carried-coordinate";
export type ReceizKaiSigilTemporalPayloadV1 = Readonly<{
    schema: typeof RECEIZ_KAI_SIGIL_TEMPORAL_PAYLOAD_SCHEMA;
    kksVersion: typeof RECEIZ_KKS_V1_VERSION;
    kaiPulse: string;
    kaiUpulse: string;
    source: ReceizKksV1CoordinateSource;
    beat: number;
    stepIndex: number;
    weekday: ReceizKaiSealedUpulseMoment["weekday"];
    chakraDay: ReceizKaiSealedUpulseMoment["chakraDay"];
    previousKaiSigilProofHead: string | null;
}>;
export type ReceizKaiSigilGroth16ProofV1 = Readonly<{
    schema: typeof RECEIZ_KAI_SIGIL_GROTH16_SCHEMA;
    verificationKeyId: typeof RECEIZ_KAI_SIGIL_VERIFICATION_KEY_ID;
    proof: Readonly<{
        pi_a: readonly [string, string, string];
        pi_b: readonly [
            readonly [string, string],
            readonly [string, string],
            readonly [string, string]
        ];
        pi_c: readonly [string, string, string];
        protocol: "groth16";
        curve: "bn128";
    }>;
    publicSignals: readonly [string, string];
}>;
export type ReceizKaiSigilTemporalProofV1 = Readonly<{
    schema: typeof RECEIZ_KAI_SIGIL_TEMPORAL_PROOF_SCHEMA;
    payload: ReceizKaiSigilTemporalPayloadV1;
    payloadHashBlake3: string;
    zkPoseidonHash: string;
    groth16: ReceizKaiSigilGroth16ProofV1;
    proofHead: string;
}>;
export type ReceizKksV1ProofCoordinate = Readonly<{
    schema: typeof RECEIZ_KKS_V1_PROOF_COORDINATE_SCHEMA;
    kksVersion: typeof RECEIZ_KKS_V1_VERSION;
    kaiPulse: string;
    kaiUpulse: string;
    source: ReceizKksV1CoordinateSource;
    kaiSigil: ReceizKaiSigilTemporalProofV1;
    authority: Readonly<{
        temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
        intrinsicProof: "kaisigil-blake3-poseidon-groth16";
        causalOrder: "verified-previous-head-then-strictly-greater-kai-upulse";
        chronosRole: "descriptive-projection-only";
        createdAtAuthority: false;
        networkRequired: false;
    }>;
}>;
export type ReceizKaiSigilProofFactoryV1 = (input: Readonly<{
    payload: ReceizKaiSigilTemporalPayloadV1;
    payloadHashBlake3: string;
    secret: string;
    zkPoseidonHash: string;
}>) => Promise<Readonly<{
    proof: ReceizKaiSigilGroth16ProofV1["proof"];
    publicSignals: readonly [string, string];
}>>;
export type ReceizKksV1AdmissionContext = Readonly<{
    expectedPreviousKaiSigilProofHead?: string | null;
    minimumExclusiveKaiUpulse?: string;
    maximumInclusiveKaiUpulse?: string;
}>;
export declare function admitReceizKksV1ProofCoordinate(input: unknown, context?: ReceizKksV1AdmissionContext): Promise<ReceizKksV1ProofCoordinate>;
/**
 * Samples one exact local KKS coordinate and seals it through the existing
 * KaiSigil BLAKE3 -> Poseidon -> Groth16 proof primitive supplied by `prove`.
 */
export declare function createReceizKksV1LiveProofCoordinate(args: Readonly<{
    prove: ReceizKaiSigilProofFactoryV1;
    previousKaiSigilProofHead?: string | null;
}>): Promise<ReceizKksV1ProofCoordinate>;
/** Project only an already verified, sealed KaiSigil coordinate. */
export declare function projectReceizKksV1SealedProofCoordinate(input: unknown, context?: ReceizKksV1AdmissionContext): Promise<Readonly<{
    coordinate: ReceizKksV1ProofCoordinate;
    moment: ReceizKaiSealedUpulseMoment;
}>>;
//# sourceMappingURL=v125KaiAuthority.d.ts.map