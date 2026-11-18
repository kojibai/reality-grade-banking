export declare const RECEIZ_V124_1_CAPABILITY_SCHEMA: "receiz.sdk.capability-inventory.v124.1";
export type ReceizV1241CapabilityExposure = "sdk-and-mcp" | "sdk-with-bounded-mcp-projection" | "sdk-private-boundary";
export type ReceizV1241CapabilityContract = Readonly<{
    id: "source-carried-replay" | "receiz-id-conversation" | "held-material-reconstruction" | "progressive-range-playback" | "subject-memory-and-twin" | "portable-account-continuity";
    primitive: string;
    outcome: string;
    exposure: ReceizV1241CapabilityExposure;
    sdkExports: readonly string[];
    sdkClientMethods: readonly string[];
    mcpTools: readonly string[];
    aiSkills: readonly string[];
    authorityBoundary: string;
}>;
/**
 * Canonical V124.1 implementation inventory.
 *
 * This inventory names already implemented SDK mechanics and their bounded MCP
 * and AI Skills projections. It creates no proof, identity, ownership, memory,
 * or settlement authority. The enclosing verified Receiz proof object remains
 * the stronger source of truth for every row.
 */
export declare const RECEIZ_V124_1_CAPABILITY_INVENTORY: readonly [{
    id: "source-carried-replay";
    primitive: string;
    outcome: string;
    exposure: "sdk-and-mcp";
    sdkExports: string[];
    sdkClientMethods: never[];
    mcpTools: string[];
    aiSkills: string[];
    authorityBoundary: string;
}, {
    id: "receiz-id-conversation";
    primitive: string;
    outcome: string;
    exposure: "sdk-with-bounded-mcp-projection";
    sdkExports: string[];
    sdkClientMethods: never[];
    mcpTools: string[];
    aiSkills: string[];
    authorityBoundary: string;
}, {
    id: "held-material-reconstruction";
    primitive: string;
    outcome: string;
    exposure: "sdk-with-bounded-mcp-projection";
    sdkExports: string[];
    sdkClientMethods: never[];
    mcpTools: string[];
    aiSkills: string[];
    authorityBoundary: string;
}, {
    id: "progressive-range-playback";
    primitive: string;
    outcome: string;
    exposure: "sdk-with-bounded-mcp-projection";
    sdkExports: string[];
    sdkClientMethods: never[];
    mcpTools: string[];
    aiSkills: string[];
    authorityBoundary: string;
}, {
    id: "subject-memory-and-twin";
    primitive: string;
    outcome: string;
    exposure: "sdk-and-mcp";
    sdkExports: never[];
    sdkClientMethods: string[];
    mcpTools: string[];
    aiSkills: string[];
    authorityBoundary: string;
}, {
    id: "portable-account-continuity";
    primitive: string;
    outcome: string;
    exposure: "sdk-private-boundary";
    sdkExports: string[];
    sdkClientMethods: never[];
    mcpTools: never[];
    aiSkills: string[];
    authorityBoundary: string;
}];
export declare const RECEIZ_V124_1_CAPABILITY_IDS: readonly ("source-carried-replay" | "receiz-id-conversation" | "held-material-reconstruction" | "progressive-range-playback" | "subject-memory-and-twin" | "portable-account-continuity")[];
//# sourceMappingURL=v1241Capabilities.d.ts.map