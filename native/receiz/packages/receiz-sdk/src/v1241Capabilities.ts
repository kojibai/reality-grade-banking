export const RECEIZ_V124_1_CAPABILITY_SCHEMA = "receiz.sdk.capability-inventory.v124.1" as const;

export type ReceizV1241CapabilityExposure =
  | "sdk-and-mcp"
  | "sdk-with-bounded-mcp-projection"
  | "sdk-private-boundary";

export type ReceizV1241CapabilityContract = Readonly<{
  id:
    | "source-carried-replay"
    | "receiz-id-conversation"
    | "held-material-reconstruction"
    | "progressive-range-playback"
    | "subject-memory-and-twin"
    | "portable-account-continuity";
  primitive: string;
  outcome: string;
  exposure: ReceizV1241CapabilityExposure;
  sdkExports: readonly string[];
  sdkClientMethods: readonly string[];
  mcpTools: readonly string[];
  aiSkills: readonly string[];
  authorityBoundary: string;
}>;

const frozen = <T extends ReceizV1241CapabilityContract>(value: T): T => Object.freeze({
  ...value,
  sdkExports: Object.freeze([...value.sdkExports]),
  sdkClientMethods: Object.freeze([...value.sdkClientMethods]),
  mcpTools: Object.freeze([...value.mcpTools]),
  aiSkills: Object.freeze([...value.aiSkills]),
}) as T;

/**
 * Canonical V124.1 implementation inventory.
 *
 * This inventory names already implemented SDK mechanics and their bounded MCP
 * and AI Skills projections. It creates no proof, identity, ownership, memory,
 * or settlement authority. The enclosing verified Receiz proof object remains
 * the stronger source of truth for every row.
 */
export const RECEIZ_V124_1_CAPABILITY_INVENTORY = Object.freeze([
  frozen({
    id: "source-carried-replay",
    primitive: "deterministic source-carried append state",
    outcome: "Open, compare, merge, and project every verified replay branch from exact sealed sources without a database or last-write-wins collapse.",
    exposure: "sdk-and-mcp",
    sdkExports: [
      "openReceizSourceCarriedReplayFamilyV124",
      "diffReceizSourceCarriedReplayFamiliesV124",
      "mergeReceizSourceCarriedReplayFamiliesV124",
      "projectReceizSourceCarriedReplayBranchesV124",
    ],
    sdkClientMethods: [],
    mcpTools: ["receiz_source_carried_replay_open"],
    aiSkills: [
      "receiz-architecture",
      "receiz-causal-sync",
      "receiz-deterministic-replay",
      "receiz-event-derived-memory",
      "receiz-global-reconciliation",
      "receiz-portable-artifacts",
    ],
    authorityBoundary: "Each sealed replay source is verified independently. Family and branch projections coordinate exact admitted sources but never replace the enclosing proof objects.",
  }),
  frozen({
    id: "receiz-id-conversation",
    primitive: "Receiz-ID-bound private group conversation",
    outcome: "Compose direct or unlimited invited-member conversations from complete causal history, bounded retrieval windows, encrypted epoch grants, and exact Receiz-ID participant bindings.",
    exposure: "sdk-with-bounded-mcp-projection",
    sdkExports: [
      "parseReceizConversationParticipantBindingV1",
      "createReceizConversationEventV1",
      "parseReceizConversationEventV1",
      "reduceReceizConversationEventsV1",
      "openReceizConversationSourceFamilyV1",
      "createReceizConversationEpochSecretV1",
      "planReceizConversationEpochGrantBatchesV1",
      "openReceizConversationEpochGrantV1",
      "encryptReceizConversationMessageV1",
      "decryptReceizConversationMessageV1",
    ],
    sdkClientMethods: [],
    mcpTools: [
      "receiz_conversation_source_family_open",
      "receiz_conversation_epoch_grants_plan",
    ],
    aiSkills: [
      "receiz-architecture",
      "receiz-causal-sync",
      "receiz-event-derived-memory",
      "receiz-portable-artifacts",
      "receiz-portable-continuity",
      "receiz-subject-twin",
    ],
    authorityBoundary: "Receiz identity bindings and sealed conversation events remain authority. MCP returns safe coordinates and encrypted grant envelopes only; clear messages and epoch secrets stay in trusted-host custody.",
  }),
  frozen({
    id: "held-material-reconstruction",
    primitive: "source-carried large-material proof projection",
    outcome: "Build, publish, hold, reopen, and reconstruct inline RMA2 or segmented RMC1/RMC2 with raw RMA3 projection while verifying the enclosing artifact before native media use.",
    exposure: "sdk-with-bounded-mcp-projection",
    sdkExports: [
      "buildReceizMaterialCompositeTransport",
      "publishReceizMaterialCompositeTransport",
      "resolveReceizMaterialCompositeTransport",
      "createReceizMaterialSourceFamily",
      "createReceizClosedMaterialPresentationUrl",
      "openReceizMaterialSourceParts",
      "createReceizRawMaterialCapsuleBlobFromSourceParts",
      "decodeReceizRawMaterialCapsuleBytes",
      "resolveReceizMaterialCompositeFromSources",
      "openVerifiedReceizMaterialUrl",
    ],
    sdkClientMethods: [],
    mcpTools: ["receiz_material_source_parts_open", "receiz_material_url_open"],
    aiSkills: [
      "receiz-architecture",
      "receiz-performance",
      "receiz-portable-artifacts",
      "receiz-proof-media",
    ],
    authorityBoundary: "Transport segments, locators, manifests, object URLs, and storage are projections only. Native bytes are admitted only beneath verification of the enclosing sealed artifact.",
  }),
  frozen({
    id: "progressive-range-playback",
    primitive: "verified progressive media ranges",
    outcome: "Start verified first-frame playback from signed range commitments while remaining ranges settle behind the already playing media.",
    exposure: "sdk-with-bounded-mcp-projection",
    sdkExports: [
      "buildReceizMaterialProgressiveLedger",
      "createReceizMaterialProgressiveCommitment",
      "coerceReceizMaterialProgressiveLedger",
      "coerceReceizMaterialProgressiveCommitment",
      "openReceizMaterialSourceRangeReader",
    ],
    sdkClientMethods: [],
    mcpTools: ["receiz_material_source_parts_open"],
    aiSkills: ["receiz-performance", "receiz-portable-artifacts", "receiz-proof-media"],
    authorityBoundary: "Only a progressive ledger whose complete root is carried by the enclosing Signature-V4 proof can authorize range projection. Unsigned offsets, container metadata, or transport segments cannot.",
  }),
  frozen({
    id: "subject-memory-and-twin",
    primitive: "event-derived proof memory and non-authoritative Twin response",
    outcome: "Resolve complete proof history through bounded cognition windows, cite exact proof objects, and generate local or connected Twin speech without promoting model output into fact or command authority.",
    exposure: "sdk-and-mcp",
    sdkExports: [],
    sdkClientMethods: [
      "subjects.brain.head",
      "subjects.brain.search",
      "subjects.brain.resolve",
      "subjects.brain.stream",
      "subjects.memory.query",
      "subjects.memory.project",
      "subjects.memory.citations",
      "subjects.memory.compact",
      "subjects.twin.profile",
      "subjects.twin.message",
      "subjects.twin.stream",
      "subjects.twin.exportMind",
      "subjects.twin.importMind",
      "subjects.twin.memorySummary",
      "subjects.twin.streamPerformance",
    ],
    mcpTools: [
      "receiz_subject_memory_query",
      "receiz_subject_brain_head",
      "receiz_subject_brain_search",
      "receiz_subject_brain_resolve",
      "receiz_subject_brain_stream",
      "receiz_subject_twin_profile",
      "receiz_subject_twin_message",
      "receiz_subject_twin_mind_export",
      "receiz_subject_twin_mind_import_plan",
    ],
    aiSkills: [
      "receiz-event-derived-memory",
      "receiz-live-proof-character",
      "receiz-living-subject",
      "receiz-subject-twin",
    ],
    authorityBoundary: "Proof-derived memory cites admitted events and exact primary proof objects. Twin speech, summaries, intent, and performance remain non-authoritative proposals until deterministic command admission accepts a consequential action.",
  }),
  frozen({
    id: "portable-account-continuity",
    primitive: "verified identity-carried account continuity",
    outcome: "Seal, verify, and immediately project complete account truth—including profile, showcase, wallet, market positions/history, media, and proof history—without waiting on a server or database.",
    exposure: "sdk-private-boundary",
    sdkExports: [
      "appendReceizIdentityPortableState",
      "verifyReceizIdentityPortableStateProof",
      "projectReceizIdentityAccount",
    ],
    sdkClientMethods: [],
    mcpTools: [],
    aiSkills: [
      "receiz-cross-app-state",
      "receiz-identity-profile",
      "receiz-offline-first",
      "receiz-portable-continuity",
    ],
    authorityBoundary: "The verified Identity Seal, Identity Record, or Receiz Key carries account truth. Private portable state is not exposed through MCP; server synchronization may append verified additions only after immediate local projection.",
  }),
] as const satisfies readonly ReceizV1241CapabilityContract[]);

export const RECEIZ_V124_1_CAPABILITY_IDS = Object.freeze(
  RECEIZ_V124_1_CAPABILITY_INVENTORY.map((capability) => capability.id),
);
