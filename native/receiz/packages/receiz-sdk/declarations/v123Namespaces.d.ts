import type { ReceizSubjectStateV122 } from "./v122Subjects.js";
export type ReceizSubjectNamespaceResolutionInputV123 = Readonly<{
    subjectId: string;
    atHead: string;
    names: readonly string[];
}>;
export type ReceizSubjectNamespaceResolutionV123 = Readonly<{
    schema: "receiz.subject.namespace-resolution.v123";
    subjectId: string;
    atHead: string;
    admittedProofDigest: string;
    ownershipHead: string;
    registryDigest: string;
    reducerDigest: string;
    namespaces: readonly Readonly<{
        name: string;
        found: boolean;
        exactBytesB64u: string | null;
        digest: string | null;
    }>[];
    authority: Readonly<{
        resolutionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
    resolutionDigest: string;
}>;
export type ReceizSubjectNamespaceResolutionFailureV123 = Readonly<{
    ok: false;
    code: "SUBJECT_HEAD_STALE" | "NOT_FOUND_OR_NOT_AUTHORIZED" | "NAMESPACE_INPUT_INVALID";
    writes: 0;
    currentHead?: string;
}>;
export type ReceizSubjectNamespaceResolutionResultV123 = ReceizSubjectNamespaceResolutionV123 | ReceizSubjectNamespaceResolutionFailureV123;
export declare function normalizeReceizNamespaceNamesV123(names: readonly string[]): readonly string[];
export declare function projectReceizSubjectNamespacesV123(state: Pick<ReceizSubjectStateV122, "subjectId" | "head" | "admittedProofDigest" | "ownershipHead" | "registryDigest" | "reducerDigest" | "opaqueNamespaces">, names: readonly string[]): Promise<ReceizSubjectNamespaceResolutionV123>;
export declare function validateReceizNamespaceResolutionV123(value: unknown, input: ReceizSubjectNamespaceResolutionInputV123): Promise<ReceizSubjectNamespaceResolutionResultV123>;
//# sourceMappingURL=v123Namespaces.d.ts.map