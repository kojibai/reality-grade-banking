import { type ReceizSubjectAccessKitV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";
import { type ReceizSubjectEdgeBundleV122, type ReceizSubjectEdgeBundleVerifierV122 } from "./v122EdgeBundle.js";
import { type ReceizSubjectAdmissionInputV122, type ReceizSubjectAdmissionResultV122, type ReceizSubjectStateV122 } from "./v122Subjects.js";
import { type ReceizSubjectNamespaceResolutionInputV123, type ReceizSubjectNamespaceResolutionResultV123 } from "./v123Namespaces.js";
export type ReceizV122RemoteRequest = <T>(path: string, options?: Readonly<{
    method?: string;
    body?: Record<string, unknown>;
}>) => Promise<T>;
export type ReceizRemoteSubjectsV122Options = Readonly<{
    request: ReceizV122RemoteRequest;
    hasAccessToken: () => boolean;
}>;
export type ReceizSubjectEdgeImportResultV122 = Readonly<{
    ok: true;
    state: ReceizSubjectStateV122;
}> | Readonly<{
    ok: false;
    code: string;
    writes: 0;
}>;
export type ReceizRemoteSubjectsV122 = Readonly<{
    admit(input: ReceizSubjectAdmissionInputV122): Promise<ReceizSubjectAdmissionResultV122>;
    state(subjectId: string): Promise<ReceizSubjectStateV122>;
    exportEdgeBundle(subjectId: string, verifier: ReceizSubjectEdgeBundleVerifierV122): Promise<ReceizSubjectEdgeBundleV122>;
    importEdgeBundle(bundle: ReceizSubjectEdgeBundleV122, verifier: ReceizSubjectEdgeBundleVerifierV122): Promise<ReceizSubjectEdgeImportResultV122>;
    accessBinding(subjectId: string): Promise<ReceizSubjectAccessPublicBindingV122>;
    publishAccessKey(input: Readonly<{
        publicBinding: ReceizSubjectAccessPublicBindingV122;
        expectedAccessKeyHead: string | null;
    }>): Promise<Readonly<{
        ok: true;
        state: ReceizSubjectStateV122;
        publicBinding: ReceizSubjectAccessPublicBindingV122;
    }> | Readonly<{
        ok: false;
        code: string;
        writes: 0;
    }>>;
    createAccessKey(input: Readonly<{
        subjectId: string;
        edgeWrappingKey: Uint8Array;
        accessKeyHead?: string;
    }>): Promise<Readonly<{
        accessKit: ReceizSubjectAccessKitV122;
        publicBinding: ReceizSubjectAccessPublicBindingV122;
        state: ReceizSubjectStateV122;
    }>>;
    resolveNamespaces(input: ReceizSubjectNamespaceResolutionInputV123): Promise<ReceizSubjectNamespaceResolutionResultV123>;
}>;
export declare function createReceizRemoteSubjectsV122(options: ReceizRemoteSubjectsV122Options): ReceizRemoteSubjectsV122;
//# sourceMappingURL=v122RemoteSubjects.d.ts.map