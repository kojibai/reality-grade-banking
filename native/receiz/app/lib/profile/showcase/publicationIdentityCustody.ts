"use client";

import { readReceizIdentityPublicBinding } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import type { ReceizVerifiedIdentityArtifactAdmission } from "../../../../packages/receiz-sdk/src/artifactAdmissionTypes";
import type { ReceizKeyFile } from "../../../../packages/receiz-sdk/src/identity";
import { peekActiveIdentityCustodyContext } from "@/app/lib/auth/activeIdentityCustodyContext";
import { createReceizIdentityArtifactCustody, type ReceizIdentityArtifactCustody } from "@/app/lib/auth/receizIdentityArtifactCustody";
import { readReceizKeyFileFromBlob } from "@/app/utils/receizIdentityKey";
import { readProfileShowcasePublicSourceActorCustody, type ProfileShowcaseCompletePublicSource } from "./boundedEdgeVault";

export type PublicationIdentityCustody = Readonly<{ actorAdmission: ReceizVerifiedIdentityArtifactAdmission; keyFile: ReceizKeyFile; passphrase?: string }>;

/** Reuse the selected source's held identity; do not switch the visible account
 * or create/reseal an identity to make optional publication possible. */
export async function resolvePublicationIdentityCustody(source: ProfileShowcaseCompletePublicSource,
  dependencies: Readonly<{ readActive?: () => PublicationIdentityCustody | null; custody?: ReceizIdentityArtifactCustody }> = {},
): Promise<PublicationIdentityCustody | null> {
  const selected = readProfileShowcasePublicSourceActorCustody(source);
  if (!selected?.roots.length) return null;
  const active = (dependencies.readActive ?? peekActiveIdentityCustodyContext)();
  // A successor may carry its recovered account signer's evidence while the
  // stable Showcase profileIdentity continues to name the original subject.
  // Publication separately verifies that signer's accepted account placement.
  // A retained historical contributor root cannot select that contributor in
  // place of the source subject or the current sealed transition's signer.
  if (active && selected.roots.includes(active.actorAdmission.actor.evidenceDigest.value)
    && (active.actorAdmission.actor.actorId === selected.actorId
      || selected.currentActorEvidenceRoots.includes(active.actorAdmission.actor.evidenceDigest.value))) return active;
  const custody = dependencies.custody ?? createReceizIdentityArtifactCustody();
  const held = await custody.readAdmittedForActor({ actorId: selected.actorId, actorEvidenceRoots: selected.roots });
  if (!held) return null;
  const actorAdmission = await custody.reopen({ ...held.selector, passphrase: "" });
  if (!actorAdmission || !selected.roots.includes(actorAdmission.actor.evidenceDigest.value)) return null;
  const basis = await readReceizIdentityPublicBinding(actorAdmission);
  const keyFile = await readReceizKeyFileFromBlob(held.artifact);
  if (basis.keyId !== keyFile.keyId || basis.publicKeyRawB64u !== keyFile.crypto.publicKeyRawB64u) return null;
  return { actorAdmission, keyFile, passphrase: "" };
}
