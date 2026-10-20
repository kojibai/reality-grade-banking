import {
  rederiveReceizEconomyShowcaseCarrierFromAdmission,
  type ReceizVerifiedEconomyShowcaseAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import {
  admitVerifiedProfileShowcaseForEconomy,
  restoreVerifiedEconomyShowcaseFromRecoveredHistory,
} from "./artifact";
import type {
  EconomyShowcaseProfileAdmission,
  VerifiedEconomyShowcase,
} from "./types";

export async function recoverVerifiedEconomyShowcaseHistory(input: Readonly<{
  activeAdmission: ReceizVerifiedEconomyShowcaseAdmission;
  loadEconomyAdmission(
    artifactDigest: string,
  ): Promise<ReceizVerifiedEconomyShowcaseAdmission | null>;
  loadProfileAdmission(
    artifactDigest: string,
  ): Promise<ReceizVerifiedProfileShowcaseAdmission | null>;
}>): Promise<VerifiedEconomyShowcase> {
  const history: ReceizVerifiedEconomyShowcaseAdmission[] = [];
  const newestProfiles = new Map<string, EconomyShowcaseProfileAdmission>();
  const visited = new Set<string>();
  let cursor: ReceizVerifiedEconomyShowcaseAdmission | null =
    input.activeAdmission;

  while (cursor) {
    const verified = cursor;
    if (
      verified.profile !== "economy-showcase"
      || verified.proofHistoryHead === null
      || visited.has(verified.artifactSha256)
    ) {
      throw new TypeError("ECONOMY_SHOWCASE_HISTORY_RECOVERY_INVALID");
    }
    visited.add(verified.artifactSha256);
    history.push(verified);
    const carrier =
      await rederiveReceizEconomyShowcaseCarrierFromAdmission(verified);
    for (const operation of carrier["economy-showcase"].directOperations) {
      const reference = operation.profileShowcase;
      const source = await input.loadProfileAdmission(
        reference.artifactDigest,
      );
      if (!source) {
        throw new TypeError("ECONOMY_SHOWCASE_PROFILE_HISTORY_MISSING");
      }
      const profile = await admitVerifiedProfileShowcaseForEconomy(source);
      if (
        profile.artifactId !== reference.artifactId
        || profile.artifactDigest !== reference.artifactDigest
        || profile.historyHeadDigest !== reference.historyHeadDigest
        || profile.admissionEvidenceRoot !== reference.admissionEvidenceRoot
      ) {
        throw new TypeError("ECONOMY_SHOWCASE_PROFILE_HISTORY_SUBSTITUTED");
      }
      const current = newestProfiles.get(profile.artifactId);
      if (
        !current
        || BigInt(profile.headKaiUpulse) > BigInt(current.headKaiUpulse)
        || (
          profile.headKaiUpulse === current.headKaiUpulse
          && profile.artifactDigest.localeCompare(current.artifactDigest) > 0
        )
      ) {
        newestProfiles.set(profile.artifactId, profile);
      }
    }
    const parents = carrier["economy-showcase"].parentArtifactDigests;
    if (parents.length === 0) {
      cursor = null;
    } else if (parents.length === 1) {
      cursor = await input.loadEconomyAdmission(parents[0]!);
      if (!cursor) {
        throw new TypeError("ECONOMY_SHOWCASE_HISTORY_PREDECESSOR_MISSING");
      }
    } else {
      throw new TypeError("ECONOMY_SHOWCASE_HISTORY_PARENT_INVALID");
    }
  }

  return restoreVerifiedEconomyShowcaseFromRecoveredHistory({
    admission: input.activeAdmission,
    profileShowcases: [...newestProfiles.values()].sort((left, right) =>
      left.artifactId.localeCompare(right.artifactId)
    ),
    economyHistory: history,
  });
}


/** Reopen held source custody; absence and failed recovery are different states. */
export async function recoverHeldEconomyShowcase(input: Readonly<{
  loadActiveAdmission(): Promise<ReceizVerifiedEconomyShowcaseAdmission | null>;
  loadEconomyAdmission(artifactDigest: string): Promise<ReceizVerifiedEconomyShowcaseAdmission | null>;
  loadProfileAdmission(artifactDigest: string): Promise<ReceizVerifiedProfileShowcaseAdmission | null>;
}>): Promise<VerifiedEconomyShowcase | null> {
  const activeAdmission = await input.loadActiveAdmission();
  if (!activeAdmission) return null;
  return recoverVerifiedEconomyShowcaseHistory({
    activeAdmission,
    loadEconomyAdmission: input.loadEconomyAdmission,
    loadProfileAdmission: input.loadProfileAdmission,
  });
}
