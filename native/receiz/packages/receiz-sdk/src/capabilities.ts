import { RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE } from "./currentRelease.generated.js";
export type ReceizCapabilityKey =
  | "identity"
  | "wallet"
  | "payments"
  | "notes"
  | "proofStore"
  | "media"
  | "domains"
  | "twin"
  | "world"
  | "commerce"
  | "rewards"
  | "customers"
  | "merchants"
  | "events"
  | "search"
  | "permissions"
  | "jobs"
  | "audit"
  | "risk"
  | "compliance"
  | "portability"
  | "notifications"
  | "webhooks"
  | "offline"
  | "coordination"
  | "releases"
  | "subjects"
  | "subjectTwin"
  | "subjectMemory"
  | "subjectMandates"
  | "worldEvents"
  | "worldCommands"
  | "subjectRuntime"
  | "subjectRelationships"
  | "subjectInventory"
  | "lawfulActions";

export type ReceizRailScopeKey = ReceizCapabilityKey | "appState" | "publicStore" | "settlement" | "reserve";

export const RECEIZ_OIDC_SCOPES_BY_RAIL: Record<ReceizRailScopeKey, readonly string[]> = {
  identity: ["openid", "profile", "email"],
  wallet: ["receiz:wallet.read", "receiz:wallet.transfer"],
  settlement: ["receiz:settlement.read", "receiz:settlement.write"],
  reserve: ["receiz:reserve.read", "receiz:reserve.write"],
  lawfulActions: [
    "receiz:lawful-actions.laws.write",
    "receiz:lawful-actions.write",
    "receiz:lawful-actions.value.write",
  ],
  payments: ["receiz:payments.read", "receiz:payments.create"],
  notes: ["receiz:notes.read", "receiz:notes.mint", "receiz:notes.claim"],
  proofStore: ["receiz:record", "receiz:seal", "receiz:verify"],
  media: ["receiz:media.read", "receiz:media.write"],
  domains: ["receiz:domains.read", "receiz:domains.write"],
  twin: ["receiz:twin.read", "receiz:twin.write", "receiz:creator.execute", "receiz:twin.execute"],
  world: ["receiz:world.read", "receiz:world.write", "receiz:world.private"],
  commerce: ["receiz:payments.read", "receiz:payments.create", "receiz:wallet.read", "receiz:public_store.read", "receiz:public_store.write"],
  rewards: ["receiz:record", "receiz:wallet.read"],
  customers: ["openid", "profile", "email", "offline_access", "receiz:wallet.read", "receiz:payments.read"],
  merchants: ["openid", "profile", "email", "offline_access", "receiz:record", "receiz:wallet.read", "receiz:payments.read", "receiz:payments.create", "receiz:public_store.write"],
  events: ["receiz:app_state.read", "receiz:app_state.write"],
  search: ["receiz:app_state.read"],
  permissions: ["receiz:app_state.read", "receiz:app_state.write"],
  jobs: ["receiz:app_state.write"],
  audit: ["receiz:app_state.read"],
  risk: ["receiz:app_state.read"],
  compliance: ["receiz:app_state.read"],
  portability: ["receiz:app_state.read", "receiz:app_state.write"],
  notifications: ["receiz:app_state.write"],
  webhooks: ["receiz:webhooks.read", "receiz:webhooks.write"],
  offline: ["receiz:record", "receiz:app_state.write"],
  coordination: ["receiz:app_state.read", "receiz:app_state.write"],
  releases: ["receiz:record"],
  subjects: ["receiz:subjects.read", "receiz:subjects.write"],
  subjectTwin: ["receiz:subject_twin.read", "receiz:subject_twin.write"],
  subjectMemory: ["receiz:subject_memory.read", "receiz:subject_memory.write"],
  subjectMandates: [
    "receiz:subject_mandates.read",
    "receiz:subject_mandates.write",
    "receiz:subject-mandates.read",
    "receiz:subject-mandates.write",
  ],
  worldEvents: ["receiz:world_events.read"],
  worldCommands: ["receiz:world_commands.write"],
  subjectRuntime: ["receiz:subject_runtime.write"],
  subjectRelationships: ["receiz:subject_relationships.write"],
  subjectInventory: ["receiz:subject_inventory.write"],
  appState: ["receiz:app_state.read", "receiz:app_state.write"],
  publicStore: ["receiz:public_store.read", "receiz:public_store.write"],
};

export const RECEIZ_OIDC_SCOPE_CATALOG: readonly string[] = Object.freeze(
  [...new Set(Object.values(RECEIZ_OIDC_SCOPES_BY_RAIL).flatMap((scopes) => scopes))].sort(),
);

export function receizOidcScopesForRails(...rails: ReceizRailScopeKey[]): string[] {
  const scopes = new Set<string>();
  for (const rail of rails) {
    for (const scope of RECEIZ_OIDC_SCOPES_BY_RAIL[rail] ?? []) scopes.add(scope);
  }
  return [...scopes];
}

export type ReceizCapabilityEnvironment = "browser" | "server";
export type ReceizCapabilityStability = "stable" | "preview";

export type ReceizCapabilityRailDescriptor = Readonly<{
  key: ReceizRailScopeKey;
  requiredScopes: readonly string[];
  environments: readonly ReceizCapabilityEnvironment[];
  stability: ReceizCapabilityStability;
  compatibility: Readonly<{
    browser: boolean;
    server: boolean;
    compiler: boolean;
    testing: boolean;
  }>;
  operations: Readonly<{
    public: readonly string[];
    delegated: readonly string[];
  }>;
  authorityBoundary: string;
}>;

export type ReceizCapabilityDescriptor = Readonly<{
  schema: "receiz.sdk.capability_descriptor.v1";
  version: "1.0.0";
  packageCompatibility: Readonly<{
    sdk: typeof RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
    mcp: typeof RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE;
  }>;
  entryPoints: Readonly<{
    universal: "@receiz/sdk";
    react: "@receiz/sdk/react";
    compiler: "@receiz/sdk/compiler";
    testing: "@receiz/sdk/testing";
  }>;
  rails: readonly ReceizCapabilityRailDescriptor[];
  authorityBoundary: "capability-description-is-not-proof-verification";
}>;

const PUBLIC_OPERATIONS: Partial<Record<ReceizRailScopeKey, readonly string[]>> = {
  identity: ["authorize", "continue"],
  proofStore: ["verify", "artifacts.verifyAndOpen", "artifacts.download"],
  appState: ["resolve", "restore"],
  publicStore: ["resolve", "restore"],
  wallet: ["publicLedger"],
  settlement: ["executionByIdempotencyKey"],
  reserve: ["executionByIdempotencyKey"],
  world: ["publicRead"],
  offline: ["inspect", "restore"],
  coordination: ["resolveAcceptedHead", "resolveReconciliationAttempt", "resolveEffectStatus"],
};

const DELEGATED_OPERATIONS: Partial<Record<ReceizRailScopeKey, readonly string[]>> = {
  identity: ["recordIdentity", "sealIdentity", "profile.update"],
  notes: ["connect.downloadNote", "connect.mintNote", "connect.claimNote"],
  proofStore: ["record", "seal", "assets.createProofObject", "ownership.claimBearerAsset"],
  appState: ["publish"],
  publicStore: ["publish"],
  coordination: ["planOfflineReconciliation", "stageOfflineReconciliation", "commitOfflineReconciliation", "reconcileOffline"],
  settlement: ["value.executeSettlement"],
  reserve: ["value.executeReserve"],
  lawfulActions: ["lawfulActions.registerLaw", "lawfulActions.admit", "lawfulActions.deriveValueHead"],
};

function authorityBoundaryFor(rail: ReceizRailScopeKey): string {
  if (rail === "proofStore") return "native-record-seal-and-complete-artifact-before-authenticated-ownership-append";
  if (rail === "identity") return "real-receiz-id-and-admitted-same-account-uid-continuity";
  if (rail === "notes") return "note-issuance-and-claim-mechanics-beneath-proof-native-settlement-authority";
  if (rail === "offline") return "sealed-artifact-truth-before-local-projection";
  if (rail === "coordination") return "named-domain-acceptance-beneath-independently-verified-sealed-artifact-history";
  if (rail === "appState" || rail === "publicStore") return "verified-append-beneath-sealed-proof-object-truth";
  if (rail === "settlement") return "scoped-settlement-mechanics-beneath-proof-native-phi-value-authority";
  if (rail === "reserve") return "scoped-reserve-mechanics-beneath-proof-native-phi-value-authority";
  if (rail === "lawfulActions") return "sealed-law-and-action-proof-before-deterministic-current-kai-settlement-projection";
  return "delegated-sdk-operation-beneath-receiz-proof-object-truth";
}

export const RECEIZ_CAPABILITY_RAILS: readonly ReceizCapabilityRailDescriptor[] =
  (Object.keys(RECEIZ_OIDC_SCOPES_BY_RAIL) as ReceizRailScopeKey[])
    .sort((left, right) => left.localeCompare(right))
    .map((key) => ({
      key,
      requiredScopes: RECEIZ_OIDC_SCOPES_BY_RAIL[key],
      environments: ["browser", "server"] as const,
      stability: "stable" as const,
      compatibility: { browser: true, server: true, compiler: true, testing: true },
      operations: {
        public: PUBLIC_OPERATIONS[key] ?? [],
        delegated: DELEGATED_OPERATIONS[key] ?? [`${key}.delegated`],
      },
      authorityBoundary: authorityBoundaryFor(key),
    }));

export function describeReceizCapabilities(): ReceizCapabilityDescriptor {
  return {
    schema: "receiz.sdk.capability_descriptor.v1",
    version: "1.0.0",
    packageCompatibility: { sdk: RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE, mcp: RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE },
    entryPoints: {
      universal: "@receiz/sdk",
      react: "@receiz/sdk/react",
      compiler: "@receiz/sdk/compiler",
      testing: "@receiz/sdk/testing",
    },
    rails: RECEIZ_CAPABILITY_RAILS,
    authorityBoundary: "capability-description-is-not-proof-verification",
  };
}
