/** Existing pure SVG metadata reader. Caller first verifies the enclosing Source. */
export type ParsedSigilValuationMetadata = Readonly<{pulse?:number;beat?:number;stepIndex?:number;frequencyHz?:number;chakraDay?:string;chakraGate?:string;raw?:unknown}>;
export declare function extractEmbeddedMetaFromSvg(svg:string):ParsedSigilValuationMetadata;
export declare function extractValuationSourceRaw(raw:Record<string,unknown>|null):Record<string,unknown>|null;
export declare function normalizeValuationSource(args:{valuationSourceRaw:Record<string,unknown>|null;embedded:ParsedSigilValuationMetadata;raw:Record<string,unknown>|null;kaiSignature:string;derivedPhiKey:string}):import("./sigilValuationCore.js").SigilMetadataLite;
export declare function asFiniteNumber(value:unknown):number|null;
