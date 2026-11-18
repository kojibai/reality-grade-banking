import { type ReceizAdmissionAggregateSeed, type ReceizAdmissionStore, type ReceizAdmissionStoreInspection } from "./admissionStore.js";
import { type ReceizCapabilityContext, type ReceizSignedCapability, type ReceizVerifiedCapability } from "./capabilityAuthority.js";
import { type ReceizConstitutionJson, type ReceizConstitutionRegistry } from "./constitution.js";
export type ReceizAuthorityProfile = "artifact-local" | "global-shared" | "projection-only" | "simulation-only";
export type ReceizClaimedCommand = Readonly<{
    schema: "receiz.command.v1";
    commandId: string;
    command: string;
    domain: string;
    aggregateId: string;
    authorityProfile: ReceizAuthorityProfile;
    actor: Readonly<{
        id: string;
    }>;
    tenant: Readonly<{
        id: string;
    }> | null;
    capability: ReceizSignedCapability;
    expectedRevision: number;
    causalParents: readonly string[];
    registryDigest: string;
    idempotencyKey: string;
    input: ReceizConstitutionJson;
    maximumEffects: Readonly<Record<string, number>>;
}>;
export type ReceizAdmissionReceipt = Readonly<{
    schema: "receiz.admission.receipt.v1";
    commandId: string;
    commandDigest: string;
    registryDigest: string;
    capabilityDigest: string;
    authorityProfile: ReceizAuthorityProfile;
    actorId: string;
    tenantId: string | null;
    aggregateId: string;
    revision: number;
    priorHeadDigest: string | null;
    headDigest: string;
    events: readonly ReceizConstitutionJson[];
    effects: Readonly<Record<string, number>>;
    lawDecisionDigest: string;
    authority: Readonly<{
        admissionReceiptIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare function parseReceizClaimedCommand(value: unknown): Readonly<{
    ok: true;
    command: ReceizClaimedCommand;
}> | Readonly<{
    ok: false;
    status: "parse-rejection";
    code: "COMMAND_INVALID";
    issues: readonly string[];
}>;
export declare function isReceizAdmittedReceipt(value: unknown): value is ReceizAdmissionReceipt;
type Projection = {
    proposedState: ReceizConstitutionJson;
    events: readonly ReceizConstitutionJson[];
    effects: Readonly<Record<string, number>>;
    outboxIntents?: readonly ReceizConstitutionJson[];
};
type CapabilityVerification = Readonly<{
    ok: true;
    capability: ReceizVerifiedCapability;
}> | Readonly<{
    ok: false;
    code: string;
}>;
export type ReceizAdmissionResult = Readonly<{
    schema: "receiz.admission.result.v1";
    ok: false;
    status: "parse-rejection";
    code: "COMMAND_INVALID";
    issues: readonly string[];
}> | Readonly<{
    schema: "receiz.admission.result.v1";
    status: "policy-denial";
    code: string;
    denials: readonly unknown[];
}> | Readonly<{
    schema: "receiz.admission.result.v1";
    status: "conflict";
    code: string;
    expectedRevision?: number | undefined;
    expectedHead?: string | null | undefined;
}> | Readonly<{
    schema: "receiz.admission.result.v1";
    status: "admitted";
    receipt: ReceizAdmissionReceipt;
}>;
export declare function createReceizAdmissionEngine(options: {
    registry: ReceizConstitutionRegistry;
    capabilityVerifier: (capability: ReceizSignedCapability, context: ReceizCapabilityContext) => CapabilityVerification | Promise<CapabilityVerification>;
    consequenceProjector: (input: {
        command: ReceizClaimedCommand;
        previous: Record<string, ReceizConstitutionJson>;
    }) => Projection | Promise<Projection>;
    store?: ReceizAdmissionStore;
}): {
    execute: (value: unknown) => Promise<ReceizAdmissionResult>;
    seed(input: ReceizAdmissionAggregateSeed): Promise<void>;
    snapshot(aggregateId: string): Promise<Readonly<{
        revision: number;
        headDigest: string | null;
        state: ReceizConstitutionJson;
    }> | null>;
    inspectStore(): Promise<ReceizAdmissionStoreInspection>;
};
export {};
//# sourceMappingURL=commandAdmission.d.ts.map