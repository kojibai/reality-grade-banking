#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
import {
  RECEIZ_SDK_VERSION,
  assertReceizAssetManifest,
  assertReceizProofRegisterSnapshot,
  assertReceizSportsCardManifest,
  assertReceizWebhookEvent,
  createReceizClient,
  createReceizInMemoryProofMemoryStorage,
  createReceizProofMemory,
  projectReceizAssetManifest,
  projectReceizSportsCardManifest,
  receizProofMemoryAdditionsQuery,
  type JsonObject,
} from "./index.js";
import {
  RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
  applyReceizIntegrationPreview,
  checkReceizIntegration,
  createReceizIntegrationPreview,
  defineReceizApp,
  explainReceizIntegrationFinding,
  inspectReceizProject,
  planReceizIntegration,
  planReceizUpgrade,
  qualifyReceizApp,
  runReceizAppConformance,
  type ReceizAppContract,
} from "./compiler.js";
import {
  RECEIZ_CONFORMANCE_CHECK_IDS,
  runReceizConformance,
  type ReceizConformanceCheckId,
} from "./testing.js";
import {
  applyV105MigrationPlan,
  buildV105MigrationPlan,
  verifyV105Migration,
  type ReceizMigrationFile,
  type ReceizV105MigrationState,
} from "./v105Migration.js";

type CliInspectResult = {
  ok: true;
  schema: "receiz.sdk.cli.inspect.v1";
  kind: string;
  sourcePath: string;
  projection: JsonObject;
  knownHead: ReturnType<typeof receizProofMemoryAdditionsQuery>;
  admitted: boolean;
};

type CliFailure = {
  ok: false;
  schema: "receiz.sdk.cli.error.v1";
  error: string;
  detail?: string;
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = moduleDir.endsWith(`${join("packages", "receiz-sdk", "dist")}`)
  ? dirname(moduleDir)
  : dirname(moduleDir);

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printError(error: string, detail?: string): void {
  const payload: CliFailure = detail
    ? { ok: false, schema: "receiz.sdk.cli.error.v1", error, detail }
    : { ok: false, schema: "receiz.sdk.cli.error.v1", error };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), "utf8")) as unknown;
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function optionNumber(args: string[], name: string, fallback: number): number {
  const value = optionValue(args, name);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionScopes(args: string[]): string[] {
  const raw = optionValue(args, "--scopes") ?? optionValue(args, "--scope") ?? "";
  return raw
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

async function inspectProofObject(path: string): Promise<CliInspectResult> {
  const value = readJsonFile(path);
  const storage = createReceizInMemoryProofMemoryStorage();
  const memory = await createReceizProofMemory({ storage });

  try {
    const manifest = assertReceizAssetManifest(value);
    return {
      ok: true,
      schema: "receiz.sdk.cli.inspect.v1",
      kind: "asset_manifest",
      sourcePath: resolve(path),
      projection: projectReceizAssetManifest(manifest) as unknown as JsonObject,
      knownHead: memory.knownHead(100),
      admitted: false,
    };
  } catch {
    // Try the next implemented Receiz proof payload shape.
  }

  try {
    const manifest = assertReceizSportsCardManifest(value);
    return {
      ok: true,
      schema: "receiz.sdk.cli.inspect.v1",
      kind: "sports_card_manifest",
      sourcePath: resolve(path),
      projection: projectReceizSportsCardManifest(manifest) as unknown as JsonObject,
      knownHead: memory.knownHead(100),
      admitted: false,
    };
  } catch {
    // Try the next implemented Receiz proof payload shape.
  }

  try {
    const event = assertReceizWebhookEvent(value);
    memory.admitWebhookEvent(event);
    await memory.flush();
    const entry = memory.entries()[0];
    return {
      ok: true,
      schema: "receiz.sdk.cli.inspect.v1",
      kind: "webhook_event",
      sourcePath: resolve(path),
      projection: (entry?.projection ?? {}) as JsonObject,
      knownHead: memory.knownHead(100),
      admitted: true,
    };
  } catch {
    // Try the register snapshot shape before failing.
  }

  const snapshot = assertReceizProofRegisterSnapshot(value);
  return {
    ok: true,
    schema: "receiz.sdk.cli.inspect.v1",
    kind: "proof_register_snapshot",
    sourcePath: resolve(path),
    projection: {
      schema: snapshot.schema,
      ownerId: snapshot.ownerId ?? null,
      count: snapshot.head.count,
      head: snapshot.head,
    },
    knownHead: receizProofMemoryAdditionsQuery(snapshot, 100),
    admitted: false,
  };
}

async function runConformance(args: string[] = []): Promise<void> {
  const fixtures = [
    join(packageRoot, "fixtures", "receiz-asset-manifest.example.json"),
    join(packageRoot, "fixtures", "receiz-sports-card-manifest.example.json"),
    join(packageRoot, "fixtures", "receiz-webhook-event.example.json"),
  ];
  const failures: Array<{ fixture: string; error: string }> = [];
  const storage = createReceizInMemoryProofMemoryStorage();
  for (const fixture of fixtures) {
    try {
      await inspectProofObject(fixture);
    } catch (error) {
      failures.push({
        fixture,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const reopened = await createReceizProofMemory({ ownerId: "receiz-sdk-conformance", storage });

  const injected = optionValue(args, "--inject-failure");
  const failChecks = injected && RECEIZ_CONFORMANCE_CHECK_IDS.includes(injected as ReceizConformanceCheckId)
    ? [injected as ReceizConformanceCheckId]
    : [];
  const report = await runReceizConformance({
    failChecks,
    ...(failures.length > 0 ? {
      checkOverrides: {
        artifact_continuity: {
          status: "fail" as const,
          evidence: { fixtureFailures: failures.length },
        },
      },
    } : {}),
  });
  const output = {
    ...report,
    summary: {
      ...report.summary,
      fixtures: fixtures.length,
      proofMemoryEntries: reopened.snapshot().head.count,
    },
    knownHead: reopened.knownHead(100),
    failures,
  };
  if (args.includes("--human")) {
    process.stdout.write(`${report.ok ? "PASS" : "FAIL"} Receiz conformance ${report.sdkVersion}\n`);
    for (const check of report.checks) process.stdout.write(`${check.status.toUpperCase()} ${check.id}\n`);
    process.stdout.write(`Evidence ${report.evidenceDigest}\n`);
  } else {
    printJson(output);
  }

  if (!report.ok) process.exitCode = 1;
}

function writeStarter(targetDir: string): void {
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(
    join(targetDir, "receiz-proof-memory.ts"),
    `import {
  assertReceizAssetManifest,
  assertReceizSportsCardManifest,
  assertReceizWebhookEvent,
  createReceizLocalStorageProofMemoryStorage,
  createReceizProofMemory,
  projectReceizAssetManifest,
  projectReceizSportsCardManifest,
  type ReceizProofMemory,
} from "@receiz/sdk";

export async function openReceizProofMemory(ownerId: string): Promise<ReceizProofMemory> {
  return createReceizProofMemory({
    ownerId,
    storage: createReceizLocalStorageProofMemoryStorage(\`receiz:proof-memory:\${ownerId}:v1\`),
  });
}

export function inspectCarriedProjection(value: unknown) {
  if (typeof value !== "object" || value === null) throw new Error("receiz_proof_object_required");
  const schema = "schema" in value ? value.schema : null;

  if (schema === "receiz.asset_manifest.v1") {
    const manifest = assertReceizAssetManifest(value);
    return projectReceizAssetManifest(manifest);
  }

  if (schema === "receiz.sports_arena.card_manifest.v1") {
    const manifest = assertReceizSportsCardManifest(value);
    return projectReceizSportsCardManifest(manifest);
  }

  throw new Error(\`receiz_inspection_schema_required:\${String(schema ?? "unknown")}\`);
}

export async function admitVerifiedWebhookEvent(memory: ReceizProofMemory, value: unknown) {
  const event = assertReceizWebhookEvent(value);
  memory.admitWebhookEvent(event);
  await memory.flush();
  return memory.snapshot().entries.find((entry) => entry.id === \`webhook:\${event.id}\`)?.projection ?? null;
}

export function verifiedAdditionsAfterKnownHead(memory: ReceizProofMemory) {
  return memory.knownHead(100);
}
`,
    "utf8",
  );
}

function printHelp(): void {
  process.stdout.write(`Receiz SDK CLI

Usage:
  receiz inspect <path-to-proof-json>
  receiz conformance
  receiz init <target-dir>
  receiz doctor --tenant-host <host> [--access-token <token>] [--callback-url <url>] [--scopes <csv>]
  receiz dev
  receiz deploy-check --tenant-host <host>
  receiz seed-store --tenant-host <host> [--products <count>]
  receiz simulate-checkout --amount-usd <amount>
  receiz app init|inspect|plan|apply|check|conformance|qualify|upgrade|explain [--root <path>] [--json]
  receiz migrate v105-v106 --dry-run [--root <path>]
  receiz migrate v105-v106 --apply --confirm <plan-digest> [--root <path>]
  receiz migrate v105-v106 --verify [--root <path>]

This CLI uses local Receiz SDK validators, projections, and durable proof memory.
It does not make network or database calls for inspect, conformance, doctor, deploy-check, seed-store, or simulate-checkout.
`);
}

function readMigrationProjectFiles(root: string): ReceizMigrationFile[] {
  const ignored = new Set([".git", ".next", ".receiz", "dist", "node_modules", "output"]);
  const codeExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const files: ReceizMigrationFile[] = [];

  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      const projectPath = relative(root, absolutePath).replaceAll("\\", "/");
      if (projectPath !== "package.json" && !codeExtensions.has(extname(entry.name))) continue;
      files.push({ path: projectPath, content: readFileSync(absolutePath, "utf8") });
    }
  }

  visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function migrationArtifact(args: string[], option: string, filename: string): unknown {
  const explicit = optionValue(args, option);
  const candidates = [
    explicit ? resolve(explicit) : null,
    resolve(process.cwd(), "docs", "releases", filename),
    resolve(packageRoot, "docs", filename),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`receiz_migration_artifact_required:${filename}`);
  return readJsonFile(path);
}

function migrationStatePath(root: string, migration: "v105-v106"): string {
  return join(root, ".receiz", "migrations", `${migration}.state.json`);
}

async function runMigrationCommand(args: string[]): Promise<void> {
  const [migration, ...options] = args;
  if (migration !== "v105-v106") throw new Error(`receiz_migration_unknown:${String(migration ?? "missing")}`);
  const root = resolve(optionValue(options, "--root") ?? process.cwd());
  const inventory = migrationArtifact(options, "--inventory", "v106.0.0-v105-sdk-write-inventory.json") as Parameters<typeof buildV105MigrationPlan>[0]["inventory"];
  const contract = migrationArtifact(options, "--contract", "v106.0.0-migration-contract.json") as Parameters<typeof buildV105MigrationPlan>[0]["contract"];
  const files = readMigrationProjectFiles(root);

  if (options.includes("--verify")) {
    const statePath = migrationStatePath(root, migration);
    if (!existsSync(statePath)) throw new Error("receiz_migration_state_required");
    const state = readJsonFile(statePath) as ReceizV105MigrationState;
    const verification = verifyV105Migration({ files, state, inventory, contract });
    printJson(verification);
    if (!verification.ok) process.exitCode = 2;
    return;
  }

  const plan = buildV105MigrationPlan({ files, inventory, contract });
  if (!options.includes("--apply")) {
    printJson({ ...plan, files: plan.files.map((file) => ({ path: file.path, digest: createHash("sha256").update(file.content).digest("hex") })), confirmationRequired: true, writesPerformed: 0 });
    return;
  }

  const confirmation = optionValue(options, "--confirm");
  if (!confirmation) {
    printJson({ ...plan, files: plan.files.map((file) => ({ path: file.path })), confirmationRequired: true, writesPerformed: 0 });
    return;
  }
  const applied = applyV105MigrationPlan({ plan, confirmation });
  for (const changedPath of applied.state.completedPaths) {
    const file = applied.files.find((candidate) => candidate.path === changedPath);
    if (!file) throw new Error(`receiz_migration_changed_file_missing:${changedPath}`);
    writeFileSync(resolve(root, changedPath), file.content, "utf8");
  }
  const statePath = migrationStatePath(root, migration);
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(applied.state, null, 2)}\n`, "utf8");
  printJson({ ok: true, schema: "receiz.sdk.v105-v106.migration-apply.v1", planDigest: plan.planDigest, completedPaths: applied.state.completedPaths, statePath, writesPerformed: applied.state.completedPaths.length + 1 });
}

function appContract(root: string, args: string[]): ReceizAppContract {
  const path = optionValue(args, "--contract") ?? join(root, "receiz.app.json");
  return defineReceizApp(readJsonFile(path) as ReceizAppContract);
}

async function runAppCommand(args: string[]): Promise<void> {
  const [subcommand, ...options] = args;
  const root = resolve(optionValue(options, "--root") ?? process.cwd());
  const targetSdkVersion = optionValue(options, "--target") ?? RECEIZ_CURRENT_RELEASE_VERSION;

  if (subcommand === "init") {
    const name = optionValue(options, "--name") ?? "My Receiz App";
    const framework = optionValue(options, "--framework") === "framework-neutral" ? "framework-neutral" : "nextjs-app-router";
    const contract = defineReceizApp({
      schema: "receiz.app.contract.v1",
      name,
      framework,
      features: ["identity", "proof", "proofMemory"],
      authority: { mode: "artifact-first", allowDatabaseAuthority: false },
      deployment: { target: framework === "nextjs-app-router" ? "vercel" : "node" },
      operations: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX,
    });
    printJson({ ok: true, schema: "receiz.app.init.v1", contract, writesPerformed: 0, next: "Review the contract, save it as receiz.app.json, then run receiz app plan." });
    return;
  }

  if (subcommand === "inspect") {
    printJson(await inspectReceizProject({ root, targetSdkVersion }));
    return;
  }
  if (subcommand === "plan") {
    printJson(await planReceizIntegration({ root, targetSdkVersion }));
    return;
  }
  if (subcommand === "check") {
    const result = await checkReceizIntegration({ root, targetSdkVersion });
    printJson(result);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (subcommand === "conformance") {
    const injected = optionValue(options, "--inject-failure");
    const failChecks = injected && RECEIZ_CONFORMANCE_CHECK_IDS.includes(injected as ReceizConformanceCheckId)
      ? [injected as ReceizConformanceCheckId]
      : [];
    const result = await runReceizAppConformance({ root, targetSdkVersion, failChecks });
    printJson(result);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (subcommand === "qualify") {
    const injected = optionValue(options, "--inject-failure");
    const failChecks = injected && RECEIZ_CONFORMANCE_CHECK_IDS.includes(injected as ReceizConformanceCheckId)
      ? [injected as ReceizConformanceCheckId]
      : [];
    const result = await qualifyReceizApp({ root, targetSdkVersion, failChecks });
    printJson(result);
    if (!result.qualified) process.exitCode = 2;
    return;
  }
  if (subcommand === "upgrade") {
    printJson(await planReceizUpgrade({ root, targetSdkVersion }));
    return;
  }
  if (subcommand === "explain") {
    const code = optionValue(options, "--code");
    if (!code) throw new Error("receiz_finding_code_required");
    const inspection = await inspectReceizProject({ root, targetSdkVersion });
    const finding = inspection.findings.find((item) => item.code === code);
    if (!finding) throw new Error(`receiz_finding_not_found:${code}`);
    printJson({ ok: true, schema: "receiz.app.explanation.v1", finding, explanation: explainReceizIntegrationFinding(finding) });
    return;
  }
  if (subcommand === "apply") {
    const preview = await createReceizIntegrationPreview({ root, contract: appContract(root, options), targetSdkVersion });
    const confirmation = optionValue(options, "--confirm");
    if (!confirmation) {
      printJson(preview);
      return;
    }
    printJson(await applyReceizIntegrationPreview({ preview, confirmation, dryRun: options.includes("--dry-run") }));
    return;
  }

  throw new Error(`receiz_app_unknown_command:${String(subcommand ?? "missing")}`);
}

async function main(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "inspect") {
    const path = args[0];
    if (!path) {
      printError("missing_path", "Usage: receiz inspect <path-to-proof-json>");
      process.exitCode = 1;
      return;
    }
    printJson(await inspectProofObject(path));
    return;
  }

  if (command === "app") {
    await runAppCommand(args);
    return;
  }

  if (command === "migrate") {
    await runMigrationCommand(args);
    return;
  }

  if (command === "conformance") {
    await runConformance(args);
    return;
  }

  if (command === "init") {
    const targetDir = args[0];
    if (!targetDir) {
      printError("missing_target_dir", "Usage: receiz init <target-dir>");
      process.exitCode = 1;
      return;
    }
    writeStarter(resolve(targetDir));
    printJson({
      ok: true,
      schema: "receiz.sdk.cli.init.v1",
      targetDir: resolve(targetDir),
      files: ["receiz-proof-memory.ts"],
    });
    return;
  }

  if (command === "doctor") {
    const clientOptions: { accessToken?: string; baseUrl?: string } = {};
    const accessToken = optionValue(args, "--access-token");
    const baseUrl = optionValue(args, "--base-url");
    if (accessToken) clientOptions.accessToken = accessToken;
    if (baseUrl) clientOptions.baseUrl = baseUrl;
    const client = createReceizClient(clientOptions);
    const doctorOptions: { tenantHost?: string; callbackUrl?: string; scopes?: string[] } = {};
    const tenantHost = optionValue(args, "--tenant-host");
    const callbackUrl = optionValue(args, "--callback-url");
    const scopes = optionScopes(args);
    if (tenantHost) doctorOptions.tenantHost = tenantHost;
    if (callbackUrl) doctorOptions.callbackUrl = callbackUrl;
    if (scopes.length > 0) doctorOptions.scopes = scopes;
    const report = await client.doctor(doctorOptions);
    printJson({
      ...report,
      schema: "receiz.sdk.cli.doctor.v1",
      sdkVersion: RECEIZ_SDK_VERSION,
    });
    if (!report.ok) process.exitCode = 1;
    return;
  }

  if (command === "dev") {
    printJson({
      ok: true,
      schema: "receiz.sdk.cli.dev.v1",
      sdkVersion: RECEIZ_SDK_VERSION,
      networkCalls: 0,
      dbCalls: 0,
      message: "Use the SDK sandbox helpers for deterministic local Receiz IDs, app state, wallet balances, checkout outcomes, webhooks, and proof objects.",
      commands: ["receiz seed-store", "receiz simulate-checkout", "receiz doctor", "receiz inspect"],
    });
    return;
  }

  if (command === "deploy-check") {
    const tenantHost = optionValue(args, "--tenant-host");
    const checks = [
      { code: "tenant_host_present", ok: Boolean(tenantHost), message: "tenantHost scopes app-state, domains, commerce, permissions, search, and jobs." },
      { code: "sdk_version_pinned", ok: true, message: `@receiz/sdk ${RECEIZ_SDK_VERSION}` },
      { code: "network_authority_required", ok: false, level: "info", message: "Deploy check is local. Production route availability is verified by receiz.doctor() and app capability probes." },
    ];
    printJson({
      ok: checks.every((check) => check.ok || check.level === "info"),
      schema: "receiz.sdk.cli.deploy_check.v1",
      tenantHost: tenantHost ?? null,
      checks,
    });
    return;
  }

  if (command === "seed-store") {
    const tenantHost = optionValue(args, "--tenant-host");
    if (!tenantHost) {
      printError("missing_tenant_host", "Usage: receiz seed-store --tenant-host <host> [--products <count>]");
      process.exitCode = 1;
      return;
    }
    const client = createReceizClient();
    printJson(client.sandbox.seedStore({ tenantHost, products: optionNumber(args, "--products", 3) }));
    return;
  }

  if (command === "simulate-checkout") {
    const amountUsd = optionValue(args, "--amount-usd");
    if (!amountUsd) {
      printError("missing_amount_usd", "Usage: receiz simulate-checkout --amount-usd <amount>");
      process.exitCode = 1;
      return;
    }
    const client = createReceizClient();
    printJson(client.sandbox.checkout({ amountUsd, outcome: optionValue(args, "--outcome") === "failure" ? "failure" : "success" }));
    return;
  }

  printError("unknown_command", command);
  process.exitCode = 1;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  printError("receiz_cli_failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
