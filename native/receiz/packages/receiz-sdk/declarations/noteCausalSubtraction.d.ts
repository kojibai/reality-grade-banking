import { type ReceizVerifiedProofHistory } from "./proofHistory.js";
export type ReceizWholeNoteTransitionCandidate = Readonly<{
    noteId: string;
    artifactSha256: string;
    predecessorArtifactSha256: string;
    wholeValuePhiMicro: string;
    fromOwnerReceizId: string;
    toOwnerReceizId: string;
    acceptedAtKai: string;
    transitionNonce: string;
    history: ReceizVerifiedProofHistory;
}>;
export type ReceizWholeNoteZeroCapacityEvidence = Readonly<{
    artifactSha256: string;
    predecessorArtifactSha256: string;
    code: "SIBLING_OVERAGE_EVIDENCE";
    admittedValuePhiMicro: "0";
}>;
export type ReceizWholeNoteInvalidEvidence = Readonly<{
    artifactSha256: string;
    code: "TRANSITION_SHAPE_INVALID" | "TRANSITION_HISTORY_BINDING_INVALID" | "DUPLICATE_ARTIFACT_CONFLICT" | "PREDECESSOR_NOT_ADMITTED";
}>;
export type ReceizWholeNoteCapacityProjection = Readonly<{
    noteId: string;
    wholeValuePhiMicro: string;
    activeHeadArtifactSha256: string;
    admittedLineageArtifactSha256: readonly string[];
    zeroCapacityEvidence: readonly ReceizWholeNoteZeroCapacityEvidence[];
    invalidEvidence: readonly ReceizWholeNoteInvalidEvidence[];
    totalAdmittedValuePhiMicro: string;
}>;
export declare function reduceReceizWholeNoteCapacity(input: Readonly<{
    noteId: string;
    genesisArtifactSha256: string;
    wholeValuePhiMicro: string;
    transitions: readonly ReceizWholeNoteTransitionCandidate[];
}>): Promise<ReceizWholeNoteCapacityProjection>;
//# sourceMappingURL=noteCausalSubtraction.d.ts.map