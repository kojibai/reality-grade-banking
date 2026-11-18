import { type ReceizConstitutionJson } from "./constitution.js";
import type { ReceizEventDigest, ReceizNamespaceDigest, ReceizNamespaceId } from "./artifactTransition.js";
import type { ReceizVerifiedActorReference } from "./artifactAdmissionTypes.js";
import { type ReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
/** Exact coordinate carried beneath the enclosing sealed proof object. */
export declare const RECEIZ_EXACT_KKS_HISTORY_NAMESPACE = "receiz.kks-v1";
export declare function readReceizProofHistoryExactKksCoordinate(node: ReceizProofHistoryNode): Promise<ReceizKksV1ProofCoordinate | null>;
export type ReceizProofHistoryEvent = Readonly<{
    type: "state.append";
    state: ReceizConstitutionJson;
}> | Readonly<{
    type: "ownership.transition";
    fromOwnerReceizId: string | null;
    toOwnerReceizId: string;
}> | Readonly<{
    type: "lifecycle.terminal";
    terminal: "retired" | "revoked" | "settled" | "transferred-out";
}> | Readonly<{
    type: "profile-showcase.transition";
    actorEvidenceRoot?: string;
    parentShowcaseDigests: readonly string[];
    predecessorShowcaseDigest: string | null;
    showcaseBodyDigest: string;
    operationDigest: string;
    directOperations?: readonly ReceizConstitutionJson[];
    childAdmissionEvidenceRoots: readonly string[];
    registryDigest: string;
    kaiUpulse: string;
}>;
export type ReceizProofHistoryNode = Readonly<{
    schema: "receiz.proof-history-node.v1";
    nodeDigest: string;
    artifactId: string;
    registryDigest: string;
    parentDigests: readonly string[];
    kaiPulse: string;
    receiptDigest: string;
    receipt: ReceizConstitutionJson;
    event: ReceizProofHistoryEvent;
    namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
    authority: Readonly<{
        historyNodeIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizProofHistory = Readonly<{
    schema: "receiz.proof-history.v1";
    artifactId: string;
    registryDigest: string;
    rootDigest: string;
    headDigests: readonly string[];
    nodes: readonly ReceizProofHistoryNode[];
    currentOwnerReceizId: string | null;
    terminal: null | Readonly<{
        type: "retired" | "revoked" | "settled" | "transferred-out";
        nodeDigest: string;
    }>;
    historyDigest: string;
}>;
export type ReceizVerifiedProofHistory = ReceizProofHistory & Readonly<{
    verification: Readonly<{
        schema: "receiz.verified-proof-history.v112";
        evidenceRoots: readonly ReceizProofHistoryEvidenceRoot[];
        verificationDigest: string;
        authority: Readonly<{
            historyVerificationIsProofAuthority: false;
            strongerTruth: "sealed-receiz-proof-object";
        }>;
    }>;
}>;
export type ReceizProofHistoryEvidenceRoot = Readonly<{
    kind: "verified-artifact-admission" | "sealed-history-artifact";
    evidenceDigest: string;
    artifactDigest: string;
    verifierContextDigest: string;
}>;
export type ReceizProofHistoryReceiptVerifier = (receipt: ReceizConstitutionJson, receiptDigest: string) => boolean | Promise<boolean>;
export type ReceizArtifactTransitionHistoryAppendBasis = Readonly<{
    artifactId: string;
    registryDigest: string;
    parentDigest: string;
    kaiPulse: string;
    namespace: ReceizNamespaceId;
    namespaceLawVersion: string;
    namespaceReducerVersion: string;
    eventDigest: ReceizEventDigest;
    proposedNamespaceBodyDigest: ReceizNamespaceDigest;
    actor: ReceizVerifiedActorReference;
}>;
export declare function createReceizProofHistoryNode(input: {
    artifactId: string;
    registryDigest: string;
    parentDigests: readonly string[];
    kaiPulse: string;
    receipt: ReceizConstitutionJson;
    event: ReceizProofHistoryEvent;
    namespaceData: Readonly<Record<string, ReceizConstitutionJson>>;
}): Promise<ReceizProofHistoryNode>;
export declare function createReceizProfileShowcaseProofHistoryNode(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    registryDigest: string;
    parentDigest: string | null;
    parentDigests?: readonly string[];
    parentShowcaseDigests: readonly string[];
    predecessorShowcaseDigest: string | null;
    showcaseBodyDigest: string;
    operationDigest: string;
    directOperations: readonly ReceizConstitutionJson[];
    childAdmissionEvidenceRoots: readonly string[];
    kaiUpulse: string;
}>): Promise<ReceizProofHistoryNode>;
export type ReceizProfileShowcaseHistoryBinding = Readonly<{
    artifactId: `profile-showcase:${string}`;
    registryDigest: string;
    parentShowcaseDigests: readonly string[];
    predecessorShowcaseDigest: string | null;
    showcaseBodyDigest: string;
    operationDigest: string;
    directOperations: readonly ReceizConstitutionJson[];
    childAdmissionEvidenceRoots: readonly string[];
    kaiUpulse: string;
}>;
export declare function deriveReceizProfileShowcaseHistoryBinding(input: Readonly<{
    artifactId: `profile-showcase:${string}`;
    ownerReceizIdentity: string;
    showcase: Readonly<Record<string, unknown>>;
    registryDigest: string;
}>): Promise<ReceizProfileShowcaseHistoryBinding>;
export declare function createReceizArtifactTransitionProofHistoryAppendNode(input: Readonly<{
    basis: ReceizArtifactTransitionHistoryAppendBasis;
    event: ReceizConstitutionJson;
    kksCoordinate?: ReceizKksV1ProofCoordinate;
    predecessorArtifactDigest?: string;
}>): Promise<ReceizProofHistoryNode>;
export declare function normalizeReceizProofHistory(input: {
    artifactId: string;
    registryDigest: string;
    nodes: readonly ReceizProofHistoryNode[];
    verifyReceipt: ReceizProofHistoryReceiptVerifier;
}): Promise<ReceizProofHistory>;
export declare function mergeReceizProofHistoryPrefix(prefix: ReceizProofHistory, additions: readonly ReceizProofHistoryNode[], verifyReceipt: ReceizProofHistoryReceiptVerifier): Promise<ReceizProofHistory>;
/** Package-internal Task 7 authority path; intentionally omitted from index.ts. */
export declare function issueReceizVerifiedArtifactTransitionHistory(input: Readonly<{
    predecessor: unknown;
    appendNode: ReceizProofHistoryNode;
    artifactDigest: string;
    verifierContextDigest: string;
}>): Promise<ReceizVerifiedProofHistory>;
/** Testing observability only; omitted from the universal SDK entry point. */
export declare function readReceizArtifactTransitionHistoryIssuanceCount(): number;
export declare function isRuntimeVerifiedReceizProofHistory(value: unknown): value is ReceizVerifiedProofHistory;
export declare function verifyReceizProofHistory(value: unknown): Promise<ReceizVerifiedProofHistory>;
export declare function transportReceizProofHistory(history: ReceizVerifiedProofHistory): ReceizProofHistory;
/**
 * Reconstructs runtime verified history only from history carried inside the
 * exact sealed artifact currently being admitted. The new evidence root binds
 * the transported nodes to those exact enclosing bytes.
 */
export declare function verifyReceizCarriedProofHistory(input: Readonly<{
    history: unknown;
    artifactId: string;
    registryDigest: string;
    artifactDigest: string;
    verifierContextDigest: string;
}>): Promise<ReceizVerifiedProofHistory>;
/**
 * Derives and issues the genesis verified history directly from one
 * runtime-verified artifact admission; no caller-supplied history is trusted.
 */
export declare function deriveReceizVerifiedProofHistoryFromAdmission(admissionInput: unknown): Promise<ReceizVerifiedProofHistory>;
export declare function mergeReceizVerifiedProofHistories(prefix: ReceizVerifiedProofHistory, known: ReceizVerifiedProofHistory, verifyReceipt: ReceizProofHistoryReceiptVerifier): Promise<ReceizVerifiedProofHistory>;
//# sourceMappingURL=proofHistory.d.ts.map