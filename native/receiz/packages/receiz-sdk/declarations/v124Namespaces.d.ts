import { type ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
import { type ReceizSubjectNamespaceResolutionV123 } from "./v123Namespaces.js";
/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124NamespacesRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
    wire: unknown;
    receipt: unknown;
}>>;
/** Source-internal factory options.  Application/audience are configured truth bindings, never caller selection. */
export type ReceizV124NamespacesRuntimeOptions = Readonly<{
    applicationId: string;
    audience: string;
}>;
export type ReceizResolveNamespacesInputV124 = Readonly<{
    subjectId: string;
    atHead: string;
    names: readonly string[];
    expectedAdmittedProofDigest: string;
    expectedOwnershipHead: string;
    expectedRegistryDigest: string;
    expectedReducerDigest: string;
}>;
/** This is the validated existing V123 namespace primitive, not a new namespace authority. */
export type ReceizValidatedNamespaceProjectionV124 = ReceizSubjectNamespaceResolutionV123;
/**
 * Source-internal client composition.  It never admits raw remote JSON: the runtime
 * receipt has to custody the frozen wire before the V123 proof projection is reused.
 */
export declare function createReceizV124Namespaces(remote: ReceizV124NamespacesRemoteV124, options: ReceizV124NamespacesRuntimeOptions): {
    resolveNamespacesV124: (value: ReceizResolveNamespacesInputV124) => Promise<ReceizValidatedNamespaceProjectionV124>;
};
//# sourceMappingURL=v124Namespaces.d.ts.map