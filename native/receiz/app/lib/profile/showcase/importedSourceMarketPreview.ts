import type { ProfileOriginal } from "../types";
import { deriveProfileOriginalMarketPreviewFromProofCoordinates } from "../marketPreviewFromProofObject";
import { projectVerifierIdentityDisplay } from "@/app/verify/identityDisplay";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {buildProofBearingReceizVPathFromBundle} from "../../documentSeal/proofBearingVLink";
import {coerceReceizProofBundle} from "../../../utils/receizProofBundle";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { requireOpenedImportedProofSource, type OpenedImportedProofSource } from "./importedSource";
import { projectImportedSourceOriginal } from "./importedSourceProjection";

// Canonically evaluated absence is immutable for these exact Source bytes.
// Retain only tiny display facts, never proof blobs, accounts or access grants.
const withoutDisplayCreator = new Set<string>();
export function importedSourceMarketPreviewNeedsRecovery(original: ProfileOriginal): boolean {
  return Boolean(original.showOnProfile && !original.marketPreview && original.importedSource
    && !withoutDisplayCreator.has(original.importedSource.reference.artifactSha256));
}

/** Tiny source-derived display facts. No media body or permission is retained. */
export type ImportedSourceDisplayFacts=Readonly<{
 original:Pick<ProfileOriginal,"id"|"pulse"|"claim"|"importedSource">;
 creator:ReturnType<typeof projectVerifierIdentityDisplay>["originalCreator"];
 currentOwnerReceizId:string|null; native:boolean;
 claimHashHex:string|null; verifyPath:string; verifyUrl:string;
}>;
/** Compatible private display annotations may enrich the same accepted head.
 * Conflicting facts for identical source bytes never depend on read order. */
export function mergeImportedSourceDisplayFacts(groups:readonly (readonly ImportedSourceDisplayFacts[]|undefined)[]):readonly ImportedSourceDisplayFacts[]{
 const selected=new Map<string,ImportedSourceDisplayFacts>();
 for(const facts of groups)for(const fact of facts??[]){
  const sha=fact.original?.importedSource?.reference.artifactSha256;
  if(!sha||!/^[0-9a-f]{64}$/.test(sha))throw Error("PROFILE_SHOWCASE_RETAINED_CUSTODY_INVALID");
  const known=selected.get(sha);
  if(known&&jcsCanonicalize(known)!==jcsCanonicalize(fact))throw Error("PROFILE_SHOWCASE_RETAINED_CUSTODY_INVALID");
  selected.set(sha,fact);
 }
 return Object.freeze([...selected].sort(([a],[b])=>a.localeCompare(b)).map(([,fact])=>fact));
}
export function projectImportedSourceDisplayFacts(source:OpenedImportedProofSource,original:ProfileOriginal):ImportedSourceDisplayFacts {
 requireOpenedImportedProofSource(source);
 let terminal=source;while(terminal.referencedSources?.[0])terminal=terminal.referencedSources[0];
 const identity=projectVerifierIdentityDisplay(terminal.verification),native=Boolean(terminal.projection.bankAsset);
 const bundle=native?coerceReceizProofBundle(terminal.verification.bundle):null;
 const verifyPath=bundle?buildProofBearingReceizVPathFromBundle(bundle):original.verifyPath;
 return Object.freeze({original:Object.freeze({id:original.id,pulse:original.pulse,claim:original.claim,importedSource:original.importedSource}),
  creator:Object.freeze({...identity.originalCreator}),currentOwnerReceizId:identity.currentOwner.receizId,native,
  claimHashHex:original.claimHashHex??(native&&original.claim?bytesToHex(sha256(new TextEncoder().encode(original.claim))):null),
  verifyPath,verifyUrl:verifyPath?new URL(verifyPath,'https://receiz.com').href:original.verifyUrl});
}

/** Presentation beneath exact canonical custody; sealed placement DTOs stay unchanged. */
export function attachImportedSourceDisplayFacts(input:Readonly<{
 originals:readonly ProfileOriginal[];ownerUserId:string;ownerUsername:string;ownerReceizId?:string;
 facts:readonly ImportedSourceDisplayFacts[];
}>):ProfileOriginal[]{
 const facts=new Map(input.facts.filter(fact=>fact.original.importedSource).map(fact=>[fact.original.importedSource!.reference.artifactSha256,fact]));
 return input.originals.map(original=>{
  if(!original.showOnProfile||!original.importedSource)return original;
  const sourceSha=original.importedSource.reference.artifactSha256;
  const fact=facts.get(sourceSha),canonical=fact?.original;
  if(!fact||!canonical||canonical.id!==original.id||canonical.pulse!==original.pulse||canonical.claim!==original.claim
   ||jcsCanonicalize(canonical.importedSource)!==jcsCanonicalize(original.importedSource))return original;
  const creator=fact.creator;
  if(fact.native&&creator.receizId&&creator.username){
   const ownsCreation=input.ownerReceizId===creator.receizId&&fact.currentOwnerReceizId===creator.receizId;
   const sourceCreator=original.originalCreator??{userId:creator.receizId,username:creator.username,
    displayName:creator.displayName??creator.username,avatarUrl:null,isPrivate:false};
   original={...original,originalCreator:ownsCreation&&sourceCreator.userId===creator.receizId
    ?{...sourceCreator,username:input.ownerUsername,displayName:input.ownerUsername}:sourceCreator,
    ...(ownsCreation?{ownershipKind:'creator' as const,ownershipRole:'creator' as const}:{}),
    claimHashHex:original.claimHashHex??fact.claimHashHex,verifyPath:fact.verifyPath,verifyUrl:fact.verifyUrl};
  }
  if(original.marketPreview)return original;
  if(!creator.receizId||!creator.username){
   withoutDisplayCreator.add(sourceSha);
   if(withoutDisplayCreator.size>256)withoutDisplayCreator.delete(withoutDisplayCreator.values().next().value!);
   return original;
  }
  const marketPreview=deriveProfileOriginalMarketPreviewFromProofCoordinates({originalId:original.id,createdAt:original.createdAt,pulse:original.pulse,
   ownerUserId:input.ownerUserId,ownerUsername:input.ownerUsername,creatorUserId:creator.receizId,creatorUsername:creator.username,
   creatorVerified:original.hasPbiSignature===true,hasPbiSignature:original.hasPbiSignature,importedSource:original.importedSource});
  return marketPreview?{...original,marketPreview}:original;
 });
}
export function attachImportedSourceMarketPreviews(input:Readonly<{
 originals:readonly ProfileOriginal[];ownerUserId:string;ownerUsername:string;ownerReceizId?:string;
 sources:readonly OpenedImportedProofSource[];
}>):ProfileOriginal[]{
 const sources=new Map<string,OpenedImportedProofSource>();
 for(const source of input.sources){requireOpenedImportedProofSource(source);sources.set(source.descriptor.artifactSha256,source);}
 const facts:ImportedSourceDisplayFacts[]=[];
 for(const original of input.originals){const source=original.importedSource&&sources.get(original.importedSource.reference.artifactSha256);
  if(source)facts.push(projectImportedSourceDisplayFacts(source,projectImportedSourceOriginal(source,original.importedSource!.reference)));}
 return attachImportedSourceDisplayFacts({...input,facts});
}


export type ImportedSourceDisplayAnnotation=Pick<ProfileOriginal,"id"|"pulse"|"claim"|"importedSource"|"hasPbiSignature"|"pbiReceiptHash"|"assetTitle"|"marketPreview"|"originalCreator"|"ownershipKind"|"ownershipRole"|"claimHashHex"|"verifyPath"|"verifyUrl">;
export type DisplaySnapshot = Readonly<{
  ownerUserId: string; username: string; originals: readonly ImportedSourceDisplayAnnotation[];
  retainedPublicInventory?: Readonly<{ sourceArtifactDigest: string }>;
  sourceMarketPreviewArtifactDigest?: string;
}>;
type RetainedInput = Readonly<{
  originals: readonly ProfileOriginal[]; ownerUserId: string; ownerUsername: string;
  sourceArtifactDigest: string; retained: DisplaySnapshot | null; ownerReceizId?:string;
}>;

/** Reuse only annotations beneath this exact accepted Source. This does not
 * add membership or allow a derivative snapshot to replace a held Original. */
export function reuseRetainedImportedSourceMarketPreviews(input: RetainedInput): ProfileOriginal[] {
  const retained = input.retained;
  if (!retained || retained.ownerUserId !== input.ownerUserId
    || (retained.sourceMarketPreviewArtifactDigest ?? retained.retainedPublicInventory?.sourceArtifactDigest) !== input.sourceArtifactDigest) return [...input.originals];
  const candidates = new Map(retained.originals.map(original => [original.id, original]));
  return input.originals.map(original => {
    const candidate = candidates.get(original.id);
    if (original.marketPreview || !original.importedSource || !candidate?.marketPreview?.livePulseSeed
      || candidate.pulse !== original.pulse || candidate.hasPbiSignature !== original.hasPbiSignature
      || candidate.pbiReceiptHash !== original.pbiReceiptHash
      || jcsCanonicalize(candidate.importedSource ?? null) !== jcsCanonicalize(original.importedSource)) return original;
    return { ...original, marketPreview: candidate.marketPreview,
      ...(original.assetTitle&&candidate.assetTitle===original.assetTitle&&candidate.claim===original.claim?{
        originalCreator:candidate.originalCreator,ownershipKind:candidate.ownershipKind,ownershipRole:candidate.ownershipRole,
        claimHashHex:candidate.claimHashHex,verifyPath:candidate.verifyPath,verifyUrl:candidate.verifyUrl}:{}),
    };
  });
}

/** New publications supply their existing canonical opens. Old missing display
 * metadata needs one exact Source recovery, then the normal snapshot retains
 * it. Repeated references share an open; independent reads are bounded to four.
 * Missing presentation evidence never erases the already admitted Original. */
export async function restoreImportedSourceMarketPreviews(input: RetainedInput & Readonly<{
  sources?: readonly OpenedImportedProofSource[];
  reopen?: (reference: NonNullable<ProfileOriginal["importedSource"]>["reference"]) => Promise<OpenedImportedProofSource>;
}>): Promise<ProfileOriginal[]> {
  let originals = reuseRetainedImportedSourceMarketPreviews(input);
  const sources = [...input.sources ?? []];
  originals = attachImportedSourceMarketPreviews({ ...input, originals, sources });
  if (!input.reopen || input.sources !== undefined) return originals;
  const references = new Map(originals.filter(importedSourceMarketPreviewNeedsRecovery)
    .map(original => [original.importedSource!.reference.artifactSha256, original.importedSource!.reference]));
  const missing = [...references.values()];
  for (let offset = 0; offset < missing.length; offset += 4) {
    const opened = await Promise.allSettled(missing.slice(offset, offset + 4).map(reference => input.reopen!(reference)));
    for (const result of opened) if (result.status === "fulfilled") sources.push(result.value);
  }
  return attachImportedSourceMarketPreviews({ ...input, originals, sources });
}
