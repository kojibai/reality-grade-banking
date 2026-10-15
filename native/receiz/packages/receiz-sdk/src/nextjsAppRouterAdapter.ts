import {
  RECEIZ_V112_APP_CLIENT_SURFACES,
  RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
  RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE,
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
  validateReceizAppContract,
  type ReceizAppContract,
} from "./appContract.js";
import type { ReceizGeneratedFile } from "./frameworkAdapters.js";
import { describeReceizCapabilities } from "./capabilities.js";

const header = (editable = false) => `// @receiz-generated receiz.app.contract.v1\n// ${editable ? "Developer-editable below documented extension points." : "Regenerate with receiz app apply; do not edit directly."}\n`;

function file(
  path: string,
  content: string,
  developerEditable = false,
  ownership: ReceizGeneratedFile["ownership"] = "receiz-generated",
): ReceizGeneratedFile {
  return { path, content: `${content.trimEnd()}\n`, ownership, developerEditable, authorityBoundary: "sealed-receiz-proof-object" };
}

export function generateNextjsAppRouterFiles(contract: ReceizAppContract): readonly ReceizGeneratedFile[] {
  const validation = validateReceizAppContract(contract);
  if (!validation.ok) throw new Error(validation.issues.map((issue) => `${issue.code}:${issue.path}`).join(","));
  if (validation.value.operations !== RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX) throw new Error("V125_APPLICATION_OPERATION_MATRIX_REQUIRED");
  const capabilities = describeReceizCapabilities();
  const files: ReceizGeneratedFile[] = [
    file("receiz/receiz.extensions.types.ts", `${header()}
export type ReceizExtensionOperation = Readonly<{ rail: string; operation: string }>;
export type ReceizExtensionProjection = Readonly<{ rail: string; value: unknown }>;
export interface ReceizProjectExtensions {
  beforeOperation?(operation: ReceizExtensionOperation): void | Promise<void>;
  afterProjection?(projection: ReceizExtensionProjection): void | Promise<void>;
}`),
    file("receiz/receiz.extensions.ts", `// @receiz-extension create-once; this file is developer-owned and regeneration must never overwrite it.
import type { ReceizProjectExtensions } from "./receiz.extensions.types";
export const receizExtensions: ReceizProjectExtensions = {};`, true, "receiz-extension"),
    file("receiz/receiz.boundaries.ts", `${header()}
export const RECEIZ_BROWSER_ENTRYPOINT = "@receiz/sdk" as const;
export const RECEIZ_SERVER_COMPILER_ENTRYPOINT = "@receiz/sdk/compiler" as const;
export const RECEIZ_TESTING_ENTRYPOINT = "@receiz/sdk/testing" as const;
export const RECEIZ_AUTHORITY_BOUNDARY = "sealed-receiz-proof-object" as const;
export const RECEIZ_OPERATION_AUTHORITY_MATRIX = ${JSON.stringify(RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX)} as const;
export const RECEIZ_CLIENT_SURFACES = ${JSON.stringify(RECEIZ_V112_APP_CLIENT_SURFACES)} as const;
export const RECEIZ_UNAVAILABLE_CLIENT_SURFACES = ${JSON.stringify(RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES)} as const;`),
    file("receiz/receiz.capabilities.json", JSON.stringify(capabilities)),
    file("receiz/receiz.emulator.fixture.json", JSON.stringify({
      schema: "receiz.sdk.emulator_fixture.v1",
      seed: "receiz-app-local",
      identityNamespace: "sandbox.receiz.test",
      deterministicClockMs: 1_786_640_000_000,
      authority: "sandbox-beneath-sealed-receiz-proof-object",
    })),
    file("receiz/receiz.environment.ts", `${header()}
const requiredServerNames = ["RECEIZ_BASE_URL", "RECEIZ_CLIENT_ID", "RECEIZ_CLIENT_SECRET", "RECEIZ_REDIRECT_URI"] as const;
export function receizEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const missing = requiredServerNames.filter((name) => !env[name]);
  if (missing.length) throw new Error(\`Missing Receiz environment: \${missing.join(", ")}\`);
  return Object.fromEntries(requiredServerNames.map((name) => [name, env[name]!])) as Record<(typeof requiredServerNames)[number], string>;
}`),
    file("receiz/receiz.server.ts", `${header()}
import "server-only";
import { createReceizClient } from "@receiz/sdk";
import { receizEnvironment } from "./receiz.environment";
export function createReceizServerClient(accessToken?: string) {
  const env = receizEnvironment();
  return createReceizClient({ baseUrl: env.RECEIZ_BASE_URL, ...(accessToken ? { accessToken } : {}) });
}`),
    file("receiz/receiz.browser.ts", `${header()}
import { createReceizClient } from "@receiz/sdk";
export function createReceizBrowserClient() {
  return createReceizClient({ baseUrl: process.env.NEXT_PUBLIC_RECEIZ_BASE_URL ?? "https://receiz.com" });
}`),
    file("receiz/receiz.adapter.ts", `${header(true)}
import { createReceizServerClient } from "./receiz.server";
import { receizExtensions } from "./receiz.extensions";
export const receizProjectAdapter = {
  publicClient: () => createReceizServerClient(),
  delegatedClient: (token: string) => createReceizServerClient(token),
  authority: "sealed-receiz-proof-object" as const,
  extensions: receizExtensions,
};`, true),
    file("app/api/receiz/connect/callback/route.ts", `${header(true)}
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
  return NextResponse.json({ ok: true, codeReceived: true, authority: "delegated-receiz-connect" });
}`, true),
    file("app/api/receiz/verify/route.ts", `${header()}
import { NextResponse } from "next/server";
import { receizProjectAdapter } from "../../../../receiz/receiz.adapter";
export async function POST(request: Request) {
  const artifact = await request.blob();
  const result = await receizProjectAdapter.publicClient().verification.verifyArtifact(artifact);
  const status = result.status === "verified-artifact" ? 200 : result.status === "unsupported" ? 415 : 422;
  return NextResponse.json(result, { status });
}`),
    file("receiz/receiz.proof-memory.ts", `${header(true)}
import { createReceizProofMemory, type ReceizProofMemoryStorage } from "@receiz/sdk";
export function openReceizProofMemory(ownerId: string, storage: ReceizProofMemoryStorage) {
  return createReceizProofMemory({ ownerId, storage });
}
export const receizProofMemoryLaw = "first-admission-then-append-forever" as const;`, true),
    file("receiz/receiz.public-store.ts", `${header(true)}
import type { JsonObject, ReceizPublicStorePublishInput, ReceizPublicStoreResolveInput } from "@receiz/sdk";
import { receizProjectAdapter } from "./receiz.adapter";
export const restoreReceizPublicStore = (input: ReceizPublicStoreResolveInput) => receizProjectAdapter.publicClient().publicStore.resolve(input);
export const publishReceizPublicStore = (token: string, input: ReceizPublicStorePublishInput<JsonObject>, idempotencyKey: string) =>
  receizProjectAdapter.delegatedClient(token).publicStore.publish(input, { idempotencyKey });`, true),
    file("receiz/receiz.conformance.test.ts", `${header()}
import assert from "node:assert/strict";
import test from "node:test";
import contract from "../receiz.app.json" with { type: "json" };
test("Receiz authority remains artifact-first", () => {
  assert.equal(contract.authority.mode, "artifact-first");
  assert.equal(contract.authority.allowDatabaseAuthority, false);
  assert.equal(contract.operations.length, ${RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX.length});
  assert.equal(contract.operations[0].compatibleSdkRange, "${RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE}");
});`),
  ];

  if (contract.features.includes("webhooks")) {
    files.push(file("app/api/receiz/webhooks/route.ts", `${header()}
import { NextResponse } from "next/server";
import { parseReceizWebhookRequest } from "@receiz/sdk";
export async function POST(request: Request) {
  const secret = process.env.RECEIZ_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const parsed = await parseReceizWebhookRequest(request, { secret });
  return NextResponse.json({ ok: true, eventId: parsed.event.id });
}`));
  }

  files.push(file("receiz.generated.json", JSON.stringify({
    schema: "receiz.generated-files.v1",
    contract: "receiz.app.json",
    appName: contract.name,
    framework: contract.framework,
    authority: "sealed-receiz-proof-object",
    adapterCreated: true,
    recordBeforeSeal: true,
    continuityVerification: true,
    proofMemoryPersistence: contract.features.includes("proofMemory") ? "durable" : "not-required",
    webhookVerification: contract.features.includes("webhooks"),
    idempotency: true,
    serverSecretsBrowserSafe: true,
    protectedExtensions: true,
    capabilityDescriptor: "receiz.sdk.capability_descriptor.v1",
    compatibleSdkRange: RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE,
    operationAuthorityMatrix: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
    clientSurfaces: RECEIZ_V112_APP_CLIENT_SURFACES,
    unavailableClientSurfaces: RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
    committedAppendRouteGenerated: false,
  })));

  return files.sort((left, right) => left.path.localeCompare(right.path));
}
