import type { ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import type { ReceizCommitDomainId } from "./artifactTransition.js";
import { type ReceizGlobalCoordinationTransport } from "./globalCoordinationProtocol.js";
export type ReceizRemoteArtifactTransitionStoreOptions = Readonly<{
    namespace: string;
    commitDomain: ReceizCommitDomainId;
    accessToken: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    transport?: ReceizGlobalCoordinationTransport;
}>;
export declare function createReceizRemoteArtifactTransitionStore(options: ReceizRemoteArtifactTransitionStoreOptions): ReceizArtifactTransitionStore;
//# sourceMappingURL=remoteArtifactTransitionStore.d.ts.map