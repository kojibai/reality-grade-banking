export type ReceizGlobalCoordinationOperation = "admission.read-aggregate" | "admission.read-idempotency" | "admission.commit" | "admission.seed" | "admission.inspect" | "transition.stage" | "transition.resolve" | "transition.commit" | "reconciliation.plan" | "reconciliation.stage" | "reconciliation.commit" | "reconciliation.resolve-head" | "reconciliation.resolve-attempt" | "reconciliation.resolve-effect";
export type ReceizGlobalCoordinationTransport = (operation: ReceizGlobalCoordinationOperation, input: unknown) => Promise<unknown>;
export type ReceizRemoteTransportOptions = Readonly<{
    baseUrl: string;
    accessToken: string;
    fetchImpl?: typeof fetch;
}>;
export declare function createReceizGlobalCoordinationHttpTransport(options: ReceizRemoteTransportOptions): ReceizGlobalCoordinationTransport;
//# sourceMappingURL=globalCoordinationProtocol.d.ts.map