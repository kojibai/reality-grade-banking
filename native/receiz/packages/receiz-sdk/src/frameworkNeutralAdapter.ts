import {
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE,
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
  validateReceizAppContract,
  type ReceizAppContract,
} from "./appContract.js";
import { createHash } from "node:crypto";
import type { ReceizGeneratedFile } from "./frameworkAdapters.js";
import { RECEIZ_CURRENT_REGISTRY_DIGEST, RECEIZ_RELEASE_VERSION } from "./releaseIdentity.js";

const header = (path: string) => `// @receiz-generated ${RECEIZ_RELEASE_VERSION}\n// ${path}\n`;

function generated(path: string, content: string): ReceizGeneratedFile {
  return {
    path,
    content,
    ownership: "receiz-generated",
    developerEditable: false,
    authorityBoundary: "sealed-receiz-proof-object",
  };
}

function extension(): ReceizGeneratedFile {
  return {
    path: "receiz/receiz.extensions.ts",
    content: "// @receiz-extension developer-owned extension boundary.\n",
    ownership: "receiz-extension",
    developerEditable: true,
    authorityBoundary: "sealed-receiz-proof-object",
  };
}

function client(): ReceizGeneratedFile {
  return generated("receiz/client.ts", `${header("receiz/client.ts")}
import { createReceizClient } from "@receiz/sdk";

export const receizClient = createReceizClient({
  baseUrl: import.meta.env.VITE_RECEIZ_BASE_URL,
});
`);
}

function server(): ReceizGeneratedFile {
  return generated("receiz/server.ts", `${header("receiz/server.ts")}
import { createReceizClient } from "@receiz/sdk";
import nodeProcess from "node:process";

export function assertReceizTrustedHost() {
  const scope = globalThis as typeof globalThis & Readonly<{
    window?: unknown;
    self?: unknown;
    process?: unknown;
  }>;
  const browserProcessShim = (nodeProcess as typeof nodeProcess & Readonly<{ browser?: unknown }>).browser === true;
  if (typeof scope.window !== "undefined"
    || (typeof scope.self !== "undefined" && scope.self === globalThis)
    || scope.process !== nodeProcess
    || nodeProcess.release?.name !== "node"
    || typeof nodeProcess.versions?.node !== "string"
    || Object.prototype.toString.call(nodeProcess) !== "[object process]"
    || browserProcessShim) {
    throw new Error("receiz_trusted_host_required");
  }
}

assertReceizTrustedHost();

export function createReceizServerClient(input: { baseUrl: string; accessToken: string }) {
  return createReceizClient(input);
}
`);
}

function continuity(): ReceizGeneratedFile {
  return generated("receiz/continuity.ts", `${header("receiz/continuity.ts")}
import { receizClient } from "./client";

export async function verifyAndOpenKnownProof(input: { file: Blob }) {
  return receizClient.artifacts.verifyAndOpen(input.file);
}

export type ReceizGeneratedJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ReceizGeneratedJsonValue[]
  | Readonly<{ readonly [key: string]: ReceizGeneratedJsonValue }>;

export type ReceizGeneratedImmutable<T> =
  T extends readonly (infer Item)[]
    ? readonly ReceizGeneratedImmutable<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: ReceizGeneratedImmutable<T[Key]> }
      : T;

function projectKnownProofJson(value: unknown, seen: WeakSet<object>): ReceizGeneratedJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new TypeError("receiz_known_proof_projection_invalid");
  }
  if (typeof value !== "object" || seen.has(value)) throw new TypeError("receiz_known_proof_projection_invalid");
  seen.add(value);
  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value as object);
    const lengthDescriptor = descriptors["length"];
    if (Object.getPrototypeOf(value) !== Array.prototype
      || !lengthDescriptor || !("value" in lengthDescriptor)
      || typeof lengthDescriptor.value !== "number"
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0
      || Reflect.ownKeys(descriptors).length !== lengthDescriptor.value + 1) {
      throw new TypeError("receiz_known_proof_projection_invalid");
    }
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError("receiz_known_proof_projection_invalid");
      }
    }
    const projected: ReceizGeneratedJsonValue[] = [];
    for (let index = 0; index < lengthDescriptor.value; index += 1) {
      projected.push(projectKnownProofJson(descriptors[String(index)]!.value, seen));
    }
    return Object.freeze(projected);
  }
  const prototype = Object.getPrototypeOf(value);
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if ((prototype !== Object.prototype && prototype !== null)
    || Object.getOwnPropertySymbols(record).length !== 0
    || Object.getOwnPropertyNames(record).length !== keys.length) throw new TypeError("receiz_known_proof_projection_invalid");
  const projected: Record<string, ReceizGeneratedJsonValue> = Object.create(null) as Record<string, ReceizGeneratedJsonValue>;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("receiz_known_proof_projection_invalid");
    }
    projected[key] = projectKnownProofJson(descriptor.value, seen);
  }
  return Object.freeze(projected);
}

function preserveKnownVerifiedProof<TKnown>(known: TKnown | null): ReceizGeneratedImmutable<TKnown> | null {
  if (known === null) return null;
  return projectKnownProofJson(known, new WeakSet<object>()) as ReceizGeneratedImmutable<TKnown>;
}

export async function projectKnownProofFirst<TKnown extends { acceptedHead: string | null }, TAdditions>(input: Readonly<{
  readKnownVerifiedProof: () => Promise<TKnown | null>;
  paintKnown: (known: ReceizGeneratedImmutable<TKnown>) => void;
  loadVerifiedAdditions: (acceptedHead: string | null) => Promise<TAdditions>;
  appendVerifiedAdditions: (known: ReceizGeneratedImmutable<TKnown> | null, additions: TAdditions) => void | Promise<void>;
}>): Promise<Readonly<{ known: ReceizGeneratedImmutable<TKnown> | null; additions: TAdditions }>> {
  const known = await input.readKnownVerifiedProof();
  const preservedKnown = preserveKnownVerifiedProof(known);
  if (preservedKnown) input.paintKnown(preservedKnown);
  const additions = await input.loadVerifiedAdditions(preservedKnown?.acceptedHead ?? null);
  await input.appendVerifiedAdditions(preservedKnown, additions);
  return Object.freeze({ known: preservedKnown, additions });
}
`);
}

function proofMemory(): ReceizGeneratedFile {
  return generated("receiz/proof-memory.ts", `${header("receiz/proof-memory.ts")}
import {
  assertReceizProofRegisterSnapshot,
  createReceizProofMemory,
  type ReceizProofMemoryStorage,
  type ReceizProofMemoryStorageValue,
  type ReceizProofRegisterSnapshot,
} from "@receiz/sdk";

export type ReceizGeneratedDurableProofMemoryStorage = Readonly<{
  durability: "durable";
  ownerId: string;
  namespace: string;
  read(): ReceizProofMemoryStorageValue | Promise<ReceizProofMemoryStorageValue>;
  write(snapshot: ReceizProofRegisterSnapshot): void | Promise<void>;
  remove?(): void | Promise<void>;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function requiredOwnerId(ownerId: string): string {
  if (typeof ownerId !== "string" || ownerId.trim().length === 0) {
    return fail("receiz_generated_proof_memory_owner_required");
  }
  return ownerId;
}

export function generatedReceizProofMemoryNamespace(ownerId: string): string {
  return "receiz:proof-memory:v125:" + encodeURIComponent(requiredOwnerId(ownerId));
}

function storedSnapshot(value: ReceizProofMemoryStorageValue): ReceizProofRegisterSnapshot | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return assertReceizProofRegisterSnapshot(JSON.parse(trimmed) as unknown);
  }
  return assertReceizProofRegisterSnapshot(value);
}

function canonicalSnapshot(value: ReceizProofRegisterSnapshot): string {
  return JSON.stringify(assertReceizProofRegisterSnapshot(value));
}

export async function createGeneratedReceizProofMemory(input: Readonly<{
  ownerId: string;
  storage: ReceizGeneratedDurableProofMemoryStorage;
}>) {
  const ownerId = requiredOwnerId(input.ownerId);
  const storage = input.storage;
  if (storage.durability !== "durable") fail("receiz_generated_proof_memory_storage_not_durable");
  if (storage.ownerId !== ownerId) fail("receiz_generated_proof_memory_storage_owner_mismatch");
  if (storage.namespace !== generatedReceizProofMemoryNamespace(ownerId)) {
    fail("receiz_generated_proof_memory_storage_namespace_mismatch");
  }

  const initialSnapshot = storedSnapshot(await storage.read());
  if (initialSnapshot && initialSnapshot.ownerId !== ownerId) {
    fail("receiz_generated_proof_memory_stored_owner_mismatch");
  }

  let initialReadPending = true;
  let lastAttemptedSnapshot: string | null = null;
  let persistenceFailure: unknown = null;
  const verifyPersisted = async (expected: string): Promise<void> => {
    const persisted = storedSnapshot(await storage.read());
    if (!persisted
      || persisted.ownerId !== ownerId
      || canonicalSnapshot(persisted) !== expected) {
      fail("receiz_generated_proof_memory_persistence_mismatch");
    }
  };
  const verifiedStorage: ReceizProofMemoryStorage = {
    read: () => {
      if (initialReadPending) {
        initialReadPending = false;
        return initialSnapshot;
      }
      return storage.read();
    },
    write: async (snapshot) => {
      const expected = assertReceizProofRegisterSnapshot(snapshot);
      if (expected.ownerId !== ownerId) fail("receiz_generated_proof_memory_write_owner_mismatch");
      const expectedSnapshot = canonicalSnapshot(expected);
      lastAttemptedSnapshot = expectedSnapshot;
      try {
        await storage.write(expected);
        await verifyPersisted(expectedSnapshot);
        persistenceFailure = null;
      } catch (error) {
        persistenceFailure = error;
        throw error;
      }
    },
    ...(storage.remove ? { remove: () => storage.remove!() } : {}),
  };
  const memory = await createReceizProofMemory({
    ownerId,
    storage: verifiedStorage,
    onPersistError: (error) => { persistenceFailure = error; },
  });
  const sdkFlush = memory.flush.bind(memory);
  memory.flush = async () => {
    await sdkFlush();
    if (persistenceFailure !== null) throw persistenceFailure;
    if (lastAttemptedSnapshot !== null) await verifyPersisted(lastAttemptedSnapshot);
  };
  return memory;
}
`);
}

function conformanceTest(): ReceizGeneratedFile {
  return generated("receiz/conformance.test.ts", `${header("receiz/conformance.test.ts")}
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_CURRENT_REGISTRY_DIGEST,
  RECEIZ_RELEASE_VERSION,
  RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE,
  defineReceizApp,
  type ReceizAppContract,
} from "@receiz/sdk/compiler";
import { runReceizConformance, type ReceizConformanceCheckId } from "@receiz/sdk/testing";

type GeneratedManifest = Readonly<{
  schema: string;
  version: string;
  compatibleSdkRange: string;
  framework: string;
  adapterIdentity: string;
  adapterCreated: boolean;
  requestedFeatures: readonly string[];
  requestedCapabilities: readonly string[];
  continuityVerification: boolean;
  proofMemoryPersistence: string;
  webhookVerification: boolean;
  idempotency: boolean;
  executionRecovery: boolean;
  browserSecretsAllowed: boolean;
  registryDigest: string;
  operationMatrixDigest: string;
  operationAuthorityMatrix: readonly unknown[];
  conformanceCommands: readonly string[];
  generatedFiles: readonly Readonly<{ path: string; digest: string }>[];
  authority: Readonly<{ strongerTruth: string; generatedStateIsAuthority: boolean }>;
}>;

const contract = defineReceizApp(JSON.parse(
  readFileSync(new URL("../receiz.app.json", import.meta.url), "utf8"),
) as ReceizAppContract);
const manifest = JSON.parse(
  readFileSync(new URL("../receiz.generated.json", import.meta.url), "utf8"),
) as GeneratedManifest;

test("generated framework-neutral integration is bound to exact current Receiz ${RECEIZ_RELEASE_VERSION} truth", async () => {
  assert.equal(RECEIZ_RELEASE_VERSION, "${RECEIZ_RELEASE_VERSION}");
  assert.equal(RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE, "${RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE}");
  assert.equal(contract.framework, "framework-neutral");
  assert.deepEqual(contract.operations, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX);
  assert.equal(contract.operations?.length, 60);

  const requestedFeatures = [...contract.features].sort();
  assert.equal(manifest.schema, "receiz.generated-files.v126");
  assert.equal(manifest.version, RECEIZ_RELEASE_VERSION);
  assert.equal(manifest.compatibleSdkRange, RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE);
  assert.equal(manifest.framework, contract.framework);
  assert.equal(manifest.adapterIdentity, "receiz.framework-neutral.v126");
  assert.equal(manifest.adapterCreated, true);
  assert.deepEqual(manifest.requestedFeatures, requestedFeatures);
  assert.deepEqual(manifest.requestedCapabilities, requestedFeatures.map((feature) => "feature:" + feature));
  assert.equal(manifest.registryDigest, RECEIZ_CURRENT_REGISTRY_DIGEST);
  assert.equal(manifest.operationMatrixDigest, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST);
  assert.deepEqual(manifest.operationAuthorityMatrix, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX);
  assert.equal(manifest.operationAuthorityMatrix.length, 60);
  assert.deepEqual(manifest.conformanceCommands, [
    "receiz app apply --root . --json",
    "receiz app check --root . --json",
    "receiz app conformance --root . --json",
    "receiz app inspect --root . --json",
    "receiz app plan --root . --json",
    "receiz app qualify --root . --json",
  ]);
  assert.deepEqual(manifest.generatedFiles.map((file) => file.path), [
    "receiz/client.ts",
    "receiz/conformance.test.ts",
    "receiz/continuity.ts",
    "receiz/execution-recovery.ts",
    "receiz/proof-memory.ts",
    "receiz/receiz.adapter.ts",
    "receiz/receiz.emulator.fixture.json",
    "receiz/receiz.extensions.ts",
    "receiz/server.ts",
    "receiz/webhooks.ts",
  ]);
  assert.equal(manifest.browserSecretsAllowed, false);
  assert.deepEqual(manifest.authority, {
    strongerTruth: "sealed-receiz-proof-object",
    generatedStateIsAuthority: false,
  });
  assert.equal(manifest.continuityVerification, true);
  assert.equal(manifest.idempotency, true);
  assert.equal(manifest.executionRecovery, true);
  if (contract.features.includes("proofMemory")) assert.equal(manifest.proofMemoryPersistence, "durable");
  assert.equal(manifest.webhookVerification, contract.features.includes("webhooks"));

  const report = await runReceizConformance();
  assert.equal(report.ok, true);
  assert.equal(report.sdkVersion, manifest.version);
  const statuses = new Map(report.checks.map((check) => [check.id, check.status]));
  const requiredChecks: ReceizConformanceCheckId[] = [
    "artifact_continuity",
    "generated_project_compile",
    ...(contract.features.includes("proofMemory") ? (["proof_memory_recovery"] as const) : []),
    ...(contract.features.includes("webhooks") ? (["webhook_security"] as const) : []),
  ];
  for (const checkId of requiredChecks) assert.equal(statuses.get(checkId), "pass", checkId);
});
`);
}

function webhooks(requested: boolean): ReceizGeneratedFile {
  if (!requested) {
    return generated("receiz/webhooks.ts", `${header("receiz/webhooks.ts")}
export const generatedReceizWebhookVerification = {
  status: "unavailable",
  code: "receiz_webhooks_not_requested",
  missingBoundary: "requested-feature:webhooks",
} as const;
`);
  }
  return generated("receiz/webhooks.ts", `${header("receiz/webhooks.ts")}
import { parseReceizWebhookRequest, type ReceizWebhookVerifyRequestOptions } from "@receiz/sdk";
import { assertReceizTrustedHost } from "./server";

export async function parseGeneratedReceizWebhook(request: Request, options: ReceizWebhookVerifyRequestOptions) {
  assertReceizTrustedHost();
  return parseReceizWebhookRequest(request, options);
}
`);
}

function normalizedUtf8Sha256(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n?/g, "\n"), "utf8").digest("hex");
}

function manifest(contract: ReceizAppContract, files: readonly ReceizGeneratedFile[]): ReceizGeneratedFile {
  const requestedFeatures = [...contract.features].sort();
  const generatedFiles = files
    .filter((file) => file.path !== "receiz.generated.json")
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((file) => ({ path: file.path, digest: normalizedUtf8Sha256(file.content) }));
  return generated("receiz.generated.json", `${JSON.stringify({
    schema: "receiz.generated-files.v126",
    version: RECEIZ_RELEASE_VERSION,
    compatibleSdkRange: RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE,
    framework: "framework-neutral",
    adapterIdentity: "receiz.framework-neutral.v126",
    adapterCreated: true,
    requestedFeatures,
    requestedCapabilities: requestedFeatures.map((feature) => `feature:${feature}`),
    continuityVerification: true,
    proofMemoryPersistence: "durable",
    webhookVerification: contract.features.includes("webhooks"),
    idempotency: true,
    executionRecovery: true,
    browserSecretsAllowed: false,
    registryDigest: RECEIZ_CURRENT_REGISTRY_DIGEST,
    operationMatrixDigest: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST,
    operationAuthorityMatrix: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
    conformanceCommands: [
      "receiz app apply --root . --json",
      "receiz app check --root . --json",
      "receiz app conformance --root . --json",
      "receiz app inspect --root . --json",
      "receiz app plan --root . --json",
      "receiz app qualify --root . --json",
    ],
    generatedFiles,
    authority: {
      strongerTruth: "sealed-receiz-proof-object",
      generatedStateIsAuthority: false,
    },
  }, null, 2)}\n`);
}

function executionRecovery(): ReceizGeneratedFile {
  return generated("receiz/execution-recovery.ts", `${header("receiz/execution-recovery.ts")}
import { type ReceizExecutionResolutionV124 } from "@receiz/sdk";
import { createReceizServerClient } from "./server";

export function resolveGeneratedExecutionRecovery(input: Readonly<{
  server: { baseUrl: string; accessToken: string };
  resolution: ReceizExecutionResolutionV124;
}>) {
  return createReceizServerClient(input.server).execution.resolve(input.resolution);
}
`);
}

function adapter(): ReceizGeneratedFile {
  return generated("receiz/receiz.adapter.ts", `${header("receiz/receiz.adapter.ts")}
export type ReceizGeneratedCapabilityResult<T> =
  | Readonly<{ status: "available"; value: T }>
  | Readonly<{ status: "unavailable"; code: string; missingBoundary: string }>;

export type ReceizGeneratedCapabilityInput<T> =
  | Readonly<{ environment: "production"; code: string; missingBoundary: string }>
  | Readonly<{ environment: "emulator"; value: T }>;

export function resolveGeneratedCapability<T>(input: ReceizGeneratedCapabilityInput<T>): ReceizGeneratedCapabilityResult<T> {
  if (input.environment === "emulator") return { status: "available", value: input.value };
  return { status: "unavailable", code: input.code, missingBoundary: input.missingBoundary };
}
`);
}

export function generateFrameworkNeutralFiles(contract: ReceizAppContract): readonly ReceizGeneratedFile[] {
  const validation = validateReceizAppContract(contract);
  if (!validation.ok) throw new Error(validation.issues.map((issue) => `${issue.code}:${issue.path}`).join(","));
  if (validation.value.operations !== RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V125_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  const files = [
    client(),
    conformanceTest(),
    continuity(),
    executionRecovery(),
    proofMemory(),
    adapter(),
    server(),
    webhooks(validation.value.features.includes("webhooks")),
    generated("receiz/receiz.emulator.fixture.json", '{\n  "environment": "emulator",\n  "capabilities": {}\n}\n'),
    extension(),
  ];
  return [...files, manifest(validation.value, files)];
}
