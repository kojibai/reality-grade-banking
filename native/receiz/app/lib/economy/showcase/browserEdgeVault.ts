"use client";

import {
  RECEIZ_V114_REGISTRY_DIGEST,
  appendReceizCarriedProofHistoryHeadV114,
  canonicalizeReceizConstitution,
  createReceizArtifactAdmissionEngine,
  createReceizCarriedProofHistoryHeadV114,
  createReceizEconomyShowcaseCarrierV114,
  createReceizProofHistoryNode,
  deriveReceizEconomyShowcaseGenesisHeadV114,
  deriveReceizEconomyShowcaseSuccessorHeadV114,
  rederiveReceizEconomyShowcaseCarrierFromAdmission,
  verifyReceizArtifact,
  type ReceizConstitutionJson,
  type ReceizVerifiedEconomyShowcaseAdmission,
  type ReceizVerifiedProfileShowcaseAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import { admitVerifiedProfileShowcaseForEconomy } from "./artifact";
import {
  readBrowserEconomyActiveHead,
  retryBrowserEconomyAppend,
  writeEconomyAdmissionsAndCompareAdvance,
  type BrowserEconomyHeadAdvanceResult,
} from "./browserEconomyHeadStore";
import { recoverHeldEconomyShowcase, recoverVerifiedEconomyShowcaseHistory } from "./historyRecovery";
import {
  ECONOMY_SHOWCASE_ARTIFACT_ID,
  type VerifiedEconomyShowcase,
} from "./types";

const DATABASE_NAME = "receiz-economy-showcase-edge-v1";
const LEGACY_HEAD_STORE = "sealed-heads";
const ECONOMY_ADMISSION_STORE = "immutable-economy-admissions";
const PROFILE_ADMISSION_STORE = "immutable-profile-admissions";
const ACTIVE_HEAD_STORE = "active-economy-head";

type StoredAdmission = Readonly<{
  artifactDigest: string;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

type StoredActiveHead = Readonly<{
  artifactId: typeof ECONOMY_SHOWCASE_ARTIFACT_ID;
  artifactDigest: string;
}>;

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(LEGACY_HEAD_STORE)) {
        database.createObjectStore(LEGACY_HEAD_STORE, {
          keyPath: "artifactId",
        });
      }
      if (!database.objectStoreNames.contains(ECONOMY_ADMISSION_STORE)) {
        database.createObjectStore(ECONOMY_ADMISSION_STORE, {
          keyPath: "artifactDigest",
        });
      }
      if (!database.objectStoreNames.contains(PROFILE_ADMISSION_STORE)) {
        database.createObjectStore(PROFILE_ADMISSION_STORE, {
          keyPath: "artifactDigest",
        });
      }
      if (!database.objectStoreNames.contains(ACTIVE_HEAD_STORE)) {
        database.createObjectStore(ACTIVE_HEAD_STORE, {
          keyPath: "artifactId",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function sealEconomyCarrier(
  carrier: Readonly<Record<string, unknown>>,
): Promise<ReceizVerifiedEconomyShowcaseAdmission> {
  const sealed = await receizeDocumentBytesClient({
    fileBytes: new TextEncoder().encode(canonicalizeReceizConstitution(
      carrier as ReceizConstitutionJson,
    )),
    filename: "economy-showcase.json",
    mime: "application/json",
    options: {
      forceBundleEnvelope: true,
      nativeRecordSeal: {
        ownerReceizId: "economy.receiz.id",
        recordId: ECONOMY_SHOWCASE_ARTIFACT_ID,
      },
    },
  });
  const artifact = new File(
    [sealed.artifactBytes.slice()],
    sealed.downloadName,
    {
      type: sealed.kind === "bundle"
        ? "application/vnd.receiz.bundle+json"
        : "application/octet-stream",
    },
  );
  const admission = await createReceizArtifactAdmissionEngine()(
    await verifyReceizArtifact(artifact),
    {
      profile: "economy-showcase",
      ownerConstraint: "economy.receiz.id",
    },
  );
  if (
    admission.profile !== "economy-showcase"
    || !("openedArtifact" in admission)
    || admission.proofHistoryHead === null
  ) {
    throw new TypeError("ECONOMY_SHOWCASE_EDGE_ADMISSION_REQUIRED");
  }
  return admission;
}

async function economyAdmissionFromStored(
  stored: StoredAdmission,
): Promise<ReceizVerifiedEconomyShowcaseAdmission | null> {
  const artifact = new File(
    [new Uint8Array(stored.exactBytes)],
    stored.filename,
    { type: stored.mimeType },
  );
  const admission = await createReceizArtifactAdmissionEngine()(
    await verifyReceizArtifact(artifact),
    {
      profile: "economy-showcase",
      ownerConstraint: "economy.receiz.id",
    },
  );
  return admission.profile === "economy-showcase"
    && "openedArtifact" in admission
    && admission.proofHistoryHead !== null
    && (!stored.artifactDigest
      || admission.artifactSha256 === stored.artifactDigest)
    ? admission
    : null;
}

async function profileAdmissionFromStored(
  stored: StoredAdmission,
): Promise<ReceizVerifiedProfileShowcaseAdmission | null> {
  const artifact = new File(
    [new Uint8Array(stored.exactBytes)],
    stored.filename,
    { type: stored.mimeType },
  );
  const verification = await verifyReceizArtifact(artifact);
  if (
    verification.status !== "verified-artifact"
    || !verification.continuity.ownerReceizId
  ) return null;
  const ownerReceizId = verification.continuity.ownerReceizId;
  const admission = await createReceizArtifactAdmissionEngine()(verification, {
    profile: "profile-showcase",
    ownerConstraint: ownerReceizId,
  });
  return admission.profile === "profile-showcase"
    && "openedArtifact" in admission
    && admission.proofHistoryHead !== null
    && admission.artifactSha256 === stored.artifactDigest
    ? admission
    : null;
}

async function readEconomyAdmissionByDigest(
  artifactDigest: string,
): Promise<ReceizVerifiedEconomyShowcaseAdmission | null> {
  const database = await openDatabase();
  try {
    const stored = await requestResult(
      database.transaction(ECONOMY_ADMISSION_STORE, "readonly")
        .objectStore(ECONOMY_ADMISSION_STORE)
        .get(artifactDigest),
    ) as StoredAdmission | undefined;
    return stored ? economyAdmissionFromStored(stored) : null;
  } finally {
    database.close();
  }
}

async function readProfileAdmissionByDigest(
  artifactDigest: string,
): Promise<ReceizVerifiedProfileShowcaseAdmission | null> {
  const database = await openDatabase();
  try {
    const stored = await requestResult(
      database.transaction(PROFILE_ADMISSION_STORE, "readonly")
        .objectStore(PROFILE_ADMISSION_STORE)
        .get(artifactDigest),
    ) as StoredAdmission | undefined;
    return stored ? profileAdmissionFromStored(stored) : null;
  } finally {
    database.close();
  }
}

async function readStoredAdmission(): Promise<
  ReceizVerifiedEconomyShowcaseAdmission | null
> {
  const database = await openDatabase();
  try {
    const active = await requestResult(
      database.transaction(ACTIVE_HEAD_STORE, "readonly")
        .objectStore(ACTIVE_HEAD_STORE)
        .get(ECONOMY_SHOWCASE_ARTIFACT_ID),
    ) as StoredActiveHead | undefined;
    if (active) {
      const stored = await requestResult(
        database.transaction(ECONOMY_ADMISSION_STORE, "readonly")
          .objectStore(ECONOMY_ADMISSION_STORE)
          .get(active.artifactDigest),
      ) as StoredAdmission | undefined;
      if (!stored || stored.artifactDigest !== active.artifactDigest) {
        throw new TypeError("ECONOMY_SHOWCASE_ACTIVE_ADMISSION_REQUIRED");
      }
      const admission = await economyAdmissionFromStored(stored);
      if (!admission) throw new TypeError("ECONOMY_SHOWCASE_ACTIVE_ADMISSION_REQUIRED");
      return admission;
    }
    const legacy = await requestResult(
      database.transaction(LEGACY_HEAD_STORE, "readonly")
        .objectStore(LEGACY_HEAD_STORE)
        .get(ECONOMY_SHOWCASE_ARTIFACT_ID),
    ) as (Omit<StoredAdmission, "artifactDigest"> & {
      artifactId: typeof ECONOMY_SHOWCASE_ARTIFACT_ID;
    }) | undefined;
    return legacy
      ? economyAdmissionFromStored({ ...legacy, artifactDigest: "" })
      : null;
  } finally {
    database.close();
  }
}

/** Restores the complete locally held economy without publication or remote discovery. */
export function restoreBrowserEconomyShowcase(): Promise<VerifiedEconomyShowcase | null> {
  return recoverHeldEconomyShowcase({
    loadActiveAdmission: readStoredAdmission,
    loadEconomyAdmission: readEconomyAdmissionByDigest,
    loadProfileAdmission: readProfileAdmissionByDigest,
  });
}

async function storedAdmission(
  admission:
    | ReceizVerifiedEconomyShowcaseAdmission
    | ReceizVerifiedProfileShowcaseAdmission,
): Promise<StoredAdmission> {
  const sealed = admission.openedArtifact.sealedArtifact;
  return {
    artifactDigest: admission.artifactSha256,
    exactBytes: new Uint8Array(await sealed.artifact.arrayBuffer()),
    filename: sealed.filename,
    mimeType: sealed.mimeType,
  };
}

async function writeAdmissionsAndAdvanceHead(input: Readonly<{
  predecessor: ReceizVerifiedEconomyShowcaseAdmission;
  successor: ReceizVerifiedEconomyShowcaseAdmission;
  profile: ReceizVerifiedProfileShowcaseAdmission;
  expectedPredecessorDigest: string | null;
}>): Promise<BrowserEconomyHeadAdvanceResult> {
  const [predecessor, successor, profile] = await Promise.all([
    storedAdmission(input.predecessor),
    storedAdmission(input.successor),
    storedAdmission(input.profile),
  ]);
  return writeEconomyAdmissionsAndCompareAdvance({
    indexedDB,
    databaseName: DATABASE_NAME,
    predecessor,
    successor,
    profile,
    expectedPredecessorDigest: input.expectedPredecessorDigest,
  });
}

async function createGenesis(): Promise<ReceizVerifiedEconomyShowcaseAdmission> {
  const head = await deriveReceizEconomyShowcaseGenesisHeadV114({
    genesisKaiUpulse: "0",
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
  });
  const node = await createReceizProofHistoryNode({
    artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    parentDigests: [],
    kaiPulse: "0",
    receipt: {},
    event: {
      type: "state.append",
      state: head as unknown as ReceizConstitutionJson,
    },
    namespaceData: {
      "economy-showcase": head as unknown as ReceizConstitutionJson,
    },
  });
  const historyHead = await createReceizCarriedProofHistoryHeadV114({
    artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
    registryDigest: RECEIZ_V114_REGISTRY_DIGEST,
    rootDigest: node.nodeDigest,
    headDigest: node.nodeDigest,
    nodeCount: 1,
    accumulator: {
      algorithm: "sha256/binary-carry/v1",
      leafCount: 1,
      root: node.nodeDigest,
      frontier: [node.nodeDigest],
    },
    currentNode: node,
    parentRefs: [],
  });
  return sealEconomyCarrier(
    await createReceizEconomyShowcaseCarrierV114({ head, historyHead }),
  );
}

export async function appendProfileShowcaseToBrowserEconomy(
  profileAdmission: ReceizVerifiedProfileShowcaseAdmission,
): Promise<VerifiedEconomyShowcase> {
  const profile = await admitVerifiedProfileShowcaseForEconomy(
    profileAdmission,
  );
  return retryBrowserEconomyAppend<VerifiedEconomyShowcase>({
    maxAttempts: 4,
    attempt: async () => {
      const activeArtifactDigest = await readBrowserEconomyActiveHead({
        indexedDB,
        databaseName: DATABASE_NAME,
      });
      const predecessorAdmission = activeArtifactDigest
        ? await readEconomyAdmissionByDigest(activeArtifactDigest)
        : await readStoredAdmission() ?? await createGenesis();
      if (!predecessorAdmission) {
        throw new TypeError("ECONOMY_SHOWCASE_ACTIVE_ADMISSION_REQUIRED");
      }
      const predecessor =
        await rederiveReceizEconomyShowcaseCarrierFromAdmission(
          predecessorAdmission,
        );
      const head = await deriveReceizEconomyShowcaseSuccessorHeadV114({
        predecessorHead: predecessor["economy-showcase"],
        predecessorArtifactDigest: predecessorAdmission.artifactSha256,
        profileShowcases: [profile],
        resolveCheckpoint: () => predecessorAdmission.artifactSha256,
      });
      const node = await createReceizProofHistoryNode({
        artifactId: ECONOMY_SHOWCASE_ARTIFACT_ID,
        registryDigest: head.versions.registryDigest,
        parentDigests: [predecessor.receizProofHistory.headDigest],
        kaiPulse: head.headKaiUpulse,
        receipt: {},
        event: {
          type: "state.append",
          state: head as unknown as ReceizConstitutionJson,
        },
        namespaceData: {
          "economy-showcase": head as unknown as ReceizConstitutionJson,
        },
      });
      const historyHead = await appendReceizCarriedProofHistoryHeadV114({
        predecessor: predecessor.receizProofHistory,
        predecessorArtifactDigest: predecessorAdmission.artifactSha256,
        appendNode: node,
      });
      const admission = await sealEconomyCarrier(
        await createReceizEconomyShowcaseCarrierV114({
          head,
          historyHead,
        }),
      );
      const advancement = await writeAdmissionsAndAdvanceHead({
        predecessor: predecessorAdmission,
        successor: admission,
        profile: profileAdmission,
        expectedPredecessorDigest: activeArtifactDigest,
      });
      if (advancement.status === "conflict") {
        return { status: "conflict" as const };
      }
      return {
        status: "advanced" as const,
        value: await recoverVerifiedEconomyShowcaseHistory({
          activeAdmission: admission,
          loadEconomyAdmission: readEconomyAdmissionByDigest,
          loadProfileAdmission: readProfileAdmissionByDigest,
        }),
      };
    },
  });
}
