"use client";

import type {
  ProfileShowcaseBoundedEdgeVault,
  ProfileShowcaseCompletePublicSource,
} from "./boundedEdgeVault";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import {
  publishProfileShowcasePublicProjection,
  type ProfileShowcasePublicProjectionPublicationResult,
} from "./publicProjectionPublication";
import {
  profileShowcaseCompletePublicationScopeKey,
  type ProfileShowcaseCompletePublicationScope,
} from "./publicProjectionScope";
import {
  readProfileShowcasePublicationRoute,
  type ProfileShowcasePublicationRoute,
} from "./publicProjectionScope.client";
import { peekProfileRouteHydrationSeed, peekProfileRouteSnapshot } from "../routeHydration";
import type { ProfileShowcaseArtifactId } from "./types";
import { refreshAcceptedPublicProfileDocument } from "./publicProfileDocumentRefresh.client";

export type PublicProjectionPublisher = (
  source: ProfileShowcaseCompletePublicSource,
  ownerReceizId: string,
) => Promise<ProfileShowcasePublicProjectionPublicationResult>;

type CapturedOutcome =
  | Readonly<{ status: "published" }>
  | Readonly<{ status: "pending" | "rejected"; code: string }>;

type RetryOptions = Readonly<{
  readRoute?: () => ProfileShowcasePublicationRoute | null;
  refreshDocument?: typeof refreshAcceptedPublicProfileDocument;
}>;

/** A public profile's held identity is only a delivery coordinate. The sealed
 * Showcase and its accepted predecessor remain the publication authority. */
export function visibleProfileShowcasePublicationRoute(
  artifactId: ProfileShowcaseArtifactId,
  pathname: string,
  profile: Readonly<{ profile: Readonly<{ username: string; userId: string }> }> | null,
): ProfileShowcasePublicationRoute | null {
  // The sealed custody owner may be a device Receiz ID, while the public
  // route is the account username. The route only supplies delivery
  // coordinates; the admitted artifact and publisher bind source authority.
  if (!/^profile-showcase:[a-z0-9][a-z0-9._-]*\.receiz\.id$/.test(artifactId)
    || !profile?.profile.userId.trim()) return null;
  const username = profile.profile.username.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return null;
  const path = pathname.replace(/\/$/, "");
  return path === `/${username}` || path === `/u/${username}`
    ? Object.freeze({ username, profileIdentity: profile.profile.userId })
    : null;
}

function readCurrentPublicationRoute(artifactId: ProfileShowcaseArtifactId): ProfileShowcasePublicationRoute | null {
  const accountRoute = readProfileShowcasePublicationRoute();
  if (accountRoute || typeof window === "undefined") return accountRoute;
  const username = /^\/(?:u\/)?([a-z0-9_]{3,24})\/?$/.exec(window.location.pathname)?.[1];
  if (!username) return null;
  const profile = peekProfileRouteSnapshot(username, { includeSupersededWholeMarketSnapshot: true })?.profile
    ?? peekProfileRouteHydrationSeed(username);
  return visibleProfileShowcasePublicationRoute(artifactId, window.location.pathname, profile);
}

export type ProfileShowcasePublicProjectionFlushResult = Readonly<{
  published: number;
  pending: number;
  rejected: number;
}>;

export type ProfileShowcasePublicProjectionEnsureResult = Readonly<{
  /** Preserves the existing count: zero when an exact receipt was already held. */
  published: number;
  /** Unconfirmed delivery: remains 1 for rejection as well as pending. */
  pending: number;
  status: "published" | "pending" | "rejected";
  code: string | null;
  /** The captured publication head, not a claim about a later local head. */
  artifactDigest: string | null;
}>;

const ACK_SCHEMA = "receiz.profile-showcase.exact-public-source-ack.v2";
const acknowledged = new Map<string, ProfileShowcaseCompletePublicationScope>();
const acknowledgedOperationCounts = new Map<string, number>();
type AcknowledgmentObserver = (scope: ProfileShowcaseCompletePublicationScope) => void;
const acknowledgmentObservers = new Set<AcknowledgmentObserver>();

function notifyAcknowledgment(observer: AcknowledgmentObserver, scope: ProfileShowcaseCompletePublicationScope): void {
  try { observer(scope); } catch {
    // Presentation cannot change a validated distribution receipt.
  }
}

/** Observe already-validated delivery only. This never publishes, polls, or
 * admits proof. Replay covers a receipt arriving before a notice is rendered. */
export function subscribeProfileShowcasePublicProjectionAcknowledgments(observer: AcknowledgmentObserver): () => void {
  acknowledgmentObservers.add(observer);
  for (const scope of acknowledged.values()) notifyAcknowledgment(observer, scope);
  return () => { acknowledgmentObservers.delete(observer); };
}

function holdAcknowledgment(scope: ProfileShowcaseCompletePublicationScope): void {
  const key = receiptKey(scope);
  if (acknowledged.has(key)) return;
  const held = Object.freeze({ ...scope });
  acknowledged.set(key, held);
  for (const observer of acknowledgmentObservers) notifyAcknowledgment(observer, held);
}
const inFlight = new Map<string, Promise<CapturedOutcome>>();
const PENDING_CODE = "PROFILE_SHOWCASE_COMPLETE_PUBLICATION_PENDING";
const ACCOUNT_CHANGED = "PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED";
const RECEIPT_MISMATCH = "PROFILE_SHOWCASE_PUBLICATION_RECEIPT_MISMATCH";

function pending(code = PENDING_CODE): CapturedOutcome {
  return Object.freeze({ status: "pending" as const, code });
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return PENDING_CODE;
}

function receiptKey(scope: ProfileShowcaseCompletePublicationScope): string {
  return `${ACK_SCHEMA}:${profileShowcaseCompletePublicationScopeKey(scope)}`;
}

function alreadyPublished(scope: ProfileShowcaseCompletePublicationScope): boolean {
  const key = receiptKey(scope);
  if (acknowledged.has(key)) return true;
  try {
    const value = JSON.parse(readDurableLocalTruthItem(key) ?? "null");
    const matches = value?.schema === ACK_SCHEMA
      && profileShowcaseCompletePublicationScopeKey(value.scope)
        === profileShowcaseCompletePublicationScopeKey(scope);
    if (matches) {
      holdAcknowledgment(scope);
      if (Number.isSafeInteger(value.operationCount) && value.operationCount >= 0)
        acknowledgedOperationCounts.set(key, value.operationCount);
    }
    return matches;
  } catch { return false; }
}

function remember(scope: ProfileShowcaseCompletePublicationScope, operationCount: number): void {
  const key = receiptKey(scope);
  holdAcknowledgment(scope);
  acknowledgedOperationCounts.set(key, operationCount);
  try {
    writeDurableLocalTruthItem(key, JSON.stringify({ schema: ACK_SCHEMA, scope, operationCount }), {
      rank: DURABLE_LOCAL_TRUTH_RANK.deterministicSnapshot,
      source: "profile-showcase-complete-public-source-transport",
    });
  } catch {
    // Failure to cache a receipt cannot undo the exact server acknowledgment.
    // A later runtime without this cache will perform publication again.
    console.warn("profile_showcase_publication_receipt_write_failed", {
      artifactId: scope.artifactId,
      artifactDigest: scope.artifactDigest,
    });
  }
}

async function renewAcknowledgedDocument(
  vault: ProfileShowcaseBoundedEdgeVault,
  scope: ProfileShowcaseCompletePublicationScope,
  readRoute: () => ProfileShowcasePublicationRoute | null,
  refreshDocument = refreshAcceptedPublicProfileDocument,
): Promise<CapturedOutcome> {
  let operationCount = acknowledgedOperationCounts.get(receiptKey(scope));
  if (operationCount === undefined) {
    const head = await vault.readPublicationHead(scope.artifactId);
    if (head?.artifactDigest === scope.artifactDigest) operationCount = head.operationCount;
  }
  if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
  // Older exact source receipts remain held. A missing document coordinate
  // cannot require exporting or reproving their source before local paint.
  if (!Number.isSafeInteger(operationCount) || Number(operationCount) < 0)
    return typeof navigator === "undefined" || !navigator.serviceWorker?.controller
      ? { status: "published" } : pending("PROFILE_SHOWCASE_PUBLIC_DOCUMENT_HEAD_UNAVAILABLE");
  const refreshed = await refreshDocument({ username: scope.username,
    artifactDigest: scope.artifactDigest, operationCount: operationCount! });
  if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
  return refreshed === "pending" ? pending("PROFILE_SHOWCASE_PUBLIC_DOCUMENT_REFRESH_PENDING") : { status: "published" };
}

function routeMatches(
  route: ProfileShowcasePublicationRoute | null,
  scope: ProfileShowcaseCompletePublicationScope,
): boolean {
  return route?.username === scope.username
    && route.profileIdentity === scope.profileIdentity;
}

function scopeFor(
  artifactId: ProfileShowcaseArtifactId,
  artifactDigest: string,
  route: ProfileShowcasePublicationRoute,
): ProfileShowcaseCompletePublicationScope {
  return Object.freeze({
    publicationVersion: 2,
    ownerReceizId: artifactId.slice("profile-showcase:".length),
    artifactId,
    artifactDigest,
    username: route.username,
    profileIdentity: route.profileIdentity,
  });
}

async function publishCaptured(
  vault: ProfileShowcaseBoundedEdgeVault,
  scope: ProfileShowcaseCompletePublicationScope,
  publish: PublicProjectionPublisher,
  readRoute: () => ProfileShowcasePublicationRoute | null,
  historical = false,
  refreshDocument = refreshAcceptedPublicProfileDocument,
): Promise<CapturedOutcome> {
  if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
  if (!historical && alreadyPublished(scope)) return renewAcknowledgedDocument(vault, scope, readRoute, refreshDocument);
  const key = receiptKey(scope);
  const running = inFlight.get(key);
  if (running) {
    const outcome = await running;
    return routeMatches(readRoute(), scope) ? outcome : pending(ACCOUNT_CHANGED);
  }

  const operation = (async (): Promise<CapturedOutcome> => {
    if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
    const source = await vault.exportCompleteSource(scope.artifactId,
      historical ? scope.artifactDigest : undefined);
    if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
    if (!source) return pending("PROFILE_SHOWCASE_PUBLICATION_SOURCE_UNAVAILABLE");
    // An advance during export belongs to the next captured publication.
    if (source.artifactDigest !== scope.artifactDigest) {
      return pending("PROFILE_SHOWCASE_PUBLICATION_HEAD_CHANGED");
    }
    const result = publish === publishProfileShowcasePublicProjection
      ? await publishProfileShowcasePublicProjection(
          source, scope.ownerReceizId, fetch, scope.username, scope, readRoute,
        )
      : await publish(source, scope.ownerReceizId);
    if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
    if (result?.status === "rejected" || result?.status === "pending") {
      return Object.freeze({
        status: result.status,
        code: typeof result.code === "string" && result.code.trim()
          ? result.code : PENDING_CODE,
      });
    }
    if (result?.status !== "published" || result.publicationVersion !== 2
      || !result.scope || result.artifactDigest !== scope.artifactDigest
      || !Number.isSafeInteger(result.operationCount) || result.operationCount < 0) {
      return pending(RECEIPT_MISMATCH);
    }
    try {
      if (profileShowcaseCompletePublicationScopeKey(result.scope)
        !== profileShowcaseCompletePublicationScopeKey(scope)) {
        return pending(RECEIPT_MISMATCH);
      }
    } catch { return pending(RECEIPT_MISMATCH); }
    if (!routeMatches(readRoute(), scope)) return pending(ACCOUNT_CHANGED);
    remember(scope, result.operationCount);
    return { status: "published" };
  })().finally(() => {
    if (inFlight.get(key) === operation) inFlight.delete(key);
  });
  inFlight.set(key, operation);
  return operation;
}

/** Keep the flush API and durable outbox semantics. Failure codes are recorded
 * in lastError. Only exact acknowledged heads cover verified ancestor intents.
 */
export async function flushPendingProfileShowcasePublicProjections(
  vault: ProfileShowcaseBoundedEdgeVault,
  publish: PublicProjectionPublisher = publishProfileShowcasePublicProjection,
  onlyArtifactId?: ProfileShowcaseArtifactId,
  options: RetryOptions = {},
): Promise<ProfileShowcasePublicProjectionFlushResult> {
  const attempts = (await vault.pendingReconciliationAttempts())
    .filter(attempt => !onlyArtifactId || attempt.artifactId === onlyArtifactId);
  let published = 0;
  let remaining = 0;
  let rejected = 0;

  for (const artifactId of new Set(attempts.map(attempt => attempt.artifactId))) {
    const readRoute = options.readRoute ?? (() => readCurrentPublicationRoute(artifactId));
    const currentRoute = readRoute();
    const route = currentRoute ? { ...currentRoute } : null;
    const members = attempts.filter(attempt => attempt.artifactId === artifactId);
    let scope: ProfileShowcaseCompletePublicationScope | null = null;
    let outcome: CapturedOutcome;
    try {
      if (!route) {
        outcome = pending("PROFILE_SHOWCASE_PUBLICATION_ROUTE_UNAVAILABLE");
      } else {
        const head = await vault.readPublicationHead(artifactId);
        if (!head) {
          outcome = pending("PROFILE_SHOWCASE_PUBLICATION_HEAD_UNAVAILABLE");
        } else {
          scope = scopeFor(artifactId, head.artifactDigest, route);
          outcome = await publishCaptured(vault, scope, publish, readRoute, false, options.refreshDocument);
          if (outcome.status !== "published"
            && outcome.code === "PROFILE_SHOWCASE_PUBLIC_SOURCE_CAUSAL_INTERMEDIATE_REQUIRED") {
            // The accepted public head requires each exact sealed parent source.
            // Replay only outbox heads proven ancestral to the captured head;
            // Kai ordering alone cannot promote a sibling or a representation.
            const ancestors: (typeof members)[number][] = [];
            for (const attempt of members) {
              if (attempt.artifactDigest === scope.artifactDigest) continue;
              if (await vault.isVerifiedPublicationAncestor(artifactId,
                attempt.artifactDigest, scope.artifactDigest)) ancestors.push(attempt);
            }
            const remaining = [...ancestors].sort((left, right) => {
              const a = BigInt(left.headKaiUpulse), b = BigInt(right.headKaiUpulse);
              return a < b ? -1 : a > b ? 1 : 0;
            });
            while (remaining.length && routeMatches(readRoute(), scope)) {
              let first = -1;
              for (let index = 0; index < remaining.length; index += 1) {
                let hasUnpublishedParent = false;
                for (let other = 0; other < remaining.length; other += 1) {
                  if (index !== other && await vault.isVerifiedPublicationAncestor(artifactId,
                    remaining[other]!.artifactDigest, remaining[index]!.artifactDigest)) {
                    hasUnpublishedParent = true;
                    break;
                  }
                }
                if (!hasUnpublishedParent) { first = index; break; }
              }
              if (first < 0) { outcome = pending("PROFILE_SHOWCASE_PUBLICATION_ANCESTRY_UNCONFIRMED"); break; }
              const ancestor = remaining.splice(first, 1)[0]!;
              outcome = await publishCaptured(vault,
                scopeFor(artifactId, ancestor.artifactDigest, route), publish, readRoute, true);
              if (outcome.status !== "published") break;
            }
            if (outcome.status === "published" && !remaining.length && routeMatches(readRoute(), scope))
              outcome = await publishCaptured(vault, scope, publish, readRoute, false, options.refreshDocument);
          }
        }
      }
    } catch (error) {
      outcome = pending(errorCode(error));
    }

    for (const attempt of members) {
      let attemptOutcome = outcome;
      let covered = false;
      if (scope && !routeMatches(readRoute(), scope)) {
        attemptOutcome = pending(ACCOUNT_CHANGED);
      } else if (scope && outcome.status === "published") {
        try {
          // Counts/Kai alone cannot establish a causal ancestor.
          covered = await vault.isVerifiedPublicationAncestor(
            artifactId, attempt.artifactDigest, scope.artifactDigest,
          );
          if (!covered) {
            attemptOutcome = pending("PROFILE_SHOWCASE_PUBLICATION_ANCESTRY_UNCONFIRMED");
          }
        } catch (error) {
          attemptOutcome = pending(errorCode(error));
        }
        // Identity may have changed while the ancestry check was awaited.
        if (!routeMatches(readRoute(), scope)) {
          covered = false;
          attemptOutcome = pending(ACCOUNT_CHANGED);
        }
      }

      if (covered) {
        await vault.recordReconciliationResult({
          attemptId: attempt.attemptId, status: "accepted",
          acceptedArtifactDigest: attempt.artifactDigest, lastError: null,
        });
        published += 1;
      } else if (scope && attemptOutcome.status === "rejected"
        && attempt.artifactDigest === scope.artifactDigest) {
        // Rejection of this head is not rejection of every earlier ancestor.
        await vault.recordReconciliationResult({
          attemptId: attempt.attemptId, status: "rejected",
          acceptedArtifactDigest: null, lastError: attemptOutcome.code,
        });
        rejected += 1;
      } else {
        await vault.recordReconciliationResult({
          attemptId: attempt.attemptId, status: "network-pending",
          acceptedArtifactDigest: null,
          lastError: attemptOutcome.status === "published"
            ? PENDING_CODE : attemptOutcome.code,
        });
        remaining += 1;
      }
    }
  }
  return Object.freeze({ published, pending: remaining, rejected });
}

function ensureResult(
  outcome: CapturedOutcome,
  artifactDigest: string | null,
  published = 0,
): ProfileShowcasePublicProjectionEnsureResult {
  return Object.freeze({
    published: outcome.status === "published" ? published : 0,
    pending: outcome.status === "published" ? 0 : 1,
    status: outcome.status,
    code: outcome.status === "published" ? null : outcome.code,
    artifactDigest,
  });
}

/** A held exact v2 receipt avoids export. Pending/rejected outcomes preserve
 * their code; they never produce pending: 0 for legacy numeric-only callers.
 */
export async function ensureCurrentProfileShowcasePublicProjection(
  vault: ProfileShowcaseBoundedEdgeVault,
  artifactId: ProfileShowcaseArtifactId,
  publish: PublicProjectionPublisher = publishProfileShowcasePublicProjection,
  options: RetryOptions = {},
): Promise<ProfileShowcasePublicProjectionEnsureResult> {
  const readRoute = options.readRoute ?? (() => readCurrentPublicationRoute(artifactId));
  let artifactDigest: string | null = null;
  try {
    const currentRoute = readRoute();
    if (!currentRoute) {
      return ensureResult(pending("PROFILE_SHOWCASE_PUBLICATION_ROUTE_UNAVAILABLE"), null);
    }
    const route = { ...currentRoute };
    const head = await vault.readPublicationHead(artifactId);
    if (!head) {
      return ensureResult(pending("PROFILE_SHOWCASE_PUBLICATION_HEAD_UNAVAILABLE"), null);
    }
    artifactDigest = head.artifactDigest;
    const scope = scopeFor(artifactId, artifactDigest, route);
    if (!routeMatches(readRoute(), scope)) {
      return ensureResult(pending(ACCOUNT_CHANGED), artifactDigest);
    }
    if (alreadyPublished(scope)) {
      return ensureResult(await renewAcknowledgedDocument(vault, scope, readRoute, options.refreshDocument), artifactDigest);
    }
    const outcome = await publishCaptured(vault, scope, publish, readRoute, false, options.refreshDocument);
    if (!routeMatches(readRoute(), scope)) {
      return ensureResult(pending(ACCOUNT_CHANGED), artifactDigest);
    }
    return ensureResult(outcome, artifactDigest, 1);
  } catch (error) {
    return ensureResult(pending(errorCode(error)), artifactDigest);
  }
}
