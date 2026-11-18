import { type ReceizIdentityKeyAlgorithm, type ReceizKeyFile } from "./identity.js";
declare const DESTINATION_SCHEMA: "receiz.offline-note.destination.v1";
declare const DESTINATION_PURPOSE: "offline-note-whole-transfer";
type ReceizOfflineNoteDestinationBasis = Readonly<{
    schema: typeof DESTINATION_SCHEMA;
    recipientIdentityArtifactSha256: string;
    recipientReceizId: string;
    recipientUsername: string | null;
    recipientIdentityKeyId: string;
    recipientIdentityAlgorithm: ReceizIdentityKeyAlgorithm;
    recipientPublicKeyRawB64u: string;
    destinationPurpose: typeof DESTINATION_PURPOSE;
}>;
export type ReceizOfflineNoteDestinationV1 = ReceizOfflineNoteDestinationBasis & Readonly<{
    destinationDigest: string;
    destinationSignatureB64u: string;
}>;
export declare function createReceizOfflineNoteDestination(input: Readonly<{
    verifiedIdentityArtifactSha256: string;
    keyFile: ReceizKeyFile;
    passphrase?: string;
}>): Promise<ReceizOfflineNoteDestinationV1>;
export declare function verifyReceizOfflineNoteDestination(candidate: unknown): Promise<ReceizOfflineNoteDestinationV1>;
export declare function resolveReceizOfflineNoteDestination(visibleUsernameOrReceizId: string, verifiedLocalDestinations: readonly ReceizOfflineNoteDestinationV1[]): ReceizOfflineNoteDestinationV1;
export {};
//# sourceMappingURL=offlineNoteDestination.d.ts.map