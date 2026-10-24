"use client";

import {
  createReceizArtifactAdmissionEngine,
  createReceizIdentityAdmissionEngineForRetainedRegistry,
  verifyReceizArtifactAdmission,
} from "../../../packages/receiz-sdk/src/artifactAdmission.js";
import type {
  ReceizArtifactAdmissionResult,
  ReceizVerifiedIdentityArtifactAdmission,
} from "../../../packages/receiz-sdk/src/artifactAdmissionTypes.js";
import { verifyReceizArtifact } from "../../../packages/receiz-sdk/src/artifactVerification.js";
import { sha256ReceizBytes } from "../../../packages/receiz-sdk/src/artifacts.js";

import { readPngTextChunk, countPngTextChunksByKeyword } from "@/app/utils/pngChunks";
import { decodeReceizProofBundle, RECEIZ_PROOF_BUNDLE_CHUNK_KEY } from "@/app/utils/receizProofBundle";

const LEGACY_STORE_NAME = "identity-artifacts";
const STORE_NAME = "identity-artifacts-v2";
const DEFAULT_DATABASE_NAME = "receiz-identity-artifact-custody-v1";

export type IdentityArtifactCustodySelector = Readonly<{
  ownerReceizId: string;
  actorId: string;
  issuerKeyId: string;
}>;

type StoredIdentityArtifact = Readonly<{
  custodyKey: string;
  ownerReceizId: string;
  actorId: string;
  issuerKeyId: string;
  exactBytes: Uint8Array;
  filename: string;
  mimeType: string;
  artifactSha256: string;
  payloadSha256: string;
  admissionDigest: string;
  actorEvidenceDigest: string;
  registryDigest?: string;
  verifierContextDigest?: string;
}>;

export type ReceizIdentityArtifactAdmitter = (input: Readonly<{
  artifact: Blob;
  ownerReceizId: string;
  actorId: string;
  passphrase: string;
  retainedRegistryDigest?: string;
}>) => Promise<ReceizArtifactAdmissionResult>;

export type ReceizIdentityArtifactCustody = Readonly<{
  admitAndStore(input: IdentityArtifactCustodySelector & Readonly<{
    artifact: Blob;
    passphrase: string;
  }>): Promise<ReceizVerifiedIdentityArtifactAdmission>;
  reopen(input: IdentityArtifactCustodySelector & Readonly<{
    passphrase: string;
  }>): Promise<ReceizVerifiedIdentityArtifactAdmission | null>;
  reopenForOwner(input: Readonly<{
    ownerReceizId: string;
    passphrase: string;
    preferredIssuerKeyIds?: readonly string[];
  }>): Promise<Readonly<{
    selector: IdentityArtifactCustodySelector;
    artifact: Blob;
    admission: ReceizVerifiedIdentityArtifactAdmission;
  }> | null>;
  readAdmitted(input: IdentityArtifactCustodySelector & Readonly<{
    expectedArtifactSha256: string;
  }>): Promise<Readonly<{
    selector: IdentityArtifactCustodySelector;
    artifact: Blob;
    filename: string;
    mimeType: string;
    artifactSha256: string;
  }> | null>;
  readAdmittedForActor(input: Readonly<{
    actorId: string;
    actorEvidenceRoots?: readonly string[];
    ownerReceizId?: string | null;
  }>): Promise<Readonly<{
    selector: IdentityArtifactCustodySelector;
    artifact: Blob;
    filename: string;
    mimeType: string;
    artifactSha256: string;
  }> | null>;
}>;

export type RestoredIdentityRecordVerification = Readonly<{
  profile: "identity";
  ownerReceizId: string;
  actorId: string;
  issuerKeyId: string;
  artifactSha256: string;
  legacyCompatibility: "current-native" | "verified-legacy-read";
}>;

export type RestoredIdentityRecordCustodyResult =
  | Readonly<{
    status: "not-an-identity-record";
  }>
  | Readonly<{
      status: "native-admitted";
      artifactSha256: string;
      actorAdmission: ReceizVerifiedIdentityArtifactAdmission;
  }>
  | Readonly<{
    status: "legacy-migration-required";
    legacyArtifactSha256: string;
  }>;

type RestoredIdentityRecordCustodyDependencies = Readonly<{
  verify?: (
    artifact: Blob,
  ) => Promise<RestoredIdentityRecordVerification | null>;
  admitNative?: (
    input: IdentityArtifactCustodySelector & Readonly<{
      artifact: Blob;
      passphrase: string;
    }>,
  ) => Promise<ReceizVerifiedIdentityArtifactAdmission>;
}>;

const PNG_SIGNATURE = Object.freeze([137, 80, 78, 71, 13, 10, 26, 10]);

async function isPngArtifact(artifact: Blob): Promise<boolean> {
  if (!(artifact instanceof Blob) || artifact.size < PNG_SIGNATURE.length) {
    return false;
  }
  const prefix = new Uint8Array(
    await artifact.slice(0, PNG_SIGNATURE.length).arrayBuffer(),
  );
  return PNG_SIGNATURE.every((byte, index) => prefix[index] === byte);
}

function custodyKey(selector: IdentityArtifactCustodySelector): string {
  return [
    selector.ownerReceizId.trim(),
    selector.actorId.trim(),
    selector.issuerKeyId.trim(),
  ].join("\u001f");
}

function admissionIssuerKeyId(
  admission: ReceizVerifiedIdentityArtifactAdmission,
): string {
  const prefix = "identity:";
  if (!admission.artifactId.startsWith(prefix)) {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ISSUER_REQUIRED");
  }
  const issuerKeyId = admission.artifactId.slice(prefix.length);
  if (!issuerKeyId) {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ISSUER_REQUIRED");
  }
  return issuerKeyId;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

function openDatabase(
  indexedDB: IDBFactory,
  databaseName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "custodyKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function defaultAdmitter(input: Readonly<{
  artifact: Blob;
  ownerReceizId: string;
  actorId: string;
  passphrase: string;
  retainedRegistryDigest?: string;
}>): Promise<ReceizArtifactAdmissionResult> {
  const verification = await verifyReceizArtifact(input.artifact);
  if (verification.status === "invalid") {
    console.warn("receiz_identity_artifact_verification_failed", {
      errors: verification.errors.map((error) => ({
        code: error.code,
        message: error.message,
      })),
    });
  }
  const engine = input.retainedRegistryDigest
    ? await createReceizIdentityAdmissionEngineForRetainedRegistry(input.retainedRegistryDigest)
    : createReceizArtifactAdmissionEngine();
  return engine(verification, {
    profile: "identity",
    ownerConstraint: input.ownerReceizId,
    actorConstraint: input.actorId,
    identityPassphrase: input.passphrase,
  });
}

async function verifiedIdentityAdmission(
  candidate: ReceizArtifactAdmissionResult,
  ownerReceizId: string,
  actorId: string,
): Promise<ReceizVerifiedIdentityArtifactAdmission & {
  openedArtifact: NonNullable<ReceizVerifiedIdentityArtifactAdmission["openedArtifact"]>;
}> {
  const sdkVerifiedCandidate = await verifyReceizArtifactAdmission(candidate);
  if ("code" in sdkVerifiedCandidate) {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:ADMISSION_NOT_VERIFIED");
  }
  if (candidate.verdict === "profile-denied") {
    throw new TypeError(
      `RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:${candidate.explanation.summaryCode}`,
    );
  }
  if (candidate.verdict !== "canonical-identity") {
    throw new TypeError(
      `RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:${candidate.explanation.summaryCode}`,
    );
  }
  const verified = sdkVerifiedCandidate;
  if (verified.profile !== "identity") {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:PROFILE_MISMATCH");
  }
  if (verified.verdict !== "canonical-identity") {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:VERDICT_MISMATCH");
  }
  if (verified.ownerReceizId !== ownerReceizId) {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:OWNER_MISMATCH");
  }
  if (verified.actor.actorId !== actorId) {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:ACTOR_MISMATCH");
  }
  if (!verified.openedArtifact || verified.openedArtifact.legacyCompatibility !== "current-native") {
    throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED:NATIVE_RECORD_REQUIRED");
  }
  return verified as ReceizVerifiedIdentityArtifactAdmission & {
    openedArtifact: NonNullable<ReceizVerifiedIdentityArtifactAdmission["openedArtifact"]>;
  };
}

function artifactFile(
  exactBytes: Uint8Array,
  filename: string,
  mimeType: string,
): Blob {
  const bytes = exactBytes.slice();
  return typeof File === "undefined"
    ? new Blob([bytes], { type: mimeType })
    : new File([bytes], filename, { type: mimeType });
}

/** Existing native PNG proof chunk selects enclosing admission, never embedded-key fallback. */
export async function admitSuppliedNativeIdentityRecordCustody(
  input: IdentityArtifactCustodySelector & Readonly<{ artifact: Blob; passphrase: string }>,
  custody?: Pick<ReceizIdentityArtifactCustody, "admitAndStore">,
): Promise<RestoredIdentityRecordCustodyResult> {
  if (!(await isPngArtifact(input.artifact))) return { status: "not-an-identity-record" };
  const bytes = new Uint8Array(await input.artifact.arrayBuffer());
  const count = countPngTextChunksByKeyword(bytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
  if (count > 1) throw new TypeError("RECEIZ_IDENTITY_RESTORE_PROOF_REQUIRED");
  const encoded = readPngTextChunk(bytes, RECEIZ_PROOF_BUNDLE_CHUNK_KEY);
  if (encoded === null) return { status: "not-an-identity-record" };
  let bundle: ReturnType<typeof decodeReceizProofBundle>;
  try { bundle = decodeReceizProofBundle(encoded); }
  catch { throw new TypeError("RECEIZ_IDENTITY_RESTORE_PROOF_REQUIRED"); }
  if (!bundle) throw new TypeError("RECEIZ_IDENTITY_RESTORE_PROOF_REQUIRED");
  if (!bundle.nativeRecordSeal) return { status: "not-an-identity-record" };
  const actorAdmission = await (custody ?? createReceizIdentityArtifactCustody()).admitAndStore(input);
  return Object.freeze({ status: "native-admitted", artifactSha256: actorAdmission.artifactSha256, actorAdmission });
}

export async function admitRestoredIdentityRecordCustody(
  input: IdentityArtifactCustodySelector & Readonly<{
    artifact: Blob;
    passphrase: string;
  }>,
  dependencies: RestoredIdentityRecordCustodyDependencies = {},
): Promise<RestoredIdentityRecordCustodyResult> {
  if (!(await isPngArtifact(input.artifact))) {
    return Object.freeze({ status: "not-an-identity-record" as const });
  }
  const verify = dependencies.verify ?? (async (artifact) => {
    try {
      const opened = await verifyReceizArtifact(artifact);
      if (opened.status !== "verified-artifact") return null;
      const ownerReceizId = opened.continuity.ownerReceizId;
      if (!ownerReceizId) return null;
      return {
        profile: "identity" as const,
        ownerReceizId,
        actorId: input.actorId,
        issuerKeyId: input.issuerKeyId,
        artifactSha256: opened.artifactDigest.value,
        legacyCompatibility: opened.verification.bundle.nativeRecordSeal
          ? "current-native" as const
          : "verified-legacy-read" as const,
      };
    } catch {
      return null;
    }
  });
  const verified = await verify(input.artifact);
  if (
    !verified
    || verified.profile !== "identity"
    || verified.ownerReceizId !== input.ownerReceizId
    || verified.actorId !== input.actorId
    || verified.issuerKeyId !== input.issuerKeyId
  ) {
    throw new TypeError("RECEIZ_IDENTITY_RESTORE_PROOF_REQUIRED");
  }
  if (verified.legacyCompatibility === "verified-legacy-read") {
    return Object.freeze({
      status: "legacy-migration-required" as const,
      legacyArtifactSha256: verified.artifactSha256,
    });
  }
  const admission = await (
    dependencies.admitNative
    ?? ((nativeInput) =>
      createReceizIdentityArtifactCustody().admitAndStore(nativeInput))
  )(input);
  return Object.freeze({
    status: "native-admitted" as const,
    artifactSha256: admission.artifactSha256,
    actorAdmission: admission,
  });
}

export function createReceizIdentityArtifactCustody(options: Readonly<{
  indexedDB?: IDBFactory;
  databaseName?: string;
  admitArtifact?: ReceizIdentityArtifactAdmitter;
}> = {}): ReceizIdentityArtifactCustody {
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  if (!indexedDB) throw new TypeError("RECEIZ_IDENTITY_PROOF_STORAGE_REQUIRED");
  const databaseName = options.databaseName?.trim() || DEFAULT_DATABASE_NAME;
  const admitArtifact = options.admitArtifact ?? defaultAdmitter;

  const admitExact = async (input: Readonly<{
    artifact: Blob;
    ownerReceizId: string;
    actorId: string;
    issuerKeyId: string;
    passphrase: string;
    retainedRegistryDigest?: string;
  }>) => {
    if (
      !(input.artifact instanceof Blob)
      || input.artifact.size <= 0
      || !input.ownerReceizId.trim()
      || !input.actorId.trim()
      || !input.issuerKeyId.trim()
      || typeof input.passphrase !== "string"
    ) throw new TypeError("RECEIZ_IDENTITY_PROOF_INPUT_INVALID");
    const admission = await verifiedIdentityAdmission(
      await admitArtifact(input),
      input.ownerReceizId,
      input.actorId,
    );
    if (admissionIssuerKeyId(admission) !== input.issuerKeyId) {
      throw new TypeError("RECEIZ_IDENTITY_PROOF_ISSUER_MISMATCH");
    }
    return admission;
  };

  const reopenStored = async (
    stored: StoredIdentityArtifact,
    passphrase: string,
  ): Promise<Readonly<{
    selector: IdentityArtifactCustodySelector;
    artifact: Blob;
    admission: ReceizVerifiedIdentityArtifactAdmission;
  }>> => {
    const exactBytes = new Uint8Array(stored.exactBytes);
    if (await sha256ReceizBytes(exactBytes) !== stored.artifactSha256) {
      throw new TypeError("RECEIZ_IDENTITY_PROOF_EXACT_BYTES_MISMATCH");
    }
    const artifact = artifactFile(
      exactBytes,
      stored.filename,
      stored.mimeType,
    );
    const admission = await admitExact({
      artifact,
      ownerReceizId: stored.ownerReceizId,
      actorId: stored.actorId,
      issuerKeyId: stored.issuerKeyId,
      passphrase,
      retainedRegistryDigest: stored.registryDigest,
    });
    if (
      admission.artifactSha256 !== stored.artifactSha256
      || admission.payloadSha256 !== stored.payloadSha256
      || admissionIssuerKeyId(admission) !== stored.issuerKeyId
      || admission.actor.actorId !== stored.actorId
      || admission.admissionDigest.value !== stored.admissionDigest
      || admission.actor.evidenceDigest.value !== stored.actorEvidenceDigest
      || (stored.verifierContextDigest !== undefined && admission.admissionProof.verifierContextDigest !== stored.verifierContextDigest)
    ) {
      throw new TypeError("RECEIZ_IDENTITY_PROOF_BINDING_MISMATCH");
    }
    return Object.freeze({
      selector: Object.freeze({
        ownerReceizId: stored.ownerReceizId,
        actorId: stored.actorId,
        issuerKeyId: stored.issuerKeyId,
      }),
      artifact,
      admission,
    });
  };

  return Object.freeze({
    async admitAndStore(input) {
      const admission = await admitExact(input);
      const exactBytes = new Uint8Array(await input.artifact.arrayBuffer());
      const artifactSha256 = await sha256ReceizBytes(exactBytes);
      if (artifactSha256 !== admission.artifactSha256) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_EXACT_BYTES_MISMATCH");
      }
      const stored: StoredIdentityArtifact = Object.freeze({
        custodyKey: custodyKey(input),
        ownerReceizId: input.ownerReceizId,
        actorId: input.actorId,
        issuerKeyId: input.issuerKeyId,
        exactBytes: exactBytes.slice(),
        filename: admission.openedArtifact.sealedArtifact.filename,
        mimeType: admission.openedArtifact.sealedArtifact.mimeType,
        artifactSha256,
        payloadSha256: admission.payloadSha256,
        admissionDigest: admission.admissionDigest.value,
        actorEvidenceDigest: admission.actor.evidenceDigest.value,
        registryDigest: admission.admissionProof.registryDigest,
        verifierContextDigest: admission.admissionProof.verifierContextDigest,
      });
      const database = await openDatabase(indexedDB, databaseName);
      try {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const previous = await requestResult(store.get(stored.custodyKey)) as StoredIdentityArtifact | undefined;
        if (previous && previous.artifactSha256 !== stored.artifactSha256) {
          // Preserve the exact prior native generation, not a reconstructed key carrier.
          store.put({ ...previous, custodyKey: custodyKey(previous) + "\u001f" + previous.artifactSha256 });
        }
        store.put(stored);
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
      return admission;
    },

    async reopen(input) {
      const database = await openDatabase(indexedDB, databaseName);
      let stored: StoredIdentityArtifact | undefined;
      let migratedLegacy = false;
      try {
        const storeNames = database.objectStoreNames.contains(LEGACY_STORE_NAME)
          ? [STORE_NAME, LEGACY_STORE_NAME]
          : [STORE_NAME];
        const transaction = database.transaction(storeNames, "readonly");
        stored = await requestResult(
          transaction.objectStore(STORE_NAME).get(custodyKey(input)),
        ) as StoredIdentityArtifact | undefined;
        if (!stored && transaction.objectStoreNames.contains(LEGACY_STORE_NAME)) {
          const legacy = await requestResult(
            transaction.objectStore(LEGACY_STORE_NAME).get(input.ownerReceizId),
          ) as Omit<StoredIdentityArtifact, "custodyKey" | "issuerKeyId"> | undefined;
          if (legacy) {
            stored = {
              ...legacy,
              custodyKey: custodyKey(input),
              issuerKeyId: input.issuerKeyId,
            };
            migratedLegacy = true;
          }
        }
      } finally {
        database.close();
      }
      if (!stored) return null;
      try {
        const reopened = await reopenStored(stored, input.passphrase);
        const admission = reopened.admission;
        if (
          stored.actorId !== input.actorId
          || stored.issuerKeyId !== input.issuerKeyId
        ) {
          throw new TypeError("RECEIZ_IDENTITY_PROOF_BINDING_MISMATCH");
        }
        if (migratedLegacy) {
          const migrationDatabase = await openDatabase(indexedDB, databaseName);
          try {
            const transaction = migrationDatabase.transaction(STORE_NAME, "readwrite");
            transaction.objectStore(STORE_NAME).put(stored);
            await transactionComplete(transaction);
          } finally {
            migrationDatabase.close();
          }
        }
        return admission;
      } catch {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_REOPEN_FAILED");
      }
    },

    async reopenForOwner(input) {
      const ownerReceizId = input.ownerReceizId.trim();
      if (!ownerReceizId || typeof input.passphrase !== "string") {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_INPUT_INVALID");
      }
      const database = await openDatabase(indexedDB, databaseName);
      let stored: StoredIdentityArtifact[];
      try {
        const transaction = database.transaction(STORE_NAME, "readonly");
        stored = (
          await requestResult(transaction.objectStore(STORE_NAME).getAll())
        ).filter((candidate) =>
          candidate.ownerReceizId === ownerReceizId
        ) as StoredIdentityArtifact[];
      } finally {
        database.close();
      }
      if (stored.length === 0) return null;
      const preferred = new Map(
        (input.preferredIssuerKeyIds ?? [])
          .map((value) => value.trim())
          .filter(Boolean)
          .map((value, index) => [value, index] as const),
      );
      stored.sort((left, right) => {
        const leftRank = preferred.get(left.issuerKeyId)
          ?? Number.MAX_SAFE_INTEGER;
        const rightRank = preferred.get(right.issuerKeyId)
          ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank
          || left.custodyKey.localeCompare(right.custodyKey);
      });
      for (const candidate of stored) {
        try {
          return await reopenStored(candidate, input.passphrase);
        } catch {
          // Another same-owner Identity Record may be the currently unlocked
          // proof. Every candidate is reverified before it can be selected.
        }
      }
      throw new TypeError("RECEIZ_IDENTITY_PROOF_REOPEN_FAILED");
    },

    async readAdmitted(input) {
      const expectedArtifactSha256 = input.expectedArtifactSha256.trim().toLowerCase();
      if (!/^[0-9a-f]{64}$/u.test(expectedArtifactSha256)) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_ADMISSION_REQUIRED");
      }
      const database = await openDatabase(indexedDB, databaseName);
      let stored: StoredIdentityArtifact | undefined;
      try {
        const transaction = database.transaction(STORE_NAME, "readonly");
        stored = await requestResult(transaction.objectStore(STORE_NAME).get(custodyKey(input) + "\u001f" + expectedArtifactSha256)) as StoredIdentityArtifact | undefined;
        if (!stored) stored = await requestResult(transaction.objectStore(STORE_NAME).get(custodyKey(input))) as StoredIdentityArtifact | undefined;
      } finally {
        database.close();
      }
      if (!stored) return null;
      if (stored.artifactSha256 !== expectedArtifactSha256
        || stored.ownerReceizId !== input.ownerReceizId
        || stored.actorId !== input.actorId
        || stored.issuerKeyId !== input.issuerKeyId) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_BINDING_MISMATCH");
      }
      const exactBytes = new Uint8Array(stored.exactBytes);
      if (await sha256ReceizBytes(exactBytes) !== expectedArtifactSha256) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_EXACT_BYTES_MISMATCH");
      }
      return Object.freeze({
        selector: Object.freeze({
          ownerReceizId: stored.ownerReceizId,
          actorId: stored.actorId,
          issuerKeyId: stored.issuerKeyId,
        }),
        artifact: artifactFile(exactBytes, stored.filename, stored.mimeType),
        filename: stored.filename,
        mimeType: stored.mimeType,
        artifactSha256: stored.artifactSha256,
      });
    },

    async readAdmittedForActor(input) {
      const actorId = input.actorId.trim();
      const ownerReceizId = input.ownerReceizId?.trim() || null;
      if (!actorId) throw new TypeError("RECEIZ_IDENTITY_PROOF_INPUT_INVALID");
      const database = await openDatabase(indexedDB, databaseName);
      let stored: StoredIdentityArtifact[];
      try {
        const transaction = database.transaction(STORE_NAME, "readonly");
        stored = (await requestResult(transaction.objectStore(STORE_NAME).getAll()) as StoredIdentityArtifact[])
          .filter((candidate) => candidate.actorId === actorId && (!ownerReceizId || candidate.ownerReceizId === ownerReceizId)
            && (!input.actorEvidenceRoots || input.actorEvidenceRoots.includes(candidate.actorEvidenceDigest)));
      } finally {
        database.close();
      }
      stored.sort((left, right) => left.custodyKey.localeCompare(right.custodyKey));
      const admitted = stored[0];
      if (!admitted) return null;
      const exactBytes = new Uint8Array(admitted.exactBytes);
      if (await sha256ReceizBytes(exactBytes) !== admitted.artifactSha256) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_EXACT_BYTES_MISMATCH");
      }
      return Object.freeze({
        selector: Object.freeze({
          ownerReceizId: admitted.ownerReceizId,
          actorId: admitted.actorId,
          issuerKeyId: admitted.issuerKeyId,
        }),
        artifact: artifactFile(exactBytes, admitted.filename, admitted.mimeType),
        filename: admitted.filename,
        mimeType: admitted.mimeType,
        artifactSha256: admitted.artifactSha256,
      });
    },
  });
}
