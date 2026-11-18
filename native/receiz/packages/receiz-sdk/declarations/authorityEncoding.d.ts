type AuthorityBytes = Uint8Array<ArrayBuffer>;
export declare const RECEIZ_AUTHORITY_DOMAINS: readonly ["artifact", "admission", "history", "receipt", "state", "plan", "capability", "operation", "confirmation", "identity", "transition", "namespace", "event", "registry", "idempotency", "effects", "command"];
export type ReceizAuthorityDomain = (typeof RECEIZ_AUTHORITY_DOMAINS)[number];
export declare function encodeReceizAuthority(domain: ReceizAuthorityDomain, schema: string, value: unknown): AuthorityBytes;
export declare class AuthorityDigestExecutionUnavailable extends TypeError {
    readonly retainedSnapshotBytes: number;
    readonly requestedBytes: number;
    readonly artifactValidity = "not-evaluated";
    readonly maximum: number;
    constructor(retainedSnapshotBytes: number, requestedBytes: number);
}
export declare function digestReceizAuthority(domain: ReceizAuthorityDomain, schema: string, value: unknown): Promise<string>;
export {};
//# sourceMappingURL=authorityEncoding.d.ts.map