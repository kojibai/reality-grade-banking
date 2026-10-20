"use client";

import type { ProfileShowcaseBoundedEdgeVault, ProfileShowcaseCompletePublicSource } from "./boundedEdgeVault";
import type { ProfileShowcaseArtifactId } from "./types";
import { reconstructProfileShowcaseCompleteSourceTransport, type ProfileShowcaseCompleteSourceTransport } from "./completeSourceTransport";
import { retainAcceptedShowcasePredecessor } from "./acceptedPredecessorCustody";

/** Background source recovery only. Known local custody never calls delivery.
 * Failure preserves the existing outbox; it cannot create a competing genesis. */
export async function recoverAcceptedShowcasePredecessor(input: Readonly<{
  username: string; artifactId: ProfileShowcaseArtifactId; vault: ProfileShowcaseBoundedEdgeVault;
  fetchImpl?: typeof fetch;
  retainImportedSources?: (source:ProfileShowcaseCompletePublicSource)=>Promise<void>;
}>) {
  const held = await input.vault.reopenHead(input.artifactId);
  if (held) {
    try {
      const complete=await input.vault.exportCompleteSource(input.artifactId);
      if(complete){await input.retainImportedSources?.(complete);return held;}
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE") throw error;
    }
  }
  const admission = await readAcceptedShowcasePredecessor(input);
  if (admission && !held) await input.vault.selectOwnerRestoreHead(admission, null, undefined, undefined, true);
  return admission;
}

export async function readAcceptedShowcasePredecessor(input: Readonly<{
  username: string; artifactId: ProfileShowcaseArtifactId; vault: ProfileShowcaseBoundedEdgeVault;
  fetchImpl?: typeof fetch;
  retainImportedSources?: (source:ProfileShowcaseCompletePublicSource)=>Promise<void>;
}>) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const path = "/api/profile/showcase/accepted-source";
  const response = await fetchImpl(`${path}?username=${encodeURIComponent(input.username)}`, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING");
  const body = await response.json() as { status: string; artifactId?: string; transport?: ProfileShowcaseCompleteSourceTransport };
  if (body.status === "unmigrated") return null;
  if (body.status !== "accepted" || body.artifactId !== input.artifactId || !body.transport) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING");
  const source = await reconstructProfileShowcaseCompleteSourceTransport(body.transport, async reference => {
    const block = await fetchImpl(`${path}?username=${encodeURIComponent(input.username)}&block=${encodeURIComponent(JSON.stringify(reference))}`, { credentials: "same-origin", cache: "no-store" });
    if (!block.ok) throw new TypeError("PROFILE_SHOWCASE_PREDECESSOR_DELIVERY_PENDING");
    return new Uint8Array(await block.arrayBuffer());
  });
  const admission = await retainAcceptedShowcasePredecessor({ source, artifactId: input.artifactId, vault: input.vault });
  await input.retainImportedSources?.(source);
  return admission;
}
