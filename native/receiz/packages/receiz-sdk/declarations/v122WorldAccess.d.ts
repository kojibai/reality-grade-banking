export type ReceizWorldAccessActionV122 = "grant" | "revoke" | "open" | "close";
export type ReceizWorldAccessAppendV122 = Readonly<{
    schema: "receiz.world.access-append.v122";
    worldId: string;
    subjectId: string;
    action: ReceizWorldAccessActionV122;
    expectedAccessHead: string | null;
    acceptedAccessHead: string;
    authorityDigest: string;
    acceptedAtKai: number;
    appendDigest: string;
}>;
export declare function planReceizWorldAccessAppendV122(input: Readonly<{
    worldId: string;
    subjectId: string;
    action: ReceizWorldAccessActionV122;
    expectedAccessHead: string | null;
    authorityDigest: string;
    acceptedAtKai: number;
}>): Promise<ReceizWorldAccessAppendV122>;
export declare function validateReceizWorldAccessAppendV122(value: ReceizWorldAccessAppendV122): Promise<boolean>;
//# sourceMappingURL=v122WorldAccess.d.ts.map