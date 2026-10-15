import { createReceizNodeOfflineKaiProofFactory } from "./offlineKaiProofNode.js";
import { mkdir, lstat, open, readFile, rename, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createReceizV127SubjectRuntimeAdapter, type ReceizV127SubjectRuntimeAdapterOptions, type ReceizV127SubjectRuntimeRecord, type ReceizV127SubjectRuntimeStore } from "./v127SubjectRuntimeAdapter.js";
import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { readRuntimeCustodiedReceizArtifactCanonicalOpen, verifyReceizArtifact } from "./artifactVerification.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";

export async function readReceizV127SubjectRuntimeSourceFile(path: string) {
  const bytes = await readFile(path);
  const verification = await verifyReceizArtifact(new File([bytes], basename(path)));
  const opened = await readRuntimeCustodiedReceizArtifactCanonicalOpen(verification, receizCurrentPinnedSignatureV4Roots());
  if (!opened) throw new TypeError("SUBJECT_RUNTIME_CANONICAL_SOURCE_REQUIRED");
  return { verification, payloadBytes: opened.payloadBytes };
}

/** Standard Node host: path configuration and passphrase belong to the host,
 * never the tool caller. Production roots are fixed by the SDK verifier. */
export async function openReceizV127SubjectRuntimeFromFiles(options: Omit<ReceizV127SubjectRuntimeAdapterOptions, "identityAdmission" | "store" | "initialSource"> & Readonly<{
  directory: string;
  identityArtifactPath: string;
  identityPassphrase: string;
  snapshotArtifactPath?: string;
}>) {
  if (Object.hasOwn(options, "initialKai") || Object.hasOwn(options, "temporalExecution")) throw new TypeError("SUBJECT_RUNTIME_RAW_KAI_AUTHORITY_FORBIDDEN");
  let prover: ReturnType<typeof createReceizNodeOfflineKaiProofFactory> | undefined;
  const resolveTemporalCoordinate = options.resolveTemporalCoordinate ?? (async (context) => {
    prover ??= createReceizNodeOfflineKaiProofFactory();
    return (await prover)({ previousKaiSigilProofHead: context.previousKaiSigilProofHead });
  });
  const readProof = async (path: string) => {
    const bytes = await readFile(path);
    return verifyReceizArtifact(new File([bytes], basename(path)));
  };
  const identityVerification = await readProof(options.identityArtifactPath);
  const identityAdmission = await createReceizArtifactAdmissionEngine()(identityVerification, { profile: "identity", identityPassphrase: options.identityPassphrase });
  const store = createReceizV127SubjectRuntimeFileStore(options.directory);
  // An already initialized host uses verified durable truth immediately. A
  // configured genesis source must never overwrite its appended current state.
  let initialSource;
  if (options.snapshotArtifactPath && await store.load() === null) {
    initialSource = await readReceizV127SubjectRuntimeSourceFile(options.snapshotArtifactPath);
  }
  return createReceizV127SubjectRuntimeAdapter({ registryDigest: options.registryDigest, reducerDigest: options.reducerDigest,
    identityAdmission, store, ...(initialSource ? { initialSource } : {}),
    resolveTemporalCoordinate,
    ...(options.model === undefined ? {} : { model: options.model }),
  });
}

/** Private local custody. Atomic rename is preceded by a cross-process lock;
 * contention fails closed, and a crashed writer's lock requires host recovery. */
export function createReceizV127SubjectRuntimeFileStore(directory: string): ReceizV127SubjectRuntimeStore {
  const root = resolve(directory);
  const file = join(root, "subject-runtime.json");
  const lock = join(root, "subject-runtime.lock");
  const ensure = async () => {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const stat = await lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error("SUBJECT_RUNTIME_PRIVATE_DIRECTORY_REQUIRED");
  };
  const load = async (): Promise<ReceizV127SubjectRuntimeRecord | null> => {
    await ensure();
    try {
      const stat = await lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error("SUBJECT_RUNTIME_PRIVATE_FILE_REQUIRED");
      return JSON.parse(await readFile(file, "utf8")) as ReceizV127SubjectRuntimeRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  };
  return Object.freeze({ load, compareAndSet: async (expectedRevision: string | null, next: ReceizV127SubjectRuntimeRecord) => {
    await ensure();
    try { await mkdir(lock, { mode: 0o700 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; }
    const temporary = join(root, `.subject-runtime-${randomUUID()}.tmp`);
    try {
      const current = await load();
      if ((current?.revision ?? null) !== expectedRevision) return false;
      const handle = await open(temporary, "wx", 0o600);
      try { await handle.writeFile(JSON.stringify(next)); await handle.sync(); } finally { await handle.close(); }
      await rename(temporary, file);
      const folder = await open(root, "r");
      try { await folder.sync(); } finally { await folder.close(); }
      return true;
    } finally { await rm(temporary, { force: true }); await rm(lock, { recursive: true }); }
  } });
}
