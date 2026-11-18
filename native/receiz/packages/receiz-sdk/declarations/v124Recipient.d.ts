import { type ReceizAuthenticatedRuntimeReceiptV124, type ReceizAuthenticatedRuntimeRequestV124 } from "./v124AuthenticatedRuntime.js";
/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124RecipientRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
    wire: unknown;
    receipt: unknown;
}>>;
/** Source-internal factory options.  The audience is supplied by existing identity binding, not the public call. */
export type ReceizV124RecipientRuntimeOptions = Readonly<{
    audience: string;
}>;
export type ReceizPublicRecipientResolutionInputV124 = Readonly<{
    applicationId: string;
    authoritySessionHandle: string;
    expectedRequesterSubjectId: string;
    normalizedAlias: string;
    purpose: string;
    operationNonce: string;
}>;
export type ReceizPublicRecipientResolutionV124 = Readonly<{
    schema: "receiz.public-recipient-resolution.v124";
    status: "resolved";
    applicationId: string;
    normalizedAlias: string;
    purpose: string;
    operationNonce: string;
    display: Readonly<{
        displayName: string;
        imageUrl: string | null;
    }>;
    encryptedLocatorB64u: string;
    expiresAtKaiUPulse: number;
    locatorDigest: string;
    authenticatedReceipt: ReceizAuthenticatedRuntimeReceiptV124;
    authority: Readonly<{
        resolutionIsProofAuthority: false;
        resolutionIsIdentityAuthority: false;
        strongerTruth: "receiz-identity-artifact";
    }>;
}> | Readonly<{
    schema: "receiz.public-recipient-resolution.v124";
    status: "not-found-or-not-authorized";
}>;
/**
 * A non-authoritative, one-use reference to an encrypted recipient locator.
 * Recipient identity and destination-head custody remain inside the server's
 * sealed-publication admission boundary and are deliberately absent here.
 */
export type ReceizPublicRecipientLocatorReferenceV124 = Readonly<{
    schema: "receiz.public-recipient-locator-reference.v124";
    encryptedLocatorB64u: string;
    locatorDigest: string;
    purpose: string;
    operationNonce: string;
}>;
/** The one shared SDK/server normalization primitive for a public recipient alias. */
export declare function normalizeReceizPublicRecipientAliasV124(value: unknown): string;
export declare function createReceizPublicRecipientLocatorReferenceV124(value: unknown): Promise<ReceizPublicRecipientLocatorReferenceV124>;
export declare const validateReceizPublicRecipientLocatorReferenceV124: typeof createReceizPublicRecipientLocatorReferenceV124;
/**
 * Source-internal recipient client.  A caller-shaped fetch result can never become
 * recipient truth: only a runtime-admitted wire is projected, and safe failures are
 * intentionally coordinate-free.
 */
export declare function createReceizV124Recipient(remote: ReceizV124RecipientRemoteV124, options: ReceizV124RecipientRuntimeOptions): {
    resolvePublicRecipientV124: (value: ReceizPublicRecipientResolutionInputV124) => Promise<ReceizPublicRecipientResolutionV124>;
    resolvePublicRecipient: (value: ReceizPublicRecipientResolutionInputV124) => Promise<ReceizPublicRecipientResolutionV124>;
};
//# sourceMappingURL=v124Recipient.d.ts.map