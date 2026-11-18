export declare const RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA: "receiz.offline-reserve.funding-binding.v1";
export type ReceizOfflineReserveFundingBindingV1 = Readonly<{
    schema: typeof RECEIZ_OFFLINE_RESERVE_FUNDING_BINDING_SCHEMA;
    fundingProvider: "stripe";
    externalFundingEventId: string;
    checkoutSessionId: string;
    paymentIntentId: string;
    eventStatus: "funded";
    currency: "USD";
    accountUserId: string;
    receizKeyId: string;
    predecessorAccountPortableStateDigest: string;
    qualificationDigest: string;
    installationCommitment: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    fundedReservePhiMicro: string;
    fundedAtKai: string;
    fundingBindingDigest: string;
}>;
type FundingInput = Omit<ReceizOfflineReserveFundingBindingV1, "schema" | "eventStatus" | "currency" | "fundingBindingDigest">;
export declare function createReceizOfflineReserveFundingBinding(input: FundingInput): Promise<ReceizOfflineReserveFundingBindingV1>;
export declare function verifyReceizOfflineReserveFundingBinding(input: unknown): Promise<ReceizOfflineReserveFundingBindingV1>;
export declare function deriveReceizOfflineReserveFundingOwnerId(binding: Pick<ReceizOfflineReserveFundingBindingV1, "fundingBindingDigest">): string;
export {};
//# sourceMappingURL=offlineReserveFundingBinding.d.ts.map