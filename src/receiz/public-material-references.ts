/** Internal immutable display representation. These locators grant no Source,
 * visibility, proof or financial authority. Existing selected public DTOs and
 * existing financial/history point shapes remain the referenced byte bodies. */
export type PublicMaterialGeneration = string;
export type PublicMaterialChartPeriod = '1D'|'1W'|'1M'|'3M'|'1Y'|'ALL';
export type PublicMaterialFacet='All'|'Music'|'Images'|'Videos'|'Books'|'Essays'|'Moments'|'Collectibles'|'Documents';
export interface PublicMaterialRowLocator {readonly generation:PublicMaterialGeneration;readonly position:string;readonly facets:readonly PublicMaterialFacet[];}
export interface PublicMaterialIndex {readonly root:PublicMaterialGeneration|null;readonly count:number;}
/** Exact approved persistent AVL Entry/Node JSON layout. entry.name is
 * JSON.stringify([key,value]); value is a generation except the byId locator,
 * whose PublicMaterialRowLocator JSON value carries its exact position key.
 * All keys use exact UTF-16 code-unit comparison (no locale/Unicode folding).
 * Order keys are opaque to consumers: traverse the recorded tree in-order.
 * Their existing curator order is captured by the qualified producer, never
 * recomputed from title, wall clock, hash or Source placement count. */
export interface PublicMaterialIndexNode {
 readonly entry:{readonly name:string;readonly directory:false;readonly references:1};
 readonly left:PublicMaterialGeneration|null;readonly right:PublicMaterialGeneration|null;
 readonly height:number;readonly count:number;readonly digestNames:false;
}
export interface PublicMaterialMembership {
 /** Existing membership envelope/publicMembership, without the row/head arrays. */
 readonly metadata:PublicMaterialGeneration;
 /** Key is JSON.stringify([immutableOwnerUID,receizId]). */
 readonly byId:PublicMaterialGeneration|null;
 readonly byOrder:PublicMaterialGeneration|null;
 readonly byFacet:Readonly<Record<PublicMaterialFacet,PublicMaterialIndex>>;
 /** UID -> generation of a tiny PublicMaterialIndex owner descriptor. */
 readonly byOwner:PublicMaterialGeneration|null;
 readonly headsByOwner:PublicMaterialGeneration|null;
 /** Logical public Original rows, not SDK child placements or Sports rows. */
 readonly count:number;
 /** Optional existing full operand for bounded fresh-worker transport only. */
 readonly baseline?:Readonly<{generation:string;byId:string|null;count:number;positionsGeneration?:string}>;
 /** Immutable Creator UID -> ordered current public row dependency descriptor. */
 readonly byCreator?:string|null;
 readonly baselineChanges?:PublicMaterialIndex;
 readonly headsBaselineChanges?:PublicMaterialIndex;
}
export interface PublicMaterialQuotes {
 /** Existing public snapshot envelope, without liveMarkets. */
 readonly metadata:PublicMaterialGeneration;
 /** Uses the same immutable owner/Original logical key as membership. */
 readonly byId:PublicMaterialGeneration|null;readonly count:number;
 readonly baseline?:Readonly<{generation:string;membershipById:string|null}>;
 readonly baselineChanges?:PublicMaterialIndex;
}
export interface PublicMaterialSportsIndex {
 readonly metadata:PublicMaterialGeneration;
 readonly byId:PublicMaterialGeneration|null;
 readonly byOrder:PublicMaterialGeneration|null;
 readonly byFacet:Readonly<Record<PublicMaterialFacet,PublicMaterialIndex>>;
 readonly count:number;
}
export interface PublicMaterialPricingLocator {readonly generation:string;readonly position:string;}
export interface PublicMaterialHistory {
 /** Existing MarketHistorySnapshot metadata/summary, excluding series/eventPulses. */
 readonly header:PublicMaterialGeneration;
 /** Leaves are existing exact CapitalizationPoint JSON. No new market curve. */
 readonly series:Readonly<Record<PublicMaterialChartPeriod,PublicMaterialIndex>>;
 /** Leaves are the existing event pulse numbers. */
 readonly events:PublicMaterialIndex|null;
 /** Sparse exact display corrections; prior point bodies remain immutable. */
 readonly adjustments?:PublicMaterialIndex|null;
 readonly baseline?:Readonly<{generation:string}>;
 readonly baselineChanges?:Readonly<Record<PublicMaterialChartPeriod,PublicMaterialIndex>>;
 readonly eventBaselineChanges?:PublicMaterialIndex;
 readonly observationBaselineChanges?:PublicMaterialIndex;
 readonly pricing?:Readonly<{metadata:string;byId:string|null;count:number}>;
}
export interface PublicMaterialLedgerHeads {
 readonly actions:{readonly count:string;readonly seq:string;readonly hash:string|null};
 readonly wallet:{readonly count:string;readonly kai:string|null};
}
export interface PreparedPublicMaterialReferences {
 readonly schema:'bank.public-market.render-material.refs.v1';
 readonly publicDisplayPolicy:'bank.public-market.curated-display.v3';
 /** Exact qualified global display selection coordinate; never proof authority. */
 readonly selectionKey:string;
 readonly membership:PublicMaterialMembership;
 readonly snapshot:PublicMaterialQuotes;
 /** Existing complete selected public operand bodies, reused unchanged. */
 readonly sports:PublicMaterialGeneration|null;
 readonly sportsCount:number;
 readonly sportsIndex:PublicMaterialSportsIndex|null;
 readonly capitalization:PublicMaterialGeneration|null;
 readonly history:PublicMaterialHistory;
 readonly marketPrepared:{readonly schema:'bank.public-market.prepared.v1';readonly asOfPulse:number};
 /** Existing financial-only preparedLedger packet, not a new financial format. */
 readonly preparedLedger:PublicMaterialGeneration|null;
 readonly ledgerHeads?:PublicMaterialLedgerHeads;
}
/** Display-only continuation bound to the exact selected ordered index. A
 * window seed MUST remain complete:false and separately carry sourceCount,
 * proofCount and sportsCount. A cursor cannot imply global completeness. */
export interface PublicMaterialWindowCursor {
 readonly rootGeneration:PublicMaterialGeneration;
 readonly orderRoot:PublicMaterialGeneration|null;
 readonly after:string|null;
}

export type PublicMaterialRole = 'root'|'history-pricing'|'history-pricing-index'|'history-pricing-metadata'|'history-event-change-index'|'history-observation-change-index'|'membership-baseline-positions'|'history-base'|'history-change-index'|'membership-base'|'quote-base'|'membership-change-index'|'quote-change-index'|'profile-head-change-index'|'history-predecessor'|'membership-metadata'|'membership-row'|'profile-original'|'membership-id-index'|'membership-order-index'|'membership-facet-index'|'membership-owner-index'|'owner-window'|'profile-head'|'profile-head-index'|'quote-metadata'|'quote-row'|'quote-index'|'sports'|'sports-metadata'|'sports-row'|'sports-card-page'|'sports-id-index'|'sports-order-index'|'sports-facet-index'|'capitalization'|'history-header'|'history-point'|'history-series-index'|'history-event'|'history-event-index'|'history-adjustment'|'history-adjustment-index'|'prepared-ledger';
export interface PublicMaterialReferencePolicy {readonly role:PublicMaterialRole;readonly key:string;}
/** Supplied only by the configured qualified global selection adapter. This
 * module has no constructor, JSON decoder, caller verdict or per-owner bypass
 * for this runtime selection. Candidate material need not await HTML promotion. */
export interface PublicMaterialReferenceSelection {
 readonly coordinate:string;readonly rootGeneration:string;
 current():Promise<boolean>;
 contains(role:PublicMaterialRole,key:string,generation:string):Promise<boolean>;
}

export interface PublicMaterialCuratedRowReference {
 readonly schema:'bank.public-market.curated-row.refs.v1';
 /** Existing curator row fields except profileOriginal; materialize current
  * mutable owner fields through the exact current qualified head binding. */
 readonly fields:Readonly<Record<string,unknown>>;
 readonly originalGeneration:PublicMaterialGeneration;
 /** Actual existing projector additions, no copied unchanged long-form text. */
 readonly originalOverlay?:Readonly<Record<string,unknown>>;
 /** Fields the existing public curator intentionally omits from the raw Full Original. */
 readonly originalOmit?:readonly string[];
 readonly summaryRecipe?:Readonly<{kind:'normalized-claim';creatorNote:string}>;
}
export interface PublicMaterialSportsPageLocator {
 readonly materialGeneration:PublicMaterialGeneration;
 readonly ranges:readonly Readonly<{offset:number;byteLength:number;sha256:string}>[];
}
export interface PublicMaterialSportsRowReference {
 readonly schema:'bank.public-market.sports-row.refs.v1';
 readonly cardGeneration:PublicMaterialGeneration;
 readonly cardIndex:number;
 readonly metadataGeneration:PublicMaterialGeneration;
}

export interface PublicMaterialSliceLocator {readonly materialGeneration:string;readonly offset:number;readonly byteLength:number;}
