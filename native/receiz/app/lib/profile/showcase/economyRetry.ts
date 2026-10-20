"use client";

import type { ReceizVerifiedProfileShowcaseAdmission } from "../../../../packages/receiz-sdk/src/index";
import type {
  ProfileShowcaseBoundedEdgeVault,
  ProfileShowcaseBoundedReconciliationAttempt,
} from "./boundedEdgeVault";
import type { ProfileShowcaseArtifactId } from "./types";

type EconomyAppender = (
  admission: ReceizVerifiedProfileShowcaseAdmission,
) => Promise<Readonly<{ artifactDigest: string }>>;

async function defaultAppend(
  admission: ReceizVerifiedProfileShowcaseAdmission,
) {
  const { appendProfileShowcaseToBrowserEconomy } = await import(
    "@/app/lib/economy/showcase/browserEdgeVault"
  );
  return appendProfileShowcaseToBrowserEconomy(admission);
}

function errorCode(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "PROFILE_SHOWCASE_ECONOMY_APPEND_UNAVAILABLE";
}

async function recordPendingFailure(
  vault: ProfileShowcaseBoundedEdgeVault,
  attempt: ProfileShowcaseBoundedReconciliationAttempt,
  error: unknown,
): Promise<void> {
  await vault.recordEconomyAppendResult({
    attemptId: attempt.attemptId,
    status: "pending",
    acceptedEconomyArtifactDigest: null,
    lastError: errorCode(error),
  });
}

/**
 * The profile vault creates the economy intent in the same transaction that
 * admits the sealed profile head. Delivery may fail; the intent cannot.
 */
export async function enqueueProfileShowcaseIntoBrowserEconomy(input: Readonly<{
  artifactId: ProfileShowcaseArtifactId;
  vault: ProfileShowcaseBoundedEdgeVault;
  append?: EconomyAppender;
}>): Promise<void> {
  const admission = await input.vault.reopenHead(input.artifactId);
  if (!admission) {
    throw new TypeError("PROFILE_SHOWCASE_ECONOMY_CUSTODY_REQUIRED");
  }
  const attemptId = `profile-showcase:${admission.artifactSha256}`;
  const attempt = await input.vault.reconciliationAttempt(attemptId);
  if (!attempt) {
    throw new TypeError("PROFILE_SHOWCASE_ECONOMY_INTENT_REQUIRED");
  }
  try {
    const economy = await (input.append ?? defaultAppend)(admission);
    await input.vault.recordEconomyAppendResult({
      attemptId,
      status: "accepted",
      acceptedEconomyArtifactDigest: economy.artifactDigest,
      lastError: null,
    });
  } catch (error) {
    await recordPendingFailure(input.vault, attempt, error);
    throw error;
  }
}

/**
 * Replays only the newest sealed descendant for each stable profile identity.
 * Accepting that cumulative descendant settles every older pending intent for
 * the same profile without appending stale ancestors into the economy.
 */
export async function flushPendingProfileShowcaseEconomyAppends(
  vault: ProfileShowcaseBoundedEdgeVault,
  append: EconomyAppender = defaultAppend,
): Promise<Readonly<{ accepted: number; pending: number }>> {
  const pending = await vault.pendingEconomyAppendAttempts();
  const newestByArtifact = new Map<
    ProfileShowcaseArtifactId,
    ProfileShowcaseBoundedReconciliationAttempt
  >();
  for (const attempt of pending) {
    const current = newestByArtifact.get(attempt.artifactId);
    if (
      !current
      || BigInt(attempt.headKaiUpulse) > BigInt(current.headKaiUpulse)
      || (
        attempt.headKaiUpulse === current.headKaiUpulse
        && attempt.artifactDigest.localeCompare(current.artifactDigest) > 0
      )
    ) {
      newestByArtifact.set(attempt.artifactId, attempt);
    }
  }
  let accepted = 0;
  let stillPending = 0;
  for (const [artifactId, newest] of newestByArtifact) {
    const admission = await vault.reopenHead(artifactId);
    if (!admission || admission.artifactSha256 !== newest.artifactDigest) {
      stillPending += 1;
      continue;
    }
    try {
      const economy = await append(admission);
      const covered = pending.filter((attempt) =>
        attempt.artifactId === artifactId
        && BigInt(attempt.headKaiUpulse) <= BigInt(newest.headKaiUpulse)
      );
      for (const attempt of covered) {
        await vault.recordEconomyAppendResult({
          attemptId: attempt.attemptId,
          status: "accepted",
          acceptedEconomyArtifactDigest: economy.artifactDigest,
          lastError: null,
        });
      }
      accepted += covered.length;
    } catch (error) {
      await recordPendingFailure(vault, newest, error);
      stillPending += 1;
    }
  }
  return Object.freeze({ accepted, pending: stillPending });
}
