"use client";

import type {
  MarketDeskPublicOriginalAsset,
  MarketDeskSnapshotTransport,
} from "@/app/lib/market/types";
import { parseProfileUsername } from "@/app/lib/profile/username";
import {
  isRuntimeCustodiedVerifiedEconomyShowcase,
} from "@/app/lib/economy/showcase/artifact";
import type {
  EconomyShowcaseProfileAdmission,
  VerifiedEconomyShowcase,
} from "@/app/lib/economy/showcase/types";
import {
  marketOriginalHasExactProfileMembership,
  recoverVerifiedMarketProfileMembership,
  type VerifiedMarketProfileMembership,
} from "@/app/lib/market/profileShowcaseMembership";
import {
  projectionCanAppendToHeldEconomyTruth,
} from "@/app/lib/market/economyProjectionLineage";

export { projectionCanAppendToHeldEconomyTruth } from "@/app/lib/market/economyProjectionLineage";
import { WHOLE_MARKET_PUBLIC_PROOF_SCHEMA, normalizedText, timestampMs, isCanonicalCompleteMembership } from "./wholeMarketPublicProofProjection";
import type { WholeMarketPublicOwnerProof } from "./wholeMarketPublicProofProjection";
export { isCanonicalCompleteMembership, projectProfileOriginalsFromWholeMarketOwnerProof } from "./wholeMarketPublicProofProjection";
export type { WholeMarketPublicOwnerProof } from "./wholeMarketPublicProofProjection";

const WHOLE_MARKET_PUBLIC_PROOF_DB = "receiz-market-public-proof-v1";
const WHOLE_MARKET_PUBLIC_PROOF_DB_VERSION = 1;
const WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE = "index";
const WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE = "owners";
const WHOLE_MARKET_PUBLIC_PROOF_ACTIVE_INDEX_KEY = "active";

export type WholeMarketPublicProofIndex = {
  schema: typeof WHOLE_MARKET_PUBLIC_PROOF_SCHEMA;
  version: 1;
  key: typeof WHOLE_MARKET_PUBLIC_PROOF_ACTIVE_INDEX_KEY;
  scope: "whole-market-visible-showcase";
  source: "canonical-complete";
  isComplete: true;
  generatedAt: string;
  revision: string;
  itemCount: number;
  ownerCount: number;
  retainedOwnerCount: number;
  admittedAtMs: number;
  economyShowcaseArtifactId: "economy-showcase:receiz.com" | null;
  economyShowcaseArtifactDigest: string | null;
  economyShowcaseHistoryHeadDigest: string | null;
  economyShowcaseParentArtifactDigests?: readonly string[];
  projectionVersion: 1;
  authority: {
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  };
};

export type WholeMarketPublicProofBundle = {
  index: WholeMarketPublicProofIndex;
  owners: WholeMarketPublicOwnerProof[];
};

export type WholeMarketPublicProofAdmission = {
  admitted: boolean;
  persisted: boolean;
  reason: "admitted" | "already-held" | "weaker-or-invalid" | "persistence-unavailable";
  index: WholeMarketPublicProofIndex | null;
};

export type WholeMarketPublicProofPersistence = {
  readIndex: () => Promise<WholeMarketPublicProofIndex | null>;
  readOwner: (username: string) => Promise<WholeMarketPublicOwnerProof | null>;
  readOwners: () => Promise<WholeMarketPublicOwnerProof[]>;
  replaceComplete: (bundle: WholeMarketPublicProofBundle) => Promise<void>;
};

export type WholeMarketPublicProofRegister = {
  admitCompleteTransport: (transport: MarketDeskSnapshotTransport) => Promise<WholeMarketPublicProofAdmission>;
  admitEconomyProjection: (
    transport: MarketDeskSnapshotTransport,
    economy: VerifiedEconomyShowcase,
  ) => Promise<WholeMarketPublicProofAdmission>;
  loadComplete: () => Promise<WholeMarketPublicProofBundle | null>;
  loadOwner: (username: string) => Promise<WholeMarketPublicOwnerProof | null>;
  prime: () => Promise<WholeMarketPublicProofIndex | null>;
  peekIndex: () => WholeMarketPublicProofIndex | null;
  peekOwner: (username: string) => WholeMarketPublicOwnerProof | null;
  subscribe: (listener: () => void) => () => void;
};

type EconomyProjectionBinding = Readonly<{
  economy: VerifiedEconomyShowcase;
  profilesByUsername: ReadonlyMap<string, EconomyShowcaseProfileAdmission>;
  originalMembership: VerifiedMarketProfileMembership;
}>;

function publicOriginalIdentity(original: MarketDeskPublicOriginalAsset): string {
  return `${normalizedText(original.id).toLowerCase()}::${normalizedText(original.receizId).toLowerCase()}`;
}

function publicOriginalCanEnterCompleteRegister(original: MarketDeskPublicOriginalAsset): boolean {
  const exactOriginal = original.profileOriginal;
  const exactOriginalIsValid =
    exactOriginal == null ||
    (typeof exactOriginal === "object" &&
      normalizedText(exactOriginal.id) === normalizedText(original.receizId) &&
      exactOriginal.showOnProfile === true);

  return Boolean(
    normalizedText(original.id) &&
      normalizedText(original.receizId) &&
      normalizedText(original.ownerUserId) &&
      parseProfileUsername(original.ownerUsername) &&
      normalizedText(original.verifyPath) &&
      normalizedText(original.verifyHref) &&
      exactOriginalIsValid,
  );
}

function compareOriginalRecency(
  left: MarketDeskPublicOriginalAsset,
  right: MarketDeskPublicOriginalAsset,
): number {
  const byCreatedAt = timestampMs(right.createdAt) - timestampMs(left.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  const byUpdatedAt = timestampMs(right.updatedAt) - timestampMs(left.updatedAt);
  if (byUpdatedAt !== 0) return byUpdatedAt;
  return publicOriginalIdentity(left).localeCompare(publicOriginalIdentity(right));
}

function currentOwnerDisplayName(originals: readonly MarketDeskPublicOriginalAsset[], username: string): string {
  const latestWithDisplayName = [...originals]
    .sort((left, right) => {
      const byUpdatedAt = timestampMs(right.updatedAt) - timestampMs(left.updatedAt);
      if (byUpdatedAt !== 0) return byUpdatedAt;
      return publicOriginalIdentity(left).localeCompare(publicOriginalIdentity(right));
    })
    .find((original) => normalizedText(original.ownerDisplayName));
  return normalizedText(latestWithDisplayName?.ownerDisplayName) || username;
}

function currentOwnerAvatarUrl(originals: readonly MarketDeskPublicOriginalAsset[]): string | null {
  const latestWithAvatar = [...originals]
    .sort((left, right) => {
      const byUpdatedAt = timestampMs(right.updatedAt) - timestampMs(left.updatedAt);
      if (byUpdatedAt !== 0) return byUpdatedAt;
      return publicOriginalIdentity(left).localeCompare(publicOriginalIdentity(right));
    })
    .find((original) => normalizedText(original.ownerAvatarUrl));
  return normalizedText(latestWithAvatar?.ownerAvatarUrl) || null;
}

function normalizeCompleteTransport(
  transport: MarketDeskSnapshotTransport,
  economyBinding: EconomyProjectionBinding | null = null,
): WholeMarketPublicProofBundle | null {
  const membership = transport.publicMembership;
  if (!isCanonicalCompleteMembership(membership)) return null;
  if (!Array.isArray(transport.publicOriginals)) return null;
  if (membership.itemCount !== transport.publicOriginals.length) return null;

  const seen = new Set<string>();
  const groups = new Map<string, MarketDeskPublicOriginalAsset[]>();
  const ownerUserIds = new Map<string, string>();

  for (const original of transport.publicOriginals) {
    if (!publicOriginalCanEnterCompleteRegister(original)) return null;
    if (
      economyBinding
      && !marketOriginalHasExactProfileMembership({
        original,
        membership: economyBinding.originalMembership,
      })
    ) return null;
    const identity = publicOriginalIdentity(original);
    if (seen.has(identity)) return null;
    seen.add(identity);

    const username = parseProfileUsername(original.ownerUsername);
    if (!username) return null;
    const ownerUserId = normalizedText(original.ownerUserId);
    const knownOwnerUserId = ownerUserIds.get(username);
    if (knownOwnerUserId && knownOwnerUserId !== ownerUserId) return null;
    ownerUserIds.set(username, ownerUserId);

    const originals = groups.get(username) ?? [];
    originals.push({
      ...original,
      ownerUserId,
      ownerUsername: username,
      ownerDisplayName: normalizedText(original.ownerDisplayName) || username,
      receizId: normalizedText(original.receizId),
      id: normalizedText(original.id),
    });
    groups.set(username, originals);
  }

  if (
    economyBinding
    && [...groups.keys()].some(
      (username) => !economyBinding.profilesByUsername.has(username),
    )
  ) return null;
  const owners = [...groups.entries()]
    .map(([username, originals]): WholeMarketPublicOwnerProof => {
      const profile = economyBinding?.profilesByUsername.get(username) ?? null;
      return {
        schema: WHOLE_MARKET_PUBLIC_PROOF_SCHEMA,
        version: 1,
        username,
        ownerUserId: ownerUserIds.get(username) ?? "",
        displayName: currentOwnerDisplayName(originals, username),
        avatarUrl: currentOwnerAvatarUrl(originals),
        membershipRevision: membership.revision,
        membershipGeneratedAt: membership.generatedAt,
        isCurrentMember: true,
        originals: [...originals].sort(compareOriginalRecency),
        historyOriginals: [...originals].sort(compareOriginalRecency),
        profileShowcaseArtifactId: profile?.artifactId ?? null,
        profileShowcaseArtifactDigest: profile?.artifactDigest ?? null,
        profileShowcaseHistoryHeadDigest: profile?.historyHeadDigest ?? null,
        profileShowcaseAdmissionEvidenceRoot:
          profile?.admissionEvidenceRoot ?? null,
        economyShowcaseArtifactDigest:
          economyBinding?.economy.artifactDigest ?? null,
        economyShowcaseParentArtifactDigests:
          economyBinding?.economy.head.parentArtifactDigests ?? [],
      };
    })
    .sort((left, right) => left.username.localeCompare(right.username));

  return {
    index: {
      schema: WHOLE_MARKET_PUBLIC_PROOF_SCHEMA,
      version: 1,
      key: WHOLE_MARKET_PUBLIC_PROOF_ACTIVE_INDEX_KEY,
      scope: "whole-market-visible-showcase",
      source: "canonical-complete",
      isComplete: true,
      generatedAt: membership.generatedAt,
      revision: membership.revision,
      itemCount: transport.publicOriginals.length,
      ownerCount: owners.length,
      retainedOwnerCount: owners.length,
      admittedAtMs: Date.now(),
      economyShowcaseArtifactId:
        economyBinding?.economy.artifactId ?? null,
      economyShowcaseArtifactDigest:
        economyBinding?.economy.artifactDigest ?? null,
      economyShowcaseHistoryHeadDigest:
        economyBinding?.economy.admission.proofHistoryHead?.headDigest ?? null,
      economyShowcaseParentArtifactDigests:
        economyBinding?.economy.head.parentArtifactDigests ?? [],
      projectionVersion: 1,
      authority: {
        projectionIsProofAuthority: false,
        strongerTruth: "sealed-receiz-proof-object",
      },
    },
    owners,
  };
}

function coerceWholeMarketPublicProofIndex(value: unknown): WholeMarketPublicProofIndex | null {
  if (!value || typeof value !== "object") return null;
  const index = value as Partial<WholeMarketPublicProofIndex>;
  if (!(
    index.schema === WHOLE_MARKET_PUBLIC_PROOF_SCHEMA &&
      index.version === 1 &&
      index.key === WHOLE_MARKET_PUBLIC_PROOF_ACTIVE_INDEX_KEY &&
      index.scope === "whole-market-visible-showcase" &&
      index.source === "canonical-complete" &&
      index.isComplete === true &&
      normalizedText(index.revision) &&
      timestampMs(index.generatedAt) > 0 &&
      Number.isFinite(index.itemCount) &&
      Number.isFinite(index.ownerCount) &&
      Number.isFinite(index.admittedAtMs)
  )) {
    return null;
  }
  const economyBound =
    index.economyShowcaseArtifactId === "economy-showcase:receiz.com"
    && /^[0-9a-f]{64}$/.test(index.economyShowcaseArtifactDigest ?? "")
    && /^[0-9a-f]{64}$/.test(
      index.economyShowcaseHistoryHeadDigest ?? "",
    );

  return {
    ...(index as WholeMarketPublicProofIndex),
    retainedOwnerCount: Number.isFinite(index.retainedOwnerCount)
      ? Math.max(Number(index.ownerCount), Number(index.retainedOwnerCount))
      : Number(index.ownerCount),
    economyShowcaseArtifactId:
      economyBound
        ? "economy-showcase:receiz.com"
        : null,
    economyShowcaseArtifactDigest:
      economyBound
        ? index.economyShowcaseArtifactDigest!
        : null,
    economyShowcaseHistoryHeadDigest:
      economyBound
        ? index.economyShowcaseHistoryHeadDigest!
        : null,
    economyShowcaseParentArtifactDigests:
      economyBound && Array.isArray(index.economyShowcaseParentArtifactDigests)
        ? index.economyShowcaseParentArtifactDigests.filter(
            (digest): digest is string =>
              typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest),
          )
        : [],
    projectionVersion: 1,
    authority: {
      projectionIsProofAuthority: false,
      strongerTruth: "sealed-receiz-proof-object",
    },
  };
}

function coerceWholeMarketPublicOwnerProof(value: unknown): WholeMarketPublicOwnerProof | null {
  if (!value || typeof value !== "object") return null;
  const owner = value as Partial<WholeMarketPublicOwnerProof>;
  const currentOriginals = Array.isArray(owner.originals) ? owner.originals : [];
  const originalsAreValid = Array.isArray(owner.originals) && currentOriginals.every(publicOriginalCanEnterCompleteRegister);
  const historyOriginals = Array.isArray(owner.historyOriginals)
    ? owner.historyOriginals
    : originalsAreValid
      ? currentOriginals
      : [];
  if (!(
    owner.schema === WHOLE_MARKET_PUBLIC_PROOF_SCHEMA &&
      owner.version === 1 &&
      parseProfileUsername(owner.username ?? "") &&
      normalizedText(owner.ownerUserId) &&
      normalizedText(owner.displayName) &&
      (typeof owner.avatarUrl === "string" || owner.avatarUrl === null) &&
      normalizedText(owner.membershipRevision) &&
      timestampMs(owner.membershipGeneratedAt) > 0 &&
      originalsAreValid &&
      historyOriginals.every(publicOriginalCanEnterCompleteRegister)
  )) {
    return null;
  }
  const profileBound =
    typeof owner.profileShowcaseArtifactId === "string"
    && owner.profileShowcaseArtifactId.startsWith("profile-showcase:")
    && /^[0-9a-f]{64}$/.test(owner.profileShowcaseArtifactDigest ?? "")
    && /^[0-9a-f]{64}$/.test(
      owner.profileShowcaseHistoryHeadDigest ?? "",
    )
    && /^[0-9a-f]{64}$/.test(
      owner.profileShowcaseAdmissionEvidenceRoot ?? "",
    );

  return {
    ...(owner as WholeMarketPublicOwnerProof),
    isCurrentMember: owner.isCurrentMember === false ? false : currentOriginals.length > 0,
    originals: currentOriginals,
    historyOriginals,
    profileShowcaseArtifactId:
      profileBound
        ? owner.profileShowcaseArtifactId as `profile-showcase:${string}`
        : null,
    profileShowcaseArtifactDigest:
      profileBound
        ? owner.profileShowcaseArtifactDigest!
        : null,
    profileShowcaseHistoryHeadDigest:
      profileBound
        ? owner.profileShowcaseHistoryHeadDigest!
        : null,
    profileShowcaseAdmissionEvidenceRoot:
      profileBound
        ? owner.profileShowcaseAdmissionEvidenceRoot!
        : null,
    economyShowcaseArtifactDigest:
      /^[0-9a-f]{64}$/.test(owner.economyShowcaseArtifactDigest ?? "")
        ? owner.economyShowcaseArtifactDigest!
        : null,
    economyShowcaseParentArtifactDigests:
      Array.isArray(owner.economyShowcaseParentArtifactDigests)
        ? owner.economyShowcaseParentArtifactDigests.filter(
            (digest): digest is string =>
              typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest),
          )
        : [],
  };
}

function requestResult<T>(request: IDBRequest<T>, errorCode: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(errorCode));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("whole_market_public_proof_transaction_aborted"));
    transaction.onerror = () => reject(transaction.error ?? new Error("whole_market_public_proof_transaction_failed"));
  });
}

function createIndexedDbWholeMarketPublicProofPersistence(): WholeMarketPublicProofPersistence {
  let openRequest: Promise<IDBDatabase> | null = null;

  const open = (): Promise<IDBDatabase> => {
    if (openRequest) return openRequest;
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("indexeddb_unavailable"));
    }

    openRequest = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(WHOLE_MARKET_PUBLIC_PROOF_DB, WHOLE_MARKET_PUBLIC_PROOF_DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE)) {
          database.createObjectStore(WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE, { keyPath: "key" });
        }
        if (!database.objectStoreNames.contains(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE)) {
          database.createObjectStore("owners", { keyPath: "username" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        openRequest = null;
        reject(request.error ?? new Error("indexeddb_open_failed"));
      };
    });
    return openRequest;
  };

  return {
    async readIndex() {
      const database = await open();
      const transaction = database.transaction(WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE, "readonly");
      const value = await requestResult(
        transaction.objectStore(WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE).get(WHOLE_MARKET_PUBLIC_PROOF_ACTIVE_INDEX_KEY),
        "whole_market_public_proof_index_read_failed",
      );
      return coerceWholeMarketPublicProofIndex(value);
    },
    async readOwner(usernameRaw) {
      const username = parseProfileUsername(usernameRaw);
      if (!username) return null;
      const database = await open();
      const transaction = database.transaction(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE, "readonly");
      const value = await requestResult(
        transaction.objectStore(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE).get(username),
        "whole_market_public_proof_owner_read_failed",
      );
      return coerceWholeMarketPublicOwnerProof(value);
    },
    async readOwners() {
      const database = await open();
      const transaction = database.transaction(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE, "readonly");
      const values = await requestResult(
        transaction.objectStore(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE).getAll(),
        "whole_market_public_proof_owners_read_failed",
      );
      return Array.isArray(values)
        ? values.flatMap((value) => {
            const owner = coerceWholeMarketPublicOwnerProof(value);
            return owner ? [owner] : [];
          })
        : [];
    },
    async replaceComplete(bundle) {
      const database = await open();
      const transaction = database.transaction(
        [WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE, WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE],
        "readwrite",
      );
      const indexStore = transaction.objectStore(WHOLE_MARKET_PUBLIC_PROOF_INDEX_STORE);
      const ownerStore = transaction.objectStore(WHOLE_MARKET_PUBLIC_PROOF_OWNERS_STORE);
      ownerStore.clear();
      for (const owner of bundle.owners) ownerStore.put(owner);
      indexStore.put(bundle.index);
      await transactionComplete(transaction);
    },
  };
}

function incomingBundleCanSupersede(
  current: WholeMarketPublicProofIndex | null,
  incoming: WholeMarketPublicProofIndex,
): boolean {
  if (!current) return true;
  const currentProof = current.economyShowcaseArtifactDigest;
  const incomingProof = incoming.economyShowcaseArtifactDigest;
  if (currentProof && !incomingProof) return false;
  if (incomingProof && !currentProof) return true;
  if (currentProof && incomingProof) {
    return currentProof !== incomingProof;
  }
  if (incoming.revision === current.revision) return false;
  return timestampMs(incoming.generatedAt) >= timestampMs(current.generatedAt);
}

function strongerProjectionIndex(
  left: WholeMarketPublicProofIndex,
  right: WholeMarketPublicProofIndex,
): WholeMarketPublicProofIndex {
  if (
    Boolean(left.economyShowcaseArtifactDigest)
      !== Boolean(right.economyShowcaseArtifactDigest)
  ) {
    return left.economyShowcaseArtifactDigest ? left : right;
  }
  return timestampMs(left.generatedAt) >= timestampMs(right.generatedAt)
    ? left
    : right;
}

function mergeRetainedOriginalHistory(
  current: readonly MarketDeskPublicOriginalAsset[],
  retained: readonly MarketDeskPublicOriginalAsset[],
): MarketDeskPublicOriginalAsset[] {
  const history = [...retained];
  const seen = new Set(history.map(publicOriginalIdentity));
  for (const original of current) {
    const identity = publicOriginalIdentity(original);
    if (seen.has(identity)) continue;
    history.push(original);
    seen.add(identity);
  }
  return history.sort(compareOriginalRecency);
}

function retainPriorProofHistory(
  incoming: WholeMarketPublicProofBundle,
  prior: WholeMarketPublicProofBundle | null,
): WholeMarketPublicProofBundle {
  if (!prior) return incoming;

  const priorByUsername = new Map(prior.owners.map((owner) => [owner.username, owner]));
  const currentOwners = incoming.owners.map((owner): WholeMarketPublicOwnerProof => {
    const priorOwner = priorByUsername.get(owner.username) ?? null;
    priorByUsername.delete(owner.username);
    return {
      ...owner,
      isCurrentMember: true,
      historyOriginals: mergeRetainedOriginalHistory(
        owner.originals,
        priorOwner?.historyOriginals ?? priorOwner?.originals ?? [],
      ),
    };
  });
  const tombstones = [...priorByUsername.values()].map((owner): WholeMarketPublicOwnerProof => ({
    ...owner,
    membershipRevision: incoming.index.revision,
    membershipGeneratedAt: incoming.index.generatedAt,
    isCurrentMember: false,
    originals: [],
    historyOriginals: mergeRetainedOriginalHistory([], owner.historyOriginals ?? owner.originals),
    economyShowcaseArtifactDigest:
      incoming.index.economyShowcaseArtifactDigest,
    economyShowcaseParentArtifactDigests:
      incoming.index.economyShowcaseParentArtifactDigests,
  }));
  const owners = [...currentOwners, ...tombstones].sort((left, right) => left.username.localeCompare(right.username));

  return {
    index: {
      ...incoming.index,
      retainedOwnerCount: owners.length,
    },
    owners,
  };
}

export function createWholeMarketPublicProofRegister(
  persistence: WholeMarketPublicProofPersistence,
): WholeMarketPublicProofRegister {
  let index: WholeMarketPublicProofIndex | null = null;
  const owners = new Map<string, WholeMarketPublicOwnerProof>();
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // A projection listener cannot invalidate admitted proof memory.
      }
    }
  };

  const admitInMemory = (bundle: WholeMarketPublicProofBundle) => {
    index = bundle.index;
    owners.clear();
    for (const owner of bundle.owners) owners.set(owner.username, owner);
    notify();
  };

  const currentCompleteBundle = (): WholeMarketPublicProofBundle | null => {
    if (!index || owners.size !== index.retainedOwnerCount) return null;
    const completeOwners = [...owners.values()]
      .filter((owner) => owner.membershipRevision === index?.revision)
      .sort((left, right) => left.username.localeCompare(right.username));
    if (completeOwners.length !== index.retainedOwnerCount) return null;
    if (completeOwners.filter((owner) => owner.isCurrentMember).length !== index.ownerCount) return null;
    if (completeOwners.some((owner) => !owner.isCurrentMember && owner.originals.length > 0)) return null;
    if (
      index.economyShowcaseArtifactDigest
      && completeOwners.some((owner) =>
        owner.isCurrentMember && !owner.profileShowcaseArtifactDigest)
    ) return null;
    const itemCount = completeOwners.reduce((count, owner) => count + owner.originals.length, 0);
    return itemCount === index.itemCount ? { index, owners: completeOwners } : null;
  };

  const readCompleteBundle = async (): Promise<WholeMarketPublicProofBundle | null> => {
    const held = currentCompleteBundle();
    if (held) return held;

    try {
      const [storedIndex, storedOwners] = await Promise.all([
        persistence.readIndex(),
        persistence.readOwners(),
      ]);
      if (!storedIndex) return null;
      const completeOwners = storedOwners
        .filter((owner) => owner.membershipRevision === storedIndex.revision)
        .sort((left, right) => left.username.localeCompare(right.username));
      if (completeOwners.length !== storedIndex.retainedOwnerCount) return null;
      if (completeOwners.filter((owner) => owner.isCurrentMember).length !== storedIndex.ownerCount) return null;
      if (completeOwners.some((owner) => !owner.isCurrentMember && owner.originals.length > 0)) return null;
      if (
        storedIndex.economyShowcaseArtifactDigest
        && completeOwners.some((owner) =>
          owner.isCurrentMember && !owner.profileShowcaseArtifactDigest)
      ) return null;
      const itemCount = completeOwners.reduce((count, owner) => count + owner.originals.length, 0);
      if (itemCount !== storedIndex.itemCount) return null;
      return { index: storedIndex, owners: completeOwners };
    } catch {
      return null;
    }
  };

  const admitNormalizedBundle = async (
    normalizedBundle: WholeMarketPublicProofBundle,
  ): Promise<WholeMarketPublicProofAdmission> => {
    const priorBundle = await readCompleteBundle();

    let persistedCurrent: WholeMarketPublicProofIndex | null = null;
    try {
      persistedCurrent = await persistence.readIndex();
    } catch {
      persistedCurrent = null;
    }
    const current =
      index && persistedCurrent
        ? strongerProjectionIndex(index, persistedCurrent)
        : index ?? persistedCurrent;

    if (!incomingBundleCanSupersede(current, normalizedBundle.index)) {
      const exactRevisionPersisted =
        persistedCurrent?.revision === normalizedBundle.index.revision
        && persistedCurrent.economyShowcaseArtifactDigest
          === normalizedBundle.index.economyShowcaseArtifactDigest;
      const exactRevisionHeld =
        current?.revision === normalizedBundle.index.revision
        && current.economyShowcaseArtifactDigest
          === normalizedBundle.index.economyShowcaseArtifactDigest;
      if (exactRevisionHeld && !exactRevisionPersisted) {
        const bundle = retainPriorProofHistory(
          normalizedBundle,
          priorBundle,
        );
        try {
          await persistence.replaceComplete(bundle);
          admitInMemory(bundle);
          return {
            admitted: false,
            persisted: true,
            reason: "already-held",
            index: bundle.index,
          };
        } catch {
          return {
            admitted: false,
            persisted: false,
            reason: "persistence-unavailable",
            index: current,
          };
        }
      }
      return {
        admitted: false,
        persisted: Boolean(
          persistedCurrent
          && persistedCurrent.revision === current?.revision
          && persistedCurrent.economyShowcaseArtifactDigest
            === current?.economyShowcaseArtifactDigest,
        ),
        reason: "already-held",
        index: current,
      };
    }

    const bundle = retainPriorProofHistory(normalizedBundle, priorBundle);
    try {
      await persistence.replaceComplete(bundle);
      admitInMemory(bundle);
      return {
        admitted: true,
        persisted: true,
        reason: "admitted",
        index: bundle.index,
      };
    } catch {
      admitInMemory(bundle);
      return {
        admitted: true,
        persisted: false,
        reason: "persistence-unavailable",
        index: bundle.index,
      };
    }
  };

  return {
    async admitCompleteTransport(transport) {
      const normalizedBundle = normalizeCompleteTransport(transport);
      if (!normalizedBundle) {
        return { admitted: false, persisted: false, reason: "weaker-or-invalid", index };
      }
      return admitNormalizedBundle(normalizedBundle);
    },
    async admitEconomyProjection(transport, economy) {
      if (!isRuntimeCustodiedVerifiedEconomyShowcase(economy)) {
        return {
          admitted: false,
          persisted: false,
          reason: "weaker-or-invalid",
          index,
        };
      }
      const persistedCurrent = await persistence.readIndex().catch(
        () => null,
      );
      const current =
        index && persistedCurrent
          ? strongerProjectionIndex(index, persistedCurrent)
          : index ?? persistedCurrent;
      if (
        !projectionCanAppendToHeldEconomyTruth({
          heldArtifactDigest:
            current?.economyShowcaseArtifactDigest ?? null,
          candidateArtifactDigest: economy.artifactDigest,
          candidateParentArtifactDigests:
            economy.head.parentArtifactDigests,
        })
      ) {
        return {
          admitted: false,
          persisted: false,
          reason: "weaker-or-invalid",
          index: current,
        };
      }
      const profilesByUsername = new Map<
        string,
        EconomyShowcaseProfileAdmission
      >();
      for (const profile of economy.profileShowcases) {
        const identity = profile.artifactId.slice(
          "profile-showcase:".length,
        );
        const suffix = ".receiz.id";
        if (!identity.endsWith(suffix)) continue;
        const username = parseProfileUsername(
          identity.slice(0, -suffix.length),
        );
        if (!username) continue;
        const held = profilesByUsername.get(username);
        if (held) {
          const heldKai = BigInt(held.headKaiUpulse);
          const candidateKai = BigInt(profile.headKaiUpulse);
          if (
            candidateKai < heldKai
            || (
              candidateKai === heldKai
              && profile.artifactDigest <= held.artifactDigest
            )
          ) continue;
        }
        profilesByUsername.set(username, profile);
      }
      const normalizedBundle = normalizeCompleteTransport(transport, {
        economy,
        profilesByUsername,
        originalMembership:
          await recoverVerifiedMarketProfileMembership({ economy })
          ?? new Map(),
      });
      if (!normalizedBundle) {
        return {
          admitted: false,
          persisted: false,
          reason: "weaker-or-invalid",
          index,
        };
      }
      return admitNormalizedBundle(normalizedBundle);
    },
    async loadComplete() {
      const bundle = await readCompleteBundle();
      if (!bundle) return null;
      admitInMemory(bundle);
      return bundle;
    },
    async loadOwner(usernameRaw) {
      const username = parseProfileUsername(usernameRaw);
      if (!username) return null;
      const held = owners.get(username);
      if (held && index?.revision === held.membershipRevision) return held;

      try {
        const [storedIndex, storedOwner] = await Promise.all([
          index ? Promise.resolve(index) : persistence.readIndex(),
          persistence.readOwner(username),
        ]);
        if (!storedIndex || !storedOwner || storedOwner.membershipRevision !== storedIndex.revision) return null;
        index = storedIndex;
        owners.set(username, storedOwner);
        notify();
        return storedOwner;
      } catch {
        return null;
      }
    },
    async prime() {
      const held = currentCompleteBundle();
      if (held) return held.index;
      const bundle = await readCompleteBundle();
      if (!bundle) return null;
      admitInMemory(bundle);
      return bundle.index;
    },
    peekIndex() {
      return index;
    },
    peekOwner(usernameRaw) {
      const username = parseProfileUsername(usernameRaw);
      if (!username) return null;
      const owner = owners.get(username) ?? null;
      return owner && owner.membershipRevision === index?.revision ? owner : null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const wholeMarketPublicProofRegister = createWholeMarketPublicProofRegister(
  createIndexedDbWholeMarketPublicProofPersistence(),
);

export function admitCompleteWholeMarketPublicTransport(
  transport: MarketDeskSnapshotTransport,
): Promise<WholeMarketPublicProofAdmission> {
  return wholeMarketPublicProofRegister.admitCompleteTransport(transport);
}

export function peekWholeMarketPublicProofIndex(): WholeMarketPublicProofIndex | null {
  return wholeMarketPublicProofRegister.peekIndex();
}

export function peekWholeMarketPublicOwnerProof(username: string): WholeMarketPublicOwnerProof | null {
  return wholeMarketPublicProofRegister.peekOwner(username);
}

export function loadCompleteWholeMarketPublicProofBundle(): Promise<WholeMarketPublicProofBundle | null> {
  return wholeMarketPublicProofRegister.loadComplete();
}

export function loadWholeMarketPublicOwnerProof(username: string): Promise<WholeMarketPublicOwnerProof | null> {
  return wholeMarketPublicProofRegister.loadOwner(username);
}

export function primeWholeMarketPublicProofRegister(): Promise<WholeMarketPublicProofIndex | null> {
  return wholeMarketPublicProofRegister.prime();
}

export function subscribeWholeMarketPublicProofRegister(listener: () => void): () => void {
  return wholeMarketPublicProofRegister.subscribe(listener);
}

/** Rebuild only a missing projection from complete held sealed source custody. */
export async function restoreWholeMarketPublicProofFromEconomy(
  base: MarketDeskSnapshotTransport,
): Promise<Readonly<{ status: "restored"; bundle: WholeMarketPublicProofBundle } | { status: "unavailable"; code: string }>> {
  const held = await wholeMarketPublicProofRegister.loadComplete();
  if (held) return { status: "restored", bundle: held };
  const [{ restoreBrowserEconomyShowcase }, { createProfileShowcaseBoundedEdgeVault },
    { projectOwnerShowcaseOriginals }, { peekProfileRouteSnapshot },
    { buildLocalPublishedOriginalMarketAsset }, { recoverEconomyMarketOriginals }] = await Promise.all([
    import("../economy/showcase/browserEdgeVault"),
    import("../profile/showcase/boundedEdgeVault"),
    import("../profile/showcase/ownerSourceProjection"),
    import("../profile/routeHydration"),
    import("./profilePublishAppend"),
    import("./economySourceRecovery"),
  ]);
  const economy = await restoreBrowserEconomyShowcase();
  if (!economy) return { status: "unavailable", code: "ECONOMY_MARKET_SOURCE_NOT_HELD" };
  const vault = createProfileShowcaseBoundedEdgeVault();
  const recovered = await recoverEconomyMarketOriginals(economy, {
    readCompleteSource: artifactId => vault.readCompleteSource(artifactId),
    projectOriginals: source => projectOwnerShowcaseOriginals(source, { publicOnly: true }),
    readOwner: username => {
      const profile = peekProfileRouteSnapshot(username)?.profile.profile;
      return profile ? { userId: profile.userId, username: profile.username,
        displayName: profile.displayName, avatarUrl: profile.avatarUrl } : null;
    },
    projectMarketOriginal: buildLocalPublishedOriginalMarketAsset,
  });
  if (recovered.status === "unavailable") return recovered;
  const transport: MarketDeskSnapshotTransport = { ...base, publicOriginals: recovered.originals,
    publicMembership: { version: 1, scope: "whole-market-visible-showcase", source: "canonical-complete",
      isComplete: true, generatedAt: base.generatedAt, revision: economy.artifactDigest,
      itemCount: recovered.originals.length, economyShowcaseArtifactDigest: economy.artifactDigest,
      economyShowcaseParentArtifactDigests: economy.head.parentArtifactDigests } };
  const admitted = await wholeMarketPublicProofRegister.admitEconomyProjection(transport, economy);
  if (!admitted.admitted) return { status: "unavailable", code: `ECONOMY_MARKET_PROJECTION_${admitted.reason}` };
  const bundle = await wholeMarketPublicProofRegister.loadComplete();
  return bundle ? { status: "restored", bundle }
    : { status: "unavailable", code: "ECONOMY_MARKET_PROJECTION_NOT_HELD" };
}
