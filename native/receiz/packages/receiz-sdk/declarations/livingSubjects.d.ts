import { type ReceizCompositeFibonacciState } from "./compositeProofKernel.js";
export declare const RECEIZ_LIVING_SUBJECT_VERSION: "120.0.0";
export declare const RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST: string;
export declare const RECEIZ_SUBJECT_NAMESPACE_NAMES: readonly ["identity", "canonicalState", "selfModel", "memory", "relationships", "inventory", "abilities", "condition", "worldPosition", "mandates", "eventHistory", "projections", "applicationNamespaces"];
export declare const RECEIZ_LIVING_SUBJECT_SCHEMAS: Readonly<{
    readonly subject: "receiz.subject.v1";
    readonly subjectMind: "receiz.subject.mind.v1";
    readonly subjectSelfModel: "receiz.subject.self_model.v1";
    readonly subjectMandate: "receiz.subject.mandate.v1";
    readonly subjectCapability: "receiz.subject.capability.v1";
    readonly subjectIntent: "receiz.subject.intent.v1";
    readonly subjectMemoryEvent: "receiz.subject.memory_event.v1";
    readonly subjectMemoryProjection: "receiz.subject.memory_projection.v1";
    readonly subjectRelationship: "receiz.subject.relationship.v1";
    readonly subjectInteractionPolicy: "receiz.subject.interaction_policy.v1";
    readonly subjectInventory: "receiz.subject.inventory.v1";
    readonly subjectTradeIntent: "receiz.subject.trade_intent.v1";
    readonly subjectTradeReceipt: "receiz.subject.trade_receipt.v1";
    readonly subjectRuntimeJob: "receiz.subject.runtime_job.v1";
    readonly subjectOwnershipTransition: "receiz.subject.ownership_transition.v1";
    readonly subjectProofBrain: "receiz.subject.proof_brain.v1";
    readonly subjectProofIndex: "receiz.subject.proof_index.v1";
    readonly subjectProofIndexSegment: "receiz.subject.proof_index_segment.v1";
    readonly subjectProofReference: "receiz.subject.proof_reference.v1";
    readonly subjectProofContext: "receiz.subject.proof_context.v1";
    readonly subjectProofRetrievalReceipt: "receiz.subject.proof_retrieval_receipt.v1";
    readonly worldCommand: "receiz.world.command.v1";
    readonly worldEvent: "receiz.world.event.v1";
    readonly worldReceipt: "receiz.world.receipt.v1";
    readonly worldCheckpoint: "receiz.world.checkpoint.v1";
    readonly worldTransaction: "receiz.world.transaction.v1";
    readonly bearerTransferPlan: "receiz.bearer.transfer_plan.v1";
    readonly bearerInstrument: "receiz.bearer.instrument.v1";
    readonly bearerClaim: "receiz.bearer.claim.v1";
    readonly bearerTransferReceipt: "receiz.bearer.transfer_receipt.v1";
}>;
export type ReceizLivingSubjectSchema = typeof RECEIZ_LIVING_SUBJECT_SCHEMAS[keyof typeof RECEIZ_LIVING_SUBJECT_SCHEMAS];
export type ReceizSubjectNamespaceName = typeof RECEIZ_SUBJECT_NAMESPACE_NAMES[number] | (string & {});
export type ReceizSubjectNamespaceBytesV1 = Readonly<Record<string, string>>;
export type ReceizSubjectResponseMode = "text" | "voice" | "performance";
export type ReceizSubjectMemoryType = "conversation" | "episodic-world" | "relationship" | "battle" | "discovery" | "ownership-care" | "inventory-trade";
export type ReceizSubjectV1 = Readonly<{
    schema: "receiz.subject.v1";
    subjectId: string;
    proofObjectId: string;
    subjectType: string;
    ownerReceizId: string;
    identityDigest: string;
    genesisDigest: string;
    createdAtKai: string;
    head: string;
    ownershipHead: string;
    currentOwnerReceizId: string;
    namespaces: ReceizSubjectNamespaceBytesV1;
}>;
export type ReceizSubjectArtifactV1 = Readonly<{
    schema: "receiz.subject.v1";
    subject: ReceizSubjectV1;
    exactBytesB64u: string;
    artifactDigest: string;
    registryDigest: string;
    reducerDigest: string;
    authority: Readonly<{
        artifactIsProofAuthority: true;
        modelOutputIsAuthority: false;
        indexIsAuthority: false;
    }>;
}>;
export type ReceizSubjectProofTextV1 = Readonly<{
    kind: "claim" | "long-form" | "conversation" | "event" | "relationship" | "inventory" | "other";
    text: string;
    sha256Hex: string;
}>;
export type ReceizSubjectPrimaryProofObjectV1 = Readonly<{
    schema: "receiz.subject.primary-proof-object.v1";
    subjectId: string;
    proofObjectId: string;
    eventIds: readonly string[];
    kai: string;
    objectDigest: string;
    exactBytesB64u: string;
    visibility: "public" | "private";
    text: readonly ReceizSubjectProofTextV1[];
    namespaceDigests: Readonly<Record<string, string>>;
}>;
export type ReceizSubjectProofReferenceV1 = Readonly<{
    schema: "receiz.subject.proof_reference.v1";
    subjectId: string;
    subjectHead: string;
    proofObjectId: string;
    objectDigest: string;
    kai: string;
    score: number;
    matchedTerms: readonly string[];
    eventIds: readonly string[];
    membership: Readonly<{
        objectOrdinal: number;
        objectMerkleRoot: string;
        indexRoot: string;
    }>;
}>;
export type ReceizSubjectProofPassageV1 = Readonly<{
    proofObjectId: string;
    objectDigest: string;
    textDigest: string;
    kind: ReceizSubjectProofTextV1["kind"];
    start: number;
    end: number;
    text: string;
}>;
export type ReceizSubjectProofBrainHeadV1 = Readonly<{
    schema: "receiz.subject.proof_brain.v1";
    subjectId: string;
    subjectDigest: string;
    subjectHead: string;
    historyHead: string;
    indexRoot: string;
    objectMerkleRoot: string;
    objectCount: string;
    operationCount: string;
    maximumKai: string;
    priorBrainHead: string | null;
    fibonacci: ReceizCompositeFibonacciState;
    registryDigest: string;
    reducerDigest: string;
    authority: Readonly<{
        brainHeadIsProofAuthority: false;
        indexIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export type ReceizSubjectProofRetrievalReceiptV1 = Readonly<{
    schema: "receiz.subject.proof_retrieval_receipt.v1";
    retrievalReceiptId: string;
    subjectId: string;
    subjectHead: string;
    historyHead: string;
    indexRoot: string;
    queryDigest: string;
    referenceDigests: readonly string[];
    primaryObjectDigests: readonly string[];
    registryDigest: string;
    reducerDigest: string;
    kai: string;
    authority: Readonly<{
        receiptIsProofAuthority: false;
        primaryObjectsRequired: true;
    }>;
}>;
export type ReceizSubjectProofContextV1 = Readonly<{
    schema: "receiz.subject.proof_context.v1";
    head: ReceizSubjectProofBrainHeadV1;
    references: readonly ReceizSubjectProofReferenceV1[];
    primaryObjects: readonly ReceizSubjectPrimaryProofObjectV1[];
    passages: readonly ReceizSubjectProofPassageV1[];
    receipt: ReceizSubjectProofRetrievalReceiptV1;
}>;
export type ReceizSubjectProofBrainStreamEvent = Readonly<{
    type: "proof_head";
    head: ReceizSubjectProofBrainHeadV1;
}> | Readonly<{
    type: "candidate_reference";
    reference: ReceizSubjectProofReferenceV1;
}> | Readonly<{
    type: "primary_object";
    object: ReceizSubjectPrimaryProofObjectV1;
}> | Readonly<{
    type: "primary_passage";
    passage: ReceizSubjectProofPassageV1;
}> | Readonly<{
    type: "context_ready";
    context: ReceizSubjectProofContextV1;
}>;
export type ReceizSubjectProofBrainSearchInput = Readonly<{
    query: string;
    atHead: string;
    limit?: number;
    cursor?: string;
    visibility?: "public" | "private" | "all";
    types?: readonly ReceizSubjectProofTextV1["kind"][];
}>;
export type ReceizSubjectProofBrainAppendInput = Readonly<{
    subjectId: string;
    subjectDigest: string;
    subjectHead: string;
    historyHead: string;
    primaryObject: ReceizSubjectPrimaryProofObjectV1;
}>;
export type ReceizSubjectProofBrainSnapshotV1 = Readonly<{
    schema: "receiz.subject.proof_brain_snapshot.v1";
    genesis: Readonly<{
        subjectId: string;
        subjectDigest: string;
        subjectHead: string;
        historyHead: string;
        maximumKai: string;
        registryDigest: string;
        reducerDigest: string;
    }>;
    appends: readonly ReceizSubjectProofBrainAppendInput[];
    snapshotDigest: string;
}>;
export declare function createReceizSubjectPrimaryProofObjectV1(input: Readonly<{
    subjectId: string;
    proofObjectId: string;
    eventIds?: readonly string[];
    kai: string;
    visibility?: "public" | "private";
    exactBytes: Uint8Array;
    text?: readonly Readonly<{
        kind: ReceizSubjectProofTextV1["kind"];
        text: string;
    }>[];
    namespaceDigests?: Readonly<Record<string, string>>;
}>): ReceizSubjectPrimaryProofObjectV1;
export declare function createReceizSubjectProofBrain(input: Readonly<{
    subjectId: string;
    subjectDigest: string;
    subjectHead: string;
    historyHead: string;
    maximumKai: string;
    registryDigest: string;
    reducerDigest: string;
}>): Readonly<{
    append: (appendInput: ReceizSubjectProofBrainAppendInput) => ReceizSubjectProofBrainHeadV1;
    head: () => ReceizSubjectProofBrainHeadV1;
    search: (searchInput: ReceizSubjectProofBrainSearchInput) => ReceizSubjectProofReferenceV1[];
    resolve: (references: readonly ReceizSubjectProofReferenceV1[]) => ReceizSubjectPrimaryProofObjectV1[];
    resolveContext: (request: Readonly<{
        atHead: string;
        references: readonly ReceizSubjectProofReferenceV1[];
    }>) => ReceizSubjectProofContextV1;
    context: (searchInput: ReceizSubjectProofBrainSearchInput) => ReceizSubjectProofContextV1;
    stream: (searchInput: ReceizSubjectProofBrainSearchInput) => AsyncGenerator<ReceizSubjectProofBrainStreamEvent>;
    objectCount: () => number;
    exactObject: (proofObjectId: string) => Readonly<{
        schema: "receiz.subject.primary-proof-object.v1";
        subjectId: string;
        proofObjectId: string;
        eventIds: readonly string[];
        kai: string;
        objectDigest: string;
        exactBytesB64u: string;
        visibility: "public" | "private";
        text: readonly ReceizSubjectProofTextV1[];
        namespaceDigests: Readonly<Record<string, string>>;
    }> | null;
    exactObjects: () => Readonly<{
        schema: "receiz.subject.primary-proof-object.v1";
        subjectId: string;
        proofObjectId: string;
        eventIds: readonly string[];
        kai: string;
        objectDigest: string;
        exactBytesB64u: string;
        visibility: "public" | "private";
        text: readonly ReceizSubjectProofTextV1[];
        namespaceDigests: Readonly<Record<string, string>>;
    }>[];
    snapshot: () => ReceizSubjectProofBrainSnapshotV1;
}>;
export type ReceizSubjectProofBrain = ReturnType<typeof createReceizSubjectProofBrain>;
export declare function restoreReceizSubjectProofBrain(snapshot: ReceizSubjectProofBrainSnapshotV1): ReceizSubjectProofBrain;
export type ReceizSubjectProofIndexSegmentV1 = Readonly<{
    schema: "receiz.subject.proof_index_segment.v1";
    subjectId: string;
    segmentOrdinal: string;
    firstObjectOrdinal: string;
    objectCount: string;
    minimumKai: string;
    maximumKai: string;
    objectRoot: string;
    lexiconRoot: string;
    segmentDigest: string;
    contentAddress: string;
}>;
export declare function createReceizSubjectProofIndexSegmentV1(input: Readonly<{
    subjectId: string;
    segmentOrdinal: number;
    firstObjectOrdinal: number;
    objectCount: number;
    minimumKai: string;
    maximumKai: string;
    objectRoot: string;
    lexiconRoot: string;
}>): ReceizSubjectProofIndexSegmentV1;
export declare function createReceizSubjectProofScaleCommitmentV1(input: Readonly<{
    subjectId: string;
    subjectDigest: string;
    subjectHead: string;
    historyHead: string;
    objectCount: number;
    maximumKai: string;
    registryDigest: string;
    reducerDigest: string;
    resolvePerfectSubtreeRoot: (level: number) => string;
    resolveArtifactDigest: (operationCount: number) => string;
}>): ReceizSubjectProofBrainHeadV1;
export declare function encodeReceizSubjectNamespaceBytes(value: unknown): string;
export declare function decodeReceizSubjectNamespaceBytes<T = unknown>(value: string): T;
export type ReceizSubjectIntentV1 = Readonly<{
    schema: "receiz.subject.intent.v1";
    speech?: string;
    proposedIntents: readonly Readonly<{
        kind: string;
        targetIds: readonly string[];
        reason: string;
        confidence: number;
        requiredCapabilities: readonly string[];
        observedHead: string;
    }>[];
    memoryCitations: readonly string[];
    performance?: Readonly<Record<string, unknown>>;
    modelAudit: Readonly<{
        provider: string;
        model: string;
        version: string;
        promptDigest: string;
        contextDigest: string;
        outputDigest: string;
        outputIsAuthority: false;
    }>;
}>;
export type ReceizSubjectTwinMessageInput = Readonly<{
    message: string;
    ownerReceizId: string;
    threadKey?: string;
    contextHead: string;
    expectedSubjectDigest: string;
    responseMode?: ReceizSubjectResponseMode;
    clientMessageId: string;
}>;
export type ReceizSubjectTwinResultV1 = Readonly<{
    schema: "receiz.subject.twin_result.v1";
    subjectId: string;
    subjectHead: string;
    spokenResponse: string;
    proposedIntent: ReceizSubjectIntentV1;
    observedFacts: readonly Readonly<{
        fact: string;
        eventIds: readonly string[];
        proofObjectIds: readonly string[];
    }>[];
    proofDerivedMemories: readonly Readonly<{
        memoryId: string;
        summary: string;
        eventIds: readonly string[];
    }>[];
    performance: Readonly<Record<string, unknown>> | null;
    proofContext: ReceizSubjectProofContextV1;
    worldEventIds: readonly [];
    authority: Readonly<{
        modelOutputIsWorldEvent: false;
        deterministicAdmissionRequired: true;
    }>;
}>;
export type ReceizSubjectTwinStreamEvent = ReceizSubjectProofBrainStreamEvent | Readonly<{
    type: "reply_delta";
    text: string;
}> | Readonly<{
    type: "audio_chunk";
    audioB64u: string;
    startMs: number;
    endMs: number;
    confidence: number;
    contextDigest: string;
}> | Readonly<{
    type: "viseme" | "gaze" | "blink" | "breath" | "emotion" | "gesture";
    timingMs: number;
    confidence: number;
    sourceStateDigest: string;
    contextDigest: string;
    reducedMotionCompatible: boolean;
    value: Readonly<Record<string, unknown>>;
}> | Readonly<{
    type: "intent_proposed";
    intent: ReceizSubjectIntentV1["proposedIntents"][number];
}> | Readonly<{
    type: "reply_done";
    result: ReceizSubjectTwinResultV1;
}>;
export type ReceizWorldCommandInputV1 = Readonly<{
    worldId: string;
    actorSubjectId: string;
    kind: string;
    targetIds?: readonly string[];
    payload: Readonly<Record<string, unknown>>;
    expectedHeads: Readonly<Record<string, string>>;
    expectedWorldHead: string;
    attemptId: string;
    idempotencyKey: string;
    mandateDigest?: string;
}>;
export type ReceizWorldCommandV1 = Readonly<{
    schema: "receiz.world.command.v1";
    commandId: string;
    commandDigest: string;
    input: ReceizWorldCommandInputV1;
}>;
export type ReceizWorldCommandPlanV1 = Readonly<{
    schema: "receiz.world.command_plan.v1";
    planId: string;
    planDigest: string;
    command: ReceizWorldCommandV1;
    priorHeads: Readonly<Record<string, string>>;
    worldHead: string;
    registryDigest: string;
    reducerDigest: string;
    writesOnFailure: 0;
}>;
export type ReceizWorldAuthorityV1 = Readonly<{
    actorSubjectId: string;
    ownerReceizId?: string;
    capabilityDigest?: string;
    mandateDigest?: string;
}>;
export type ReceizWorldTransactionAuthorityV1 = Readonly<{
    authorities: Readonly<Record<string, ReceizWorldAuthorityV1>>;
}>;
export type ReceizWorldEventV1 = Readonly<{
    schema: "receiz.world.event.v1";
    eventId: string;
    commandId: string;
    worldId: string;
    kind: string;
    actorSubjectId: string;
    participantSubjectIds: readonly string[];
    payload: Readonly<Record<string, unknown>>;
    causalParents: readonly string[];
    priorHeads: Readonly<Record<string, string>>;
    nextHeads: Readonly<Record<string, string>>;
    priorWorldHead: string;
    worldHead: string;
    mandateDigest?: string;
    kai: string;
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizWorldReceiptV1 = Readonly<{
    schema: "receiz.world.receipt.v1";
    receiptId: string;
    commandId: string;
    attemptId: string;
    eventIds: readonly string[];
    actorSubjectId: string;
    mandateDigest?: string;
    priorHeads: Readonly<Record<string, string>>;
    nextHeads: Readonly<Record<string, string>>;
    worldHead: string;
    reducerDigest: string;
    registryDigest: string;
    kai: string;
}>;
export type ReceizZeroWriteFailureV1 = Readonly<{
    ok: false;
    schema: "receiz.world.zero-write-failure.v1";
    code: string;
    message: string;
    commandId: string | null;
    attemptId: string | null;
    writes: 0;
    currentHeads: Readonly<Record<string, string>>;
    worldHead: string;
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizWorldExecutionResultV1 = Readonly<{
    ok: true;
    receipt: ReceizWorldReceiptV1;
    events: readonly ReceizWorldEventV1[];
}> | ReceizZeroWriteFailureV1;
export type ReceizWorldTransactionV1 = Readonly<{
    schema: "receiz.world.transaction.v1";
    transactionId: string;
    transactionDigest: string;
    worldId: string;
    participants: readonly string[];
    expectedHeads: Readonly<Record<string, string>>;
    commands: readonly ReceizWorldCommandV1[];
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizSubjectMandatePolicyV1 = Readonly<{
    allowedActions: readonly string[];
    allowedWorldRegions: readonly string[];
    allowedSubjectIds: readonly string[];
    allowedOwnerReceizIds: readonly string[];
    conversationPrivacy: "public" | "relationship" | "owner-private";
    battleParticipation: boolean;
    itemActions: readonly ("use" | "gift" | "trade")[];
    maximumItemValueMinor: string;
    maximumDailyValueMinor: string;
    approvalThresholdMinor: string;
    minimumRuntimeIntervalKai: string;
    maximumDailyRuns: number;
    publicMemory: boolean;
    privateMemory: boolean;
    expiresAtKai: string;
    modelProviderAllowlist: readonly string[];
    safetyPolicy: string;
    applicationScope: readonly string[];
    tenantScope: readonly string[];
}>;
export type ReceizSubjectMandateV1 = Readonly<{
    schema: "receiz.subject.mandate.v1";
    mandateId: string;
    subjectId: string;
    ownerReceizId: string;
    policy: ReceizSubjectMandatePolicyV1;
    mandateDigest: string;
    status: "planned" | "active" | "paused" | "revoked" | "expired";
    activatedCapabilityDigest: string | null;
    activatedAtKai: string | null;
    revokedAtKai: string | null;
}>;
export type ReceizSubjectMemoryEventV1 = Readonly<{
    schema: "receiz.subject.memory_event.v1";
    memoryId: string;
    subjectId: string;
    type: ReceizSubjectMemoryType;
    summary: string;
    eventIds: readonly string[];
    proofObjectIds: readonly string[];
    visibility: "public" | "private";
    head: string;
    kai: string;
}>;
export type ReceizSubjectMemoryProjectionV1 = Readonly<{
    schema: "receiz.subject.memory_projection.v1";
    subjectId: string;
    throughHead: string;
    memories: readonly ReceizSubjectMemoryEventV1[];
    projectionDigest: string;
    rebuildable: true;
}>;
export type ReceizSubjectRelationshipV1 = Readonly<{
    schema: "receiz.subject.relationship.v1";
    relationshipId: string;
    subjectIds: readonly [string, string];
    status: "proposed" | "active" | "declined" | "blocked";
    familiarity: number;
    trust: number;
    rivalry: number;
    affection: number;
    mentorship: number;
    visibility: "public" | "private";
    eventIds: readonly string[];
    head: string;
}>;
export type ReceizSubjectInventoryItemV1 = Readonly<{
    itemId: string;
    proofObjectId: string;
    ownerSubjectId: string;
    quantity: string;
    valueMinor: string;
    namespaceBytes: string;
}>;
export type ReceizSubjectInventoryV1 = Readonly<{
    schema: "receiz.subject.inventory.v1";
    subjectId: string;
    head: string;
    items: readonly ReceizSubjectInventoryItemV1[];
}>;
export type ReceizSubjectRuntimeTickInput = Readonly<{
    subjectId: string;
    mandateDigest: string;
    expectedHead: string;
    worldHead: string;
    runAfter: string;
    idempotencyKey: string;
}>;
export type ReceizSubjectRuntimeJobV1 = Readonly<{
    jobId: string;
    input: ReceizSubjectRuntimeTickInput;
    status: "queued" | "leased" | "completed" | "failed" | "cancelled" | "stale";
    leaseUntilKai: string | null;
    attemptCount: number;
    eventIds: readonly string[];
    failureCode: string | null;
}>;
export type ReceizBearerTransferPolicyV1 = Readonly<{
    recipientReceizId: string | null;
    openBearer: boolean;
    expiresAtKai: string;
    requiresRecipientAcceptance: boolean;
    priorOwnerConversationPolicy: "encrypted-evidence" | "inherited" | "excluded";
    inventoryDisposition: Readonly<Record<string, "transfer" | "retain" | "detach">>;
}>;
export type ReceizBearerTransferPlanV1 = Readonly<{
    schema: "receiz.bearer.transfer_plan.v1";
    transferId: string;
    transferDigest: string;
    subjectId: string;
    subjectDigest: string;
    expectedSubjectHead: string;
    expectedOwnershipHead: string;
    currentOwnerReceizId: string;
    policy: ReceizBearerTransferPolicyV1;
    policyDigest: string;
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizBearerInstrumentV1 = Readonly<{
    schema: "receiz.bearer.instrument.v1";
    plan: ReceizBearerTransferPlanV1;
    oneTimeClaimDigest: string;
    issuedAtKai: string;
    exactBytesB64u: string;
    artifactDigest: string;
    status: "issued" | "pending-acceptance" | "claimed" | "cancelled" | "expired";
}>;
export type ReceizBearerTransferReceiptV1 = Readonly<{
    schema: "receiz.bearer.transfer_receipt.v1";
    receiptId: string;
    transferId: string;
    instrumentDigest: string;
    subjectId: string;
    identityDigest: string;
    priorOwnerReceizId: string;
    nextOwnerReceizId: string;
    priorSubjectHead: string;
    nextSubjectHead: string;
    priorOwnershipHead: string;
    nextOwnershipHead: string;
    eventIds: readonly string[];
    revokedMandateDigests: readonly string[];
    revokedCapabilityDigests: readonly string[];
    cancelledRuntimeJobIds: readonly string[];
    inventoryDispositionDigest: string;
    memoryPolicyDigest: string;
    sealedArtifact: ReceizSubjectArtifactV1;
    kai: string;
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizLivingSubjectModel = (input: Readonly<{
    subject: ReceizSubjectV1;
    message: ReceizSubjectTwinMessageInput;
    proofContext: ReceizSubjectProofContextV1;
}>) => Promise<Readonly<{
    provider: string;
    model: string;
    version: string;
    speech: string;
    proposedIntents?: ReceizSubjectIntentV1["proposedIntents"];
    performance?: Readonly<Record<string, unknown>>;
}>>;
export type ReceizSubjectMindArtifactV1 = Readonly<{
    schema: "receiz.subject.mind.v1";
    subjectArtifact: ReceizSubjectArtifactV1;
    brainHead: ReceizSubjectProofBrainHeadV1;
    portableWindow: readonly ReceizSubjectPrimaryProofObjectV1[];
    completeHistory: Readonly<{
        objectCount: string;
        objectMerkleRoot: string;
        indexRoot: string;
        contentAddress: string;
        primaryObjectsRequiredForReasoning: true;
    }>;
    publicMemoryIds: readonly string[];
    privateMemoryIds: readonly string[];
    priorMindHead: string | null;
    mindDigest: string;
    exactBytesB64u: string;
    registryDigest: string;
    reducerDigest: string;
}>;
export type ReceizSubjectCapabilityV1 = Readonly<{
    schema: "receiz.subject.capability.v1";
    subjectId: string;
    receizId: string;
    actions: readonly string[];
    expiresAtKai: string;
    capabilityDigest: string;
}>;
export type ReceizSubjectAdmissionInputV1 = Readonly<{
    subjectId: string;
    proofObjectId: string;
    subjectType: string;
    ownerReceizId: string;
    createdAtKai?: string;
    identityDigest?: string;
    namespaces?: ReceizSubjectNamespaceBytesV1;
    primaryObjects?: readonly ReceizSubjectPrimaryProofObjectV1[];
}>;
export type ReceizBearerCapabilityV1 = Readonly<{
    receizId: string;
    capabilityDigest: string;
}>;
//# sourceMappingURL=livingSubjects.d.ts.map