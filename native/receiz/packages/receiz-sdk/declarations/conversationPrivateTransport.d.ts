import { type ReceizConversationParticipantBindingV1 } from "./conversationDomain.js";
import { type ReceizSubjectAccessKitV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";
import { type ReceizPrivateWorldEnvelopeV122 } from "./v122PrivateWorld.js";
export type ReceizConversationEpochSecretV1 = Readonly<{
    schema: "receiz.chat.epoch-secret.v1";
    conversationId: string;
    epoch: number;
    keyBytes: Uint8Array;
    keyDigest: string;
}>;
export type ReceizConversationEpochGrantBatchV1 = Readonly<{
    schema: "receiz.chat.epoch-grant-batch.v1";
    conversationId: string;
    epoch: number;
    batchIndex: number;
    recipientReceizIds: readonly string[];
    envelope: ReceizPrivateWorldEnvelopeV122;
    batchDigest: string;
}>;
export type ReceizConversationMessageCiphertextV1 = Readonly<{
    schema: "receiz.chat.message-ciphertext.v1";
    conversationId: string;
    epoch: number;
    messageId: string;
    senderReceizId: string;
    sealedOriginalDigest: string;
    nonceB64u: string;
    ciphertextB64u: string;
    aadDigest: string;
    ciphertextDigest: string;
    authority: Readonly<{
        ciphertextIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function createReceizConversationEpochSecretV1(input: Readonly<{
    conversationId: string;
    epoch: number;
}>): Promise<ReceizConversationEpochSecretV1>;
export declare function planReceizConversationEpochGrantBatchesV1(input: Readonly<{
    secret: ReceizConversationEpochSecretV1;
    recipients: readonly ReceizConversationParticipantBindingV1[];
    recipientBindings: readonly ReceizSubjectAccessPublicBindingV122[];
    maxRecipientsPerBatch: number;
    batchIndexOffset?: number;
}>): Promise<readonly ReceizConversationEpochGrantBatchV1[]>;
export declare function openReceizConversationEpochGrantV1(input: Readonly<{
    batch: ReceizConversationEpochGrantBatchV1;
    accessKit: ReceizSubjectAccessKitV122;
    edgeWrappingKey: Uint8Array;
    currentSubjectHead: string;
    currentAccessKeyHead: string;
}>): Promise<ReceizConversationEpochSecretV1>;
export declare function encryptReceizConversationMessageV1(input: Readonly<{
    secret: ReceizConversationEpochSecretV1;
    messageId: string;
    senderReceizId: string;
    sealedOriginalBytes: Uint8Array;
}>): Promise<ReceizConversationMessageCiphertextV1>;
export declare function decryptReceizConversationMessageV1(input: Readonly<{
    secret: ReceizConversationEpochSecretV1;
    ciphertext: ReceizConversationMessageCiphertextV1;
}>): Promise<Uint8Array>;
//# sourceMappingURL=conversationPrivateTransport.d.ts.map