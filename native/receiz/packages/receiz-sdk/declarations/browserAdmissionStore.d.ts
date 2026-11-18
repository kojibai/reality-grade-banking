import type { ReceizAdmissionStore, ReceizAdmissionUnitOfWork } from "./admissionStore.js";
export type ReceizBrowserAdmissionStoreOptions = Readonly<{
    databaseName: string;
    namespace: string;
}>;
type InternalOptions = ReceizBrowserAdmissionStoreOptions & Readonly<{
    maxRecordsPerTransaction?: number;
    failBeforeCommit?: (unit: ReceizAdmissionUnitOfWork) => boolean;
}>;
export declare function createReceizBrowserAdmissionStoreInternal(options: InternalOptions): ReceizAdmissionStore;
export declare function createReceizBrowserAdmissionStore(options: ReceizBrowserAdmissionStoreOptions): ReceizAdmissionStore;
export {};
//# sourceMappingURL=browserAdmissionStore.d.ts.map