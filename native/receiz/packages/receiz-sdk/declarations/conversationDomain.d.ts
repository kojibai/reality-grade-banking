export declare const RECEIZ_CONVERSATION_NAMESPACE_V1: "receiz.chat.conversation.v1";
export type ReceizConversationParticipantBindingV1 = Readonly<{
    receizId: string;
    subjectId: string;
    subjectHead: string;
    accessKeyHead: string;
    bindingDigest: string;
}>;
export type ReceizConversationEffectV1 = Readonly<{
    kind: "genesis";
    creator: ReceizConversationParticipantBindingV1;
    legacyReceiptDigest: string | null;
}> | Readonly<{
    kind: "invite";
    invitationId: string;
    recipientReceizId: string;
    role: "admin" | "member";
}> | Readonly<{
    kind: "accept";
    invitationId: string;
    recipient: ReceizConversationParticipantBindingV1;
}> | Readonly<{
    kind: "role";
    recipientReceizId: string;
    role: "admin" | "member";
}> | Readonly<{
    kind: "leave";
    recipientReceizId: string;
}> | Readonly<{
    kind: "revoke";
    recipientReceizId: string;
}> | Readonly<{
    kind: "epoch";
    epoch: number;
    grantSetDigest: string;
}> | Readonly<{
    kind: "message";
    messageId: string;
    senderReceizId: string;
    epoch: number;
    receiptDigest: string;
    originalPayloadDigest: string;
    privateEnvelopeDigest: string;
}>;
export type ReceizConversationEventV1 = Readonly<{
    schema: "receiz.chat.conversation-event.v1";
    eventId: string;
    conversationId: string;
    predecessorEventIds: readonly string[];
    actorReceizId: string;
    kaiUPulse: number;
    effect: ReceizConversationEffectV1;
    eventDigest: string;
}>;
export type ReceizConversationProjectionV1 = Readonly<{
    conversationId: string;
    invitations: readonly Readonly<{
        invitationId: string;
        recipientReceizId: string;
        role: "admin" | "member";
        state: "invited" | "accepted";
    }>[];
    members: readonly Readonly<{
        binding: ReceizConversationParticipantBindingV1;
        role: "owner" | "admin" | "member";
        state: "active" | "left" | "revoked";
    }>[];
    activeEpoch: number;
    messages: readonly Readonly<{
        messageId: string;
        senderReceizId: string;
        epoch: number;
        receiptDigest: string;
        originalPayloadDigest: string;
        privateEnvelopeDigest: string;
    }>[];
    appliedEventIds: readonly string[];
    headEventIds: readonly string[];
    projectionDigest: string;
    authority: Readonly<{
        projectionIsProofAuthority: false;
        strongerTruth: "sealed-receiz-proof-object";
    }>;
}>;
export declare const RECEIZ_CONVERSATION_NAMESPACE_V2: "receiz.chat.conversation.v2";
export type ReceizConversationEffectV2 = ReceizConversationEffectV1 | Readonly<{
    kind: "close";
    observedFrontierEventIds: readonly string[];
}>;
export type ReceizConversationEventV2 = Readonly<Omit<ReceizConversationEventV1, "schema" | "effect"> & {
    schema: "receiz.chat.conversation-event.v2";
    effect: ReceizConversationEffectV2;
}>;
export type ReceizConversationClosureV2 = Readonly<{
    eventId: string;
    actorReceizId: string;
    observedFrontierEventIds: readonly string[];
    kaiUPulse: number;
}>;
export type ReceizConversationProjectionV2 = ReceizConversationProjectionV1 & Readonly<{
    closures?: readonly ReceizConversationClosureV2[];
}>;
type ConversationEventInput = Omit<ReceizConversationEventV1, "schema" | "eventId" | "eventDigest">;
export declare function parseReceizConversationParticipantBindingV1(value: unknown): Promise<ReceizConversationParticipantBindingV1>;
export declare function createReceizConversationEventV1(input: ConversationEventInput): Promise<ReceizConversationEventV1>;
export declare function parseReceizConversationEventV1(value: unknown): Promise<ReceizConversationEventV1>;
export declare function createReceizConversationEventV2(input: Omit<ReceizConversationEventV2, "schema" | "eventId" | "eventDigest">): Promise<ReceizConversationEventV2>;
export declare function parseReceizConversationEventV2(value: unknown): Promise<ReceizConversationEventV2>;
export declare function reduceReceizConversationEventsV1(values: readonly ReceizConversationEventV1[]): Promise<ReceizConversationProjectionV1>;
export declare function reduceReceizConversationEventsV2(values: readonly ReceizConversationEventV2[]): Promise<ReceizConversationProjectionV2>;
export {};
//# sourceMappingURL=conversationDomain.d.ts.map