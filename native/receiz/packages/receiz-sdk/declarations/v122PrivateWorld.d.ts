import { type ReceizSubjectAccessKitV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";
export type ReceizPrivateVisibilityV122 = Readonly<{
    mode: "private" | "invited";
    recipientSubjectIds: readonly string[];
}>;
export type ReceizPrivateRecipientWrapV122 = Readonly<{
    recipientSubjectId: string;
    recipientAccessKeyHead: string;
    ephemeralPublicKeyJwk: JsonWebKey;
    nonceB64u: string;
    wrappedContentKeyB64u: string;
    wrapDigest: string;
}>;
export type ReceizPrivateWorldEnvelopeV122 = Readonly<{
    schema: "receiz.world.private-envelope.v122";
    worldId: string;
    visibilityMode: "private" | "invited";
    ciphertextB64u: string;
    nonceB64u: string;
    aadDigest: string;
    payloadDigest: string;
    recipientWraps: readonly ReceizPrivateRecipientWrapV122[];
    envelopeDigest: string;
}>;
export declare function planReceizPrivateCommandV122(input: Readonly<{
    worldId: string;
    publicPayload: unknown;
    privatePayload: unknown;
    visibility: ReceizPrivateVisibilityV122;
    recipientBindings: readonly ReceizSubjectAccessPublicBindingV122[];
}>): Promise<Readonly<{
    publicCommand: Readonly<Record<string, unknown>>;
    privateEnvelope: ReceizPrivateWorldEnvelopeV122;
}>>;
export declare function validateReceizPrivateWorldEnvelopeV122(value: ReceizPrivateWorldEnvelopeV122): Promise<boolean>;
export declare function decryptReceizPrivateWorldEnvelopeV122(input: Readonly<{
    envelope: ReceizPrivateWorldEnvelopeV122;
    accessKit: ReceizSubjectAccessKitV122;
    edgeWrappingKey: Uint8Array;
    currentSubjectHead: string;
    currentAccessKeyHead: string;
}>): Promise<unknown>;
//# sourceMappingURL=v122PrivateWorld.d.ts.map