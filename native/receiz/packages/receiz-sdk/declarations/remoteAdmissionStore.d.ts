import type { ReceizAdmissionStore } from "./admissionStore.js";
import { type ReceizGlobalCoordinationTransport } from "./globalCoordinationProtocol.js";
export type ReceizRemoteAdmissionStoreOptions = Readonly<{
    namespace: string;
    accessToken: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
    transport?: ReceizGlobalCoordinationTransport;
}>;
export declare function createReceizRemoteAdmissionStore(options: ReceizRemoteAdmissionStoreOptions): ReceizAdmissionStore;
//# sourceMappingURL=remoteAdmissionStore.d.ts.map