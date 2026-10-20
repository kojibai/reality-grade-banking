"use client";

import { DURABLE_LOCAL_TRUTH_RANK, readDurableLocalTruthItem, writeDurableLocalTruthItem } from "@/app/lib/runtime/localTruthStore";
import type { ProfileShowcaseAcceptedRouteMigrationBinding } from "./boundedProjection.server";
import type { ProfileShowcaseArtifactId } from "./types";

type RecoveredAccountShowcaseScopeInput = Readonly<{
  username: string; accountId: string; artifactId?: ProfileShowcaseArtifactId;
}>;

function qualifies(input: RecoveredAccountShowcaseScopeInput, value: unknown): value is ProfileShowcaseAcceptedRouteMigrationBinding {
    const binding = value as ProfileShowcaseAcceptedRouteMigrationBinding | null;
    return binding?.schema === "receiz.profile-showcase.route-migration-binding.v1"
      && binding.status === "accepted" && binding.username === input.username
      && binding.profileIdentity === input.accountId && Boolean(binding.proofIdentity)
      && /^profile-showcase:[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(binding.locator?.showcaseArtifactId ?? "")
      && (!input.artifactId || binding.locator.showcaseArtifactId === input.artifactId)
      && /^[0-9a-f]{64}$/.test(binding.locator.acceptedArtifactDigest);
}

/** Reuse the exact held relationship during prepared entry; no transport,
 * session lookup, or new source admission precedes local proof projection. */
export function peekRecoveredAccountShowcaseScope(input: RecoveredAccountShowcaseScopeInput): ProfileShowcaseAcceptedRouteMigrationBinding | null {
  const key = `receiz.profile-showcase.accepted-account-scope.v1:${input.accountId}:${input.username}`;
  try {
    const held = JSON.parse(readDurableLocalTruthItem(key) ?? "null");
    if (qualifies(input, held)) return held;
  } catch { /* Only an exact accepted relationship can be reused. */ }
  return null;
}

/** Retain the existing accepted account/source relationship. This is placement
 * scope beneath the admitted Identity Record and source, never a new issuer,
 * actor alias, artifact admission, or replacement for sealed history. */
export async function readRecoveredAccountShowcaseScope(input: RecoveredAccountShowcaseScopeInput,
  fetchImpl: typeof fetch = fetch): Promise<ProfileShowcaseAcceptedRouteMigrationBinding | null> {
  const held = peekRecoveredAccountShowcaseScope(input);
  if (held) return held;
  const key = `receiz.profile-showcase.accepted-account-scope.v1:${input.accountId}:${input.username}`;
  try {
    const response = await fetchImpl(`/api/profile/showcase/accepted-source?username=${encodeURIComponent(input.username)}`, {
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body.status !== "accepted" || !qualifies(input, body.binding)
      || body.artifactId !== body.binding.locator.showcaseArtifactId
      || body.transport?.artifactDigest !== body.binding.locator.acceptedArtifactDigest) return null;
    writeDurableLocalTruthItem(key, JSON.stringify(body.binding), {
      rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
      source: "accepted-showcase-account-relationship",
    });
    return body.binding;
  } catch { return null; }
}
