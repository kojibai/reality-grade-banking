"use client";

import type { ProfileOriginal } from "@/app/lib/profile/types";
import {
  profileOriginalProofIdentityKey,
} from "@/app/lib/profile/pbiSignatureHistory";
import type {
  ReceizCommitDomainId,
  ReceizKeyFile,
  ReceizVerifiedIdentityArtifactAdmission,
  ReceizVerifiedPortableStateAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import type {
  ProfileShowcaseBoundedEdgeVault,
} from "./boundedEdgeVault";
import type { ProfileShowcaseSealer } from "./artifact";
import {
  sealAndAdmitComposerProfileOriginalChild,
} from "./composerChild";
import {
  createAndSealProfileShowcaseMigrationGenesis,
} from "./migration";
import { sealProfileShowcaseSegment } from "./segments";
import {
  COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
  canonicalizeCompleteLegacyShowcaseOriginals,
  encodeCompleteLegacyShowcaseMigrationPayload,
  isLegacyMigrationProfileOriginal,
  partitionCompleteLegacyShowcaseMigrationOriginals,
} from "./legacyMigrationPayload";

export type CompleteLegacyProfilePage = Readonly<{
  originals: readonly ProfileOriginal[];
  hasMore: boolean;
  nextCursor: string | null;
}>;

/**
 * The canonical row may replace the composer's optimistic id after admission.
 * Stable proof coordinates identify the same sealed Original without letting
 * a mutable row identity decide membership.
 */
export function completeLegacyShowcaseCarriesProfileOriginal(
  originals: readonly ProfileOriginal[],
  candidate: ProfileOriginal,
): boolean {
  const candidateIdentity = profileOriginalProofIdentityKey(candidate);
  return originals.some((original) => (
    original.id === candidate.id
    || (
      candidateIdentity.length > 0
      && profileOriginalProofIdentityKey(original) === candidateIdentity
    )
  ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchProductionPage(
  username: string,
  cursor: string | null,
  manage: boolean,
): Promise<CompleteLegacyProfilePage> {
  const params = new URLSearchParams({ limit: "240" });
  if (manage) params.set("manage", "1");
  else params.set("source", "inventory");
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(
    `/api/profile/${encodeURIComponent(username)}/originals?${params.toString()}`,
    { cache: "no-store", headers: { "cache-control": "no-store" } },
  );
  const body = await response.json() as unknown;
  if (
    !response.ok
    || !isRecord(body)
    || body.ok !== true
    || !Array.isArray(body.originals)
    || !body.originals.every(isLegacyMigrationProfileOriginal)
    || !isRecord(body.page)
  ) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_PAGE_INVALID");
  }
  const nextCursor = typeof body.page.nextCursor === "string"
    && body.page.nextCursor.trim()
    ? body.page.nextCursor.trim()
    : null;
  return {
    originals: body.originals,
    hasMore: body.page.hasMore === true,
    nextCursor,
  };
}

/**
 * One-time migration evidence loader. It must traverse the complete canonical
 * owner showcase before the Identity Record can adopt it into sealed local
 * custody. Hidden Originals remain carried proof truth even though they are
 * excluded from the visible first-paint projection. A partial page is never
 * treated as a complete showcase.
 */
export async function loadCompleteLegacyProfileShowcase(input: Readonly<{
  username: string;
  /** Public-only discovery for a hydrated public membership gap. */
  manage?: boolean;
  fetchPage?: (
    cursor: string | null,
  ) => Promise<CompleteLegacyProfilePage>;
}>): Promise<readonly ProfileOriginal[]> {
  const username = input.username.trim().normalize("NFC").toLowerCase();
  if (!username) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_USERNAME_INVALID");
  }
  const fetchPage = input.fetchPage
    ?? ((cursor: string | null) => fetchProductionPage(username, cursor, input.manage !== false));
  const collected: ProfileOriginal[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    const page = await fetchPage(cursor);
    collected.push(...page.originals);
    if (!page.hasMore) break;
    const nextCursor = page.nextCursor?.trim() || null;
    if (
      nextCursor === null
      || nextCursor === cursor
      || seenCursors.has(nextCursor)
    ) {
      throw new TypeError(
        "PROFILE_SHOWCASE_LEGACY_MIGRATION_CURSOR_STALLED",
      );
    }
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }
  return canonicalizeCompleteLegacyShowcaseOriginals(collected);
}

/**
 * Creates the first bounded head only after the complete existing visible
 * showcase has itself become one sealed observed-and-adopted child proof
 * object. A genuinely empty profile still receives the native empty genesis.
 */
export async function migrateCompleteLegacyShowcaseBeforeGenesis(
  input: Readonly<{
    ownerReceizIdentity: string;
    migrationKaiUpulse: string;
    originals: readonly ProfileOriginal[];
    actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
    keyFile: ReceizKeyFile;
    passphrase: string;
    commitDomain: ReceizCommitDomainId;
    sealer: ProfileShowcaseSealer;
    childSealer?: import("./composerChild").ComposerProfileOriginalChildSealer;
    boundedVault: ProfileShowcaseBoundedEdgeVault;
    appendMigrationChild?: (
      child: ReceizVerifiedPortableStateAdmission,
    ) => Promise<void>;
  }>,
): Promise<void> {
  const originals =
    canonicalizeCompleteLegacyShowcaseOriginals(input.originals);
  const chunks = partitionCompleteLegacyShowcaseMigrationOriginals({
    ownerReceizIdentity: input.ownerReceizIdentity,
    originals,
  });
  const sealChunk = (
    chunk: readonly ProfileOriginal[],
    index: number,
  ) => sealAndAdmitComposerProfileOriginalChild({
    renderedSealedBytes: encodeCompleteLegacyShowcaseMigrationPayload({
      ownerReceizIdentity: input.ownerReceizIdentity,
      originals: chunk,
    }),
    renderedMimeType: COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME,
    ownerReceizId: input.ownerReceizIdentity,
    immutableVersion: input.migrationKaiUpulse,
    seal: input.childSealer,
    routeProjection: {
      id: index === 0
        ? `migration:${input.ownerReceizIdentity}`
        : `migration:${input.ownerReceizIdentity}:${index + 1}`,
      slug: index === 0
        ? "complete-showcase-migration"
        : `complete-showcase-migration-${index + 1}`,
      code: `MIG${String(index + 1).padStart(5, "0")}`,
    },
  });
  const migrationChild = chunks[0] ? await sealChunk(chunks[0], 0) : null;
  const genesis = await createAndSealProfileShowcaseMigrationGenesis({
    ownerReceizIdentity: input.ownerReceizIdentity,
    migrationKaiUpulse: input.migrationKaiUpulse,
    actorAdmission: input.actorAdmission,
    keyFile: input.keyFile,
    passphrase: input.passphrase,
    commitDomain: input.commitDomain,
    sealer: input.sealer,
    ...(migrationChild ? { migrationChild } : {}),
  });
  const operation = genesis.payload.directOperations[0];
  const segments = operation
    ? [await sealProfileShowcaseSegment([operation])]
    : [];
  await input.boundedVault.admit({
    showcaseAdmission: genesis.admission,
    children: migrationChild && operation?.kind === "showcase.append"
      ? [{
          reference: operation.child,
          admittedArtifact: migrationChild,
        }]
      : [],
    segments,
  });
  const reopened = await input.boundedVault.reopenHead(genesis.artifactId);
  if (!reopened || reopened.artifactSha256 !== genesis.artifactDigest) {
    throw new TypeError("PROFILE_SHOWCASE_MIGRATION_GENESIS_CUSTODY_REQUIRED");
  }
  if (chunks.length > 1 && !input.appendMigrationChild) {
    throw new TypeError("PROFILE_SHOWCASE_MIGRATION_SEGMENT_APPEND_REQUIRED");
  }
  for (let index = 1; index < chunks.length; index += 1) {
    await input.appendMigrationChild!(await sealChunk(chunks[index]!, index));
  }
}
