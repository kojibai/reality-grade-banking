import { RECEIZ_CURRENT_RELEASE_MAJOR_COMPATIBILITY_RANGE } from "./currentRelease.generated.js";
export type ReceizCapabilityKey = "identity" | "wallet" | "payments" | "notes" | "proofStore" | "media" | "domains" | "twin" | "world" | "commerce" | "rewards" | "customers" | "merchants" | "events" | "search" | "permissions" | "jobs" | "audit" | "risk" | "compliance" | "portability" | "notifications" | "webhooks" | "offline" | "coordination" | "releases" | "subjects" | "subjectTwin" | "subjectMemory" | "subjectMandates" | "worldEvents" | "worldCommands" | "subjectRuntime" | "subjectRelationships" | "subjectInventory" | "lawfulActions";
export type ReceizRailScopeKey = ReceizCapabilityKey | "appState" | "publicStore" | "settlement" | "reserve";
export declare const RECEIZ_OIDC_SCOPES_BY_RAIL: Record<ReceizRailScopeKey, readonly string[]>;
export declare const RECEIZ_OIDC_SCOPE_CATALOG: readonly string[];
export declare function receizOidcScopesForRails(...rails: ReceizRailScopeKey[]): string[];
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
export declare const RECEIZ_CAPABILITY_RAILS: readonly ReceizCapabilityRailDescriptor[];
export declare function describeReceizCapabilities(): ReceizCapabilityDescriptor;
//# sourceMappingURL=capabilities.d.ts.map