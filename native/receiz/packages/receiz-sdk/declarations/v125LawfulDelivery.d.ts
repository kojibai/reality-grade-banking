/** Transport evidence only. The enclosing sealed source remains authority. */
export type ReceizLawfulDeliveryV125 = Readonly<{
    status: "pre-write-rejection" | "verified-completion" | "recoverable";
    sourceStorage: "not-entered" | "retained" | "unknown";
    domainAppend: "not-entered" | "completed" | "rejected" | "unknown";
    retry: "same-source-and-key" | "do-not-rederive";
    /** Acknowledged/uncertain upload requests, not proof admission or full custody. */
    stagedSource?: Readonly<{
        retainedBlocks: number;
        uncertainBlocks: number;
    }>;
}>;
export declare function parseReceizLawfulDeliveryV125(value: unknown): ReceizLawfulDeliveryV125 | null;
export declare class ReceizLawfulDeliveryErrorV125 extends TypeError {
    readonly delivery: ReceizLawfulDeliveryV125;
    constructor(message: string, delivery: ReceizLawfulDeliveryV125);
}
export declare function unknownReceizLawfulDeliveryV125(value?: boolean): ReceizLawfulDeliveryV125;
//# sourceMappingURL=v125LawfulDelivery.d.ts.map