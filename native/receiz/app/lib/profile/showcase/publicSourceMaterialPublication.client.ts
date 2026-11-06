"use client";

import { DURABLE_LOCAL_TRUTH_RANK, readDurableLocalTruthItem, writeDurableLocalTruthItem } from "@/app/lib/runtime/localTruthStore";
import { peekHeldProfileShowcasePublicSource,readAcceptedProfileShowcaseTransitionDisplay, type ProfileShowcaseBoundedEdgeVault,type ProfileShowcasePublicationSource } from "./boundedEdgeVault";
import type { ProfileShowcaseArtifactId } from "./types";
import type { ProfileViewData } from "../types";
import { projectOwnerShowcaseOriginals } from "./ownerSourceProjection";
import { profileShowcaseCompleteSourceBindsHeldProfile } from "../routeHydration";
import { peekRecoveredAccountShowcaseScope } from "./recoveredAccountScope.client";
import { publishHeldReceizMaterialSourceFamily } from "@/app/lib/documentSeal/materialSourcePublication.client";

const MEDIA_ACK_SCHEMA = "receiz.profile-showcase.exact-public-material-family-ack.v2";
const deliveredScopes = new Set<string>();

/** Reuse the existing selected complete Source's public projection. This never
 * exports private archives or reopens known Source proof before local paint. */
export async function publishCurrentProfileShowcaseMaterial(input: Readonly<{
  vault: ProfileShowcaseBoundedEdgeVault;source?:ProfileShowcasePublicationSource; artifactId: ProfileShowcaseArtifactId; artifactDigest: string;
  username: string; profileIdentity: string; isCurrent(): Promise<boolean>;
}>): Promise<void> {
  if (!await input.isCurrent()) throw Error("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
  const origin = new URL(typeof window !== "undefined" ? window.location.origin : "https://receiz.com").origin;
  const scope = [origin, input.artifactId, input.artifactDigest, input.profileIdentity, input.username];
  const scopeKey = JSON.stringify(scope), receiptKey = `${MEDIA_ACK_SCHEMA}:${scopeKey}`;
  // Exact material-family delivery only: named resources are independently
  // checked beneath the canonically admitted Source before server promotion.
  // This receipt grants no Source or named-media publication acknowledgement.
  if (deliveredScopes.has(scopeKey)) return;
  try {
    const receipt = JSON.parse(readDurableLocalTruthItem(receiptKey) ?? "null");
    if (receipt?.schema === MEDIA_ACK_SCHEMA && JSON.stringify(receipt.scope) === scopeKey) {
      deliveredScopes.add(scopeKey); return;
    }
  } catch { /* Missing/damaged delivery state retries existing Source custody. */ }
  let originals:readonly import('../types').ProfileOriginal[];
  if(input.source&&!('witnessNodes' in input.source)){
    if(input.source.artifactDigest!==input.artifactDigest)throw Error('PROFILE_SHOWCASE_PUBLIC_MATERIAL_SOURCE_BINDING_INVALID');
    const selected=await readAcceptedProfileShowcaseTransitionDisplay(input.source);
    if(selected.artifactId!==input.artifactId)throw Error('PROFILE_SHOWCASE_PUBLIC_MATERIAL_SOURCE_BINDING_INVALID');
    if(selected.profileIdentity!==input.profileIdentity){
      const binding=peekRecoveredAccountShowcaseScope({username:input.username,accountId:input.profileIdentity,artifactId:input.artifactId});
      if(!binding||binding.proofIdentity!==selected.profileIdentity||!await input.vault.isVerifiedPublicationAncestor(input.artifactId,binding.locator.acceptedArtifactDigest,input.artifactDigest))throw Error('PROFILE_SHOWCASE_PUBLIC_MATERIAL_SOURCE_BINDING_INVALID');
    }
    originals=selected.originals;
  }else{
  const held = peekHeldProfileShowcasePublicSource(input.artifactId);
  const complete = held?.source.artifactDigest === input.artifactDigest && held.complete.artifactDigest === input.artifactDigest
    ? held.complete : await input.vault.readCompleteSource(input.artifactId, input.artifactDigest, { retainedHiddenOnly: true });
  if (!complete || complete.artifactDigest !== input.artifactDigest || complete.carrier.artifactId !== input.artifactId) {
    throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_SOURCE_BINDING_INVALID");
  }
  if (!profileShowcaseCompleteSourceBindsHeldProfile(input.username,
    { profile: { username: input.username, userId: input.profileIdentity } } as ProfileViewData, complete)) {
    // A recovered account retains its accepted sealed subject while a lawful
    // successor can precede the synchronous ancestry locator. Reuse the same
    // existing verified-vault boundary as public route recovery.
    const binding = peekRecoveredAccountShowcaseScope({ username: input.username,
      accountId: input.profileIdentity, artifactId: input.artifactId });
    if (!binding || binding.proofIdentity !== complete.carrier["profile-showcase"].profileIdentity
      || !await input.vault.isVerifiedPublicationAncestor(input.artifactId,
        binding.locator.acceptedArtifactDigest, complete.artifactDigest).catch(() => false)) {
      throw Error("PROFILE_SHOWCASE_PUBLIC_MATERIAL_SOURCE_BINDING_INVALID");
    }
    if (!await input.isCurrent()) throw Error("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
  }
    originals=projectOwnerShowcaseOriginals(complete,{publicOnly:true});
  }
  const delivered = new Set<string>();
  for (const original of originals) {
    const media = original.media;
    const locations: readonly (string | null | undefined)[] = [media?.material?.proofObjectUrl, media?.src,
      media?.playbackSrc, media?.originalDownloadSrc, media?.derivativeDownloadSrc,
      media?.videoPosterSrc, media?.audioCoverSrc, media?.epubCoverSrc,
      ...Object.values(media?.imageVariants ?? {}), ...Object.values(media?.videoPosterImageVariants ?? {}),
      ...Object.values(media?.audioCoverImageVariants ?? {}), ...Object.values(media?.epubCoverImageVariants ?? {}),
      ...(original.attachments ?? []).map(attachment => attachment.src)];
    for (const location of locations) {
      if (!location || !/[#&]material=/.test(location) || delivered.has(location)) continue;
      await publishHeldReceizMaterialSourceFamily(location, { origin, isCurrent: input.isCurrent,
        ...(location === media?.material?.proofObjectUrl ? { expectedSealedArtifactSha256: media.material.sealedArtifactSha256Hex } : {}) });
      delivered.add(location);
    }
  }
  if (!await input.isCurrent()) throw Error("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
  try { writeDurableLocalTruthItem(receiptKey, JSON.stringify({ schema: MEDIA_ACK_SCHEMA, scope }), {
    rank: DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot, source: "profile-showcase-complete-public-material-delivery",
  }); } catch { /* Successful exact delivery survives a weaker receipt-storage failure. */ }
  deliveredScopes.add(scopeKey);
}
