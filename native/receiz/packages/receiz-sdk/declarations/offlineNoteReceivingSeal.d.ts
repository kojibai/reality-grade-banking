import { type ReceizOfflineNoteDestinationV1 } from "./offlineNoteDestination.js";
import { type ReceizKeyFile } from "./identity.js";
declare const RECEIVING_SEAL_SCHEMA: "receiz.offline-note.receiving-seal.v2";
declare const INSTALLATION_KEY_ALGORITHM: "P-256";
type ReceivingSealBasis = Readonly<{
    schema: typeof RECEIVING_SEAL_SCHEMA;
    destination: ReceizOfflineNoteDestinationV1;
    installationKeyAlgorithm: typeof INSTALLATION_KEY_ALGORITHM;
    installationPublicKeyRawB64u: string;
    installationCommitment: string;
}>;
export type ReceizOfflineNoteReceivingSealV2 = ReceivingSealBasis & Readonly<{
    receivingSealDigest: string;
    receivingSealSignatureB64u: string;
}>;
export declare function createReceizOfflineNoteReceivingSeal(input: Readonly<{
    verifiedIdentityArtifactSha256: string;
    keyFile: ReceizKeyFile;
    passphrase?: string;
    installationPublicKeyRawB64u: string;
}>): Promise<ReceizOfflineNoteReceivingSealV2>;
export declare function verifyReceizOfflineNoteReceivingSeal(candidate: unknown): Promise<ReceizOfflineNoteReceivingSealV2>;
export {};
//# sourceMappingURL=offlineNoteReceivingSeal.d.ts.map