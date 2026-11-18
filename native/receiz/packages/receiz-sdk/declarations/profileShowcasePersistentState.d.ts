import { type ReceizConstitutionJson } from "./constitution.js";
export type ReceizProfileShowcasePersistentPlacementV114 = Readonly<{
    reference: Readonly<Record<string, unknown>>;
    visibility: "visible" | "unlisted" | "hidden";
    pinned: boolean;
    sectionId: string | null;
    provenanceEvidenceRoots: readonly string[];
    orderKey: string;
    membershipOperationCount: number;
    membershipWitness: Readonly<Record<string, unknown>>;
}>;
type PlacementNodeValue = Readonly<{
    kind: "placement";
    placement: ReceizProfileShowcasePersistentPlacementV114;
}>;
type OrderNodeValue = Readonly<{
    kind: "order";
    placementKey: string;
    visible: boolean;
}>;
export type ReceizProfileShowcasePersistentNodeV114 = Readonly<{
    schema: "receiz.profile-showcase.persistent-node.v114";
    tree: "placement" | "order";
    key: string;
    priority: string;
    value: PlacementNodeValue | OrderNodeValue;
    left: string | null;
    right: string | null;
    size: number;
    visibleCount: number;
    digest: string;
}>;
export type ReceizProfileShowcasePersistentStateIOV114 = Readonly<{
    resolveNode(digest: string): ReceizProfileShowcasePersistentNodeV114 | null | Promise<ReceizProfileShowcasePersistentNodeV114 | null>;
    writeNode(node: ReceizProfileShowcasePersistentNodeV114): void | Promise<void>;
}>;
export type ReceizProfileShowcasePersistentCountsV114 = Readonly<{
    operationCount: number;
    membershipCount: number;
    visibleCount: number;
    hiddenCount: number;
    unlistedCount: number;
    pinnedCount: number;
}>;
export type ReceizProfileShowcasePersistentStateV114 = Readonly<{
    schema: "receiz.profile-showcase.persistent-state.v114";
    placementRoot: string;
    orderRoot: string;
    counts: ReceizProfileShowcasePersistentCountsV114;
    maximumKaiUpulse: string;
}>;
export type ReceizProfileShowcasePersistentWindowV114 = Readonly<{
    children: readonly Readonly<{
        reference: Readonly<Record<string, unknown>>;
        membershipWitness: Readonly<Record<string, unknown>>;
    }>[];
    continuation: Readonly<{
        nextVisibleIndex: number;
        placementRoot: string;
        orderRoot: string;
        lastOrderKey: string;
        witnessNodeDigests: readonly string[];
    }> | null;
    witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
}>;
export declare const RECEIZ_PROFILE_SHOWCASE_EMPTY_PLACEMENT_ROOT_V114: string;
export declare const RECEIZ_PROFILE_SHOWCASE_EMPTY_ORDER_ROOT_V114: string;
export declare function createEmptyReceizProfileShowcasePersistentStateV114(genesisKaiUpulse: string): ReceizProfileShowcasePersistentStateV114;
export declare function reduceReceizProfileShowcasePersistentStateV114(input: Readonly<{
    state: ReceizProfileShowcasePersistentStateV114;
    operation: ReceizConstitutionJson;
    membershipWitness: Readonly<Record<string, unknown>>;
    io: ReceizProfileShowcasePersistentStateIOV114;
    expectedPriorCommittedCount?: number;
    expectedDirectDeltaPosition?: number;
}>): Promise<ReceizProfileShowcasePersistentStateV114>;
/**
 * Resolve one child's placement beneath an accepted enclosing Showcase root.
 * The existing lookup verifies each node on that path; caller-supplied roots
 * do not become admission or authority through this mechanics-only read.
 */
export declare function deriveReceizProfileShowcasePersistentPlacementV114(input: Readonly<{
    placementRoot: string;
    io: ReceizProfileShowcasePersistentStateIOV114;
    child: Readonly<Record<string, unknown>>;
}>): Promise<ReceizProfileShowcasePersistentPlacementV114 | null>;
export declare function deriveReceizProfileShowcasePersistentWindowV114(input: Readonly<{
    state: ReceizProfileShowcasePersistentStateV114;
    io: ReceizProfileShowcasePersistentStateIOV114;
    limit?: number;
}>): Promise<ReceizProfileShowcasePersistentWindowV114>;
/**
 * Complete state projection beneath an accepted enclosing Showcase's roots.
 * This function validates reachable state mechanics; it does not admit a
 * Showcase or confer authority on caller-supplied roots.
 */
export declare function deriveReceizProfileShowcasePersistentMembershipV114(input: Readonly<{
    state: ReceizProfileShowcasePersistentStateV114;
    io: ReceizProfileShowcasePersistentStateIOV114;
}>): Promise<Readonly<{
    placements: readonly ReceizProfileShowcasePersistentPlacementV114[];
    witnessNodes: readonly ReceizProfileShowcasePersistentNodeV114[];
}>>;
export declare function createReceizProfileShowcasePersistentMemoryStoreV114(seed?: readonly ReceizProfileShowcasePersistentNodeV114[]): ReceizProfileShowcasePersistentStateIOV114 & Readonly<{
    nodes(): readonly ReceizProfileShowcasePersistentNodeV114[];
}>;
export {};
//# sourceMappingURL=profileShowcasePersistentState.d.ts.map