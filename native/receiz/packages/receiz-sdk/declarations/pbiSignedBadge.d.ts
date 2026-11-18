export type ReceizPbiSignatureMode = "OWNER_SELF" | "INVITE_RECEIVER";
export type ReceizPngTextChunk = Readonly<{
    keyword: string;
    text: string;
}>;
export declare function deriveReceizPbiBadgeIdentity(input: {
    signerIdentity: string;
    pbiReceiptHash: string;
}): Promise<Readonly<{
    signerId: string;
    signerShort: string;
    userSigKey: string;
    pbiShort: string;
}>>;
export declare function buildReceizPbiSignedOverlaySvg(input: {
    width: number;
    userSigKey: string;
    signerShort: string;
    pbiShort: string;
}): string;
export declare function buildReceizPbiSignatureChunks(input: {
    signerId: string;
    pbiReceiptHash: string;
    claimHashHex: string;
    slug: string;
    code: string;
    pulse: string;
    createdAtIso: string;
    userSigKey: string;
    signerEmail?: string | null;
    signatureMode: ReceizPbiSignatureMode;
    inviteId?: string | null;
}): readonly ReceizPngTextChunk[];
//# sourceMappingURL=pbiSignedBadge.d.ts.map