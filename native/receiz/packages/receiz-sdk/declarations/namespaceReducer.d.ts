import { type ReceizConstitutionJson } from "./constitution.js";
import type { ReceizNamespaceDigest, ReceizNamespaceId } from "./artifactTransition.js";
export declare const RECEIZ_PROVENANCE_NAMESPACE_LAW_VERSION = "receiz.namespace.provenance-append.v112@1";
export declare const RECEIZ_PROVENANCE_NAMESPACE_REDUCER_VERSION = "receiz.namespace.provenance-append.reducer.v1";
export declare const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_LAW_VERSION = "receiz.namespace.profile-showcase-append.v114@1";
export declare const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REDUCER_VERSION = "receiz.namespace.profile-showcase.reducer.v1";
export declare const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_LAW_VERSION = "receiz.namespace.economy-showcase-append.v114@1";
export declare const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REDUCER_VERSION = "receiz.namespace.economy-showcase.reducer.v1";
export type ReceizNamespaceBodySnapshot = Readonly<{
    namespace: ReceizNamespaceId;
    bytes: Uint8Array;
    bodyDigest: ReceizNamespaceDigest;
}>;
export type ReceizNamespaceReduction = Readonly<{
    namespace: ReceizNamespaceId;
    namespaceLawVersion: string;
    namespaceReducerVersion: string;
    priorTarget: ReceizNamespaceBodySnapshot | null;
    proposedTargetBytes: Uint8Array;
    proposedTargetDigest: ReceizNamespaceDigest;
    preservedNamespaces: ReadonlyMap<string, ReceizNamespaceBodySnapshot>;
}>;
/**
 * Parses only the top-level object framing. Namespace values are never decoded
 * or reconstructed, so every captured body retains its exact admitted bytes.
 */
export declare function snapshotReceizNamespaceBodies(payloadBytes: Uint8Array): Promise<ReadonlyMap<string, ReceizNamespaceBodySnapshot>>;
/**
 * Rebuilds only the top-level namespace framing. Every non-target body is
 * copied from the reducer's exact admitted snapshot without parsing or
 * serialization.
 */
export declare function composeReceizNamespaceReductionPayload(input: Readonly<{
    originalPayloadBytes: Uint8Array;
    reduction: ReceizNamespaceReduction;
}>): Uint8Array;
export declare function reduceReceizNamespace(input: Readonly<{
    payloadBytes: Uint8Array;
    namespace: ReceizNamespaceId;
    namespaceLawVersion: string;
    namespaceReducerVersion: string;
    event: ReceizConstitutionJson;
}>): Promise<ReceizNamespaceReduction>;
//# sourceMappingURL=namespaceReducer.d.ts.map