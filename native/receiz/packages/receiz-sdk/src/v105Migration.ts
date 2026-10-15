import { createHash } from "node:crypto";

export type ReceizMigrationFile = Readonly<{ path: string; content: string }>;

type WriteInventory = Readonly<{
  schema: "receiz.v106.sdk_write_inventory.v1";
  writes: readonly Readonly<{ key: string; classification: string | null }>[];
}>;

type MigrationContract = Readonly<{
  schema: "receiz.v106.migration_contract.v1";
  source: Readonly<{ sdk: string; mcp: string; aiSkills: string }>;
  destination: Readonly<{ sdk: string; mcp: string; aiSkills: string }>;
  recovery: "roll-forward-from-verified-checkpoint";
  detectors: readonly Readonly<{ id: string; severity: string; ambiguousAction: "block-and-explain"; safeAlternatives: readonly string[] }>[];
}>;

export type ReceizMigrationFinding = Readonly<{
  detectorId: string;
  file: string;
  evidence: string;
  disposition: "automatic-safe-codemod" | "block-and-explain";
  safeAlternatives: readonly string[];
}>;

export type ReceizMigrationChange = Readonly<{
  path: string;
  kind: "coordinated-package-version" | "compiler-import-boundary";
  beforeDigest: string;
  afterDigest: string;
  afterContent: string;
}>;

export type ReceizV105MigrationPlan = Readonly<{
  schema: "receiz.sdk.v105-v106.migration-plan.v1";
  sourceVersion: "105.0.0";
  destinationVersion: "106.0.0";
  mode: "dry-run";
  planDigest: string;
  blocked: boolean;
  files: readonly ReceizMigrationFile[];
  changes: readonly ReceizMigrationChange[];
  findings: readonly ReceizMigrationFinding[];
  detectorIds: readonly string[];
  inventoryDispositions: readonly Readonly<{ key: string; classification: string; disposition: string }>[];
  recovery: "roll-forward-from-verified-checkpoint";
  authority: Readonly<{ migrationIsVerification: false; strongerTruth: "sealed-receiz-proof-object"; existingWitnessedHistoryMutable: false }>;
}>;

export type ReceizV105MigrationState = Readonly<{
  schema: "receiz.sdk.v105-v106.migration-state.v1";
  planDigest: string;
  completedPaths: readonly string[];
  recovery: "roll-forward-from-verified-checkpoint";
  historyRewritten: false;
}>;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  throw new Error("V105_MIGRATION_NONCANONICAL_VALUE");
}

function assertInputs(inventory: WriteInventory, contract: MigrationContract): void {
  if (inventory.schema !== "receiz.v106.sdk_write_inventory.v1" || inventory.writes.length !== 73) {
    throw new Error("V105_MIGRATION_WRITE_INVENTORY_INVALID");
  }
  if (contract.schema !== "receiz.v106.migration_contract.v1" || contract.detectors.length !== 14) {
    throw new Error("V105_MIGRATION_DETECTOR_CONTRACT_INVALID");
  }
  if (contract.source.sdk !== "105.0.0" || contract.destination.sdk !== "106.0.0") {
    throw new Error("V105_MIGRATION_VERSION_CONTRACT_INVALID");
  }
}

function packageCodemod(content: string): string | null {
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("V105_MIGRATION_PACKAGE_JSON_INVALID");
  }
  let changed = false;
  for (const field of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const dependencies = value[field];
    if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) continue;
    const entries = dependencies as Record<string, unknown>;
    for (const name of ["@receiz/sdk", "@receiz/mcp-server", "@receiz/ai-skills"]) {
      if (typeof entries[name] !== "string" || entries[name] === "106.0.0") continue;
      entries[name] = "106.0.0";
      changed = true;
    }
  }
  return changed ? `${JSON.stringify(value, null, 2)}\n` : null;
}

function compilerImportCodemod(content: string): string | null {
  if (!/\b(?:defineReceizApp|compileReceizAppContract|inspectReceizProject|planReceizUpgrade)\b/.test(content)) return null;
  const next = content.replace(/from\s+(["'])@receiz\/sdk\1/g, "from $1@receiz/sdk/compiler$1");
  return next === content ? null : next;
}

function detector(contract: MigrationContract, id: string) {
  const match = contract.detectors.find((item) => item.id === id);
  if (!match) throw new Error(`V105_MIGRATION_DETECTOR_MISSING:${id}`);
  return match;
}

function finding(contract: MigrationContract, id: string, file: string, evidence: string, automatic = false): ReceizMigrationFinding {
  const definition = detector(contract, id);
  return {
    detectorId: id,
    file,
    evidence,
    disposition: automatic ? "automatic-safe-codemod" : definition.ambiguousAction,
    safeAlternatives: [...definition.safeAlternatives],
  };
}

function scanFile(file: ReceizMigrationFile, contract: MigrationContract): ReceizMigrationFinding[] {
  const source = file.content;
  const findings: ReceizMigrationFinding[] = [];
  if (file.path === "package.json" && /"@receiz\/(?:sdk|mcp-server|ai-skills)"\s*:\s*"(?!106\.0\.0)/.test(source)) {
    findings.push(finding(contract, "version-skew", file.path, "coordinated Receiz package is not 106.0.0", true));
  }
  if (/\b(?:defineReceizApp|compileReceizAppContract|inspectReceizProject|planReceizUpgrade)\b/.test(source) && /from\s+["']@receiz\/sdk["']/.test(source)) {
    findings.push(finding(contract, "sdk-adapter-bypass", file.path, "Node compiler API imported from universal SDK boundary", true));
  }
  if (/(?:\bstate\.[A-Za-z0-9_]+\s*=|\bdb\.[A-Za-z0-9_.]+\.(?:set|update)\s*\(|\b(?:setXp|markAlive|changeOwner|grantReward)\s*\()/i.test(source)) {
    findings.push(finding(contract, "direct-canonical-write", file.path, "direct canonical state mutation syntax"));
  }
  if (/\bpublish[A-Za-z0-9_]*\s*\(/.test(source) && !/\bverif(?:y|ied)[A-Za-z0-9_]*\b/i.test(source)) {
    findings.push(finding(contract, "unverified-projection-publication", file.path, "publication has no enclosing proof verification"));
  }
  if (/\bmcp\.(?:set_xp|change_owner|mark_alive|grant_reward)\s*\(/i.test(source)) {
    findings.push(finding(contract, "mcp-command-bypass", file.path, "raw semantic mutation MCP call"));
  }
  if (/\bcapabilit(?:y|ies)\s*:\s*\{\s*\}/.test(source)) findings.push(finding(contract, "unscoped-capability", file.path, "empty capability scope"));
  if (/\bexecuteReceizCommand\s*\(\s*\{/.test(source)) {
    if (!/\bidempotencyKey\s*:/.test(source)) findings.push(finding(contract, "missing-idempotency", file.path, "command has no stable idempotency key"));
    if (!/\bexpectedRevision\s*:/.test(source)) findings.push(finding(contract, "missing-expected-revision", file.path, "command has no expected revision"));
    if (!/\btenantId\s*:/.test(source)) findings.push(finding(contract, "missing-tenant-binding", file.path, "command has no tenant binding"));
    if (!/\b(?:receipt|admissionReceipt)\b/.test(source)) findings.push(finding(contract, "missing-audit-receipt", file.path, "command result does not retain a receipt"));
  }
  if (/\bauthorit(?:y|ize)[A-Za-z0-9_]*[\s\S]{0,240}(?:Date\.now|Math\.random|new Date)/i.test(source)) {
    findings.push(finding(contract, "nondeterministic-authority", file.path, "authority depends on ambient input"));
    findings.push(finding(contract, "authority-clock-or-randomness", file.path, "authority uses wall clock or randomness"));
  }
  if (/schema\s*:\s*["'][^"']+\.v0["']/.test(source)) findings.push(finding(contract, "unsupported-schema", file.path, "unsupported v0 schema"));
  if (/catch\s*(?:\([^)]*\))?\s*\{\s*return\b/.test(source)) findings.push(finding(contract, "silent-fallback", file.path, "fallback suppresses typed denial"));
  return findings;
}

function inventoryDisposition(classification: string | null): string {
  switch (classification) {
    case "canonical_command_candidate": return "requires-command-adapter";
    case "lower_authority_operational": return "retain-lower-authority-operational";
    case "projection_or_index": return "retain-derived-projection";
    case "compatibility_adapter_candidate": return "requires-explicit-compatibility-adapter";
    case "forbidden_direct_mutation_candidate": return "blocked-forbidden-direct-mutation";
    default: return "blocked-unclassified";
  }
}

function planBasis(plan: Omit<ReceizV105MigrationPlan, "planDigest">): unknown {
  return {
    ...plan,
    files: plan.files.map((file) => ({ path: file.path, digest: digest(file.content) })),
  };
}

export function buildV105MigrationPlan(input: Readonly<{
  files: readonly ReceizMigrationFile[];
  inventory: WriteInventory;
  contract: MigrationContract;
}>): ReceizV105MigrationPlan {
  assertInputs(input.inventory, input.contract);
  const files = [...input.files].map((file) => ({ ...file })).sort((left, right) => left.path.localeCompare(right.path));
  const findings = files.flatMap((file) => scanFile(file, input.contract)).sort((left, right) => `${left.file}:${left.detectorId}`.localeCompare(`${right.file}:${right.detectorId}`));
  const changes: ReceizMigrationChange[] = [];
  for (const file of files) {
    const next = file.path === "package.json" ? packageCodemod(file.content) : compilerImportCodemod(file.content);
    if (!next) continue;
    changes.push({
      path: file.path,
      kind: file.path === "package.json" ? "coordinated-package-version" : "compiler-import-boundary",
      beforeDigest: digest(file.content),
      afterDigest: digest(next),
      afterContent: next,
    });
  }
  const withoutDigest = {
    schema: "receiz.sdk.v105-v106.migration-plan.v1" as const,
    sourceVersion: "105.0.0" as const,
    destinationVersion: "106.0.0" as const,
    mode: "dry-run" as const,
    blocked: findings.some((item) => item.disposition === "block-and-explain"),
    files,
    changes: changes.sort((left, right) => left.path.localeCompare(right.path)),
    findings,
    detectorIds: input.contract.detectors.map((item) => item.id).sort(),
    inventoryDispositions: input.inventory.writes.map((write) => ({
      key: write.key,
      classification: write.classification ?? "unclassified",
      disposition: inventoryDisposition(write.classification),
    })).sort((left, right) => left.key.localeCompare(right.key)),
    recovery: input.contract.recovery,
    authority: { migrationIsVerification: false as const, strongerTruth: "sealed-receiz-proof-object" as const, existingWitnessedHistoryMutable: false as const },
  };
  return { ...withoutDigest, planDigest: digest(canonical(planBasis(withoutDigest))) };
}

export function applyV105MigrationPlan(input: Readonly<{ plan: ReceizV105MigrationPlan; confirmation: string }>): Readonly<{
  files: readonly ReceizMigrationFile[];
  state: ReceizV105MigrationState;
}> {
  const { plan } = input;
  const { planDigest: _planDigest, ...withoutDigest } = plan;
  void _planDigest;
  if (digest(canonical(planBasis(withoutDigest))) !== plan.planDigest || input.confirmation !== plan.planDigest) {
    throw new Error("V105_MIGRATION_CONFIRMATION_INVALID");
  }
  if (plan.blocked) throw new Error("V105_MIGRATION_BLOCKED_AMBIGUOUS_AUTHORITY");
  const changes = new Map(plan.changes.map((change) => [change.path, change] as const));
  const files = plan.files.map((file) => {
    const change = changes.get(file.path);
    if (!change) return { ...file };
    if (digest(file.content) !== change.beforeDigest) throw new Error(`V105_MIGRATION_SOURCE_CHANGED:${file.path}`);
    return { path: file.path, content: change.afterContent };
  });
  return {
    files,
    state: {
      schema: "receiz.sdk.v105-v106.migration-state.v1",
      planDigest: plan.planDigest,
      completedPaths: plan.changes.map((change) => change.path),
      recovery: "roll-forward-from-verified-checkpoint",
      historyRewritten: false,
    },
  };
}

export function verifyV105Migration(input: Readonly<{
  files: readonly ReceizMigrationFile[];
  state: ReceizV105MigrationState;
  inventory: WriteInventory;
  contract: MigrationContract;
}>): Readonly<{
  schema: "receiz.sdk.v105-v106.migration-verification.v1";
  ok: boolean;
  checks: readonly Readonly<{ id: string; ok: boolean }>[];
  authority: Readonly<{ verificationIsAdmission: false; strongerTruth: "sealed-receiz-proof-object" }>;
}> {
  const plan = buildV105MigrationPlan({ files: input.files, inventory: input.inventory, contract: input.contract });
  const packageFile = input.files.find((file) => file.path === "package.json");
  const packagesAligned = Boolean(packageFile && ["@receiz/sdk", "@receiz/mcp-server", "@receiz/ai-skills"].every((name) => new RegExp(`"${name.replace("/", "\\/")}"\\s*:\\s*"106\\.0\\.0"`).test(packageFile.content)));
  const checks = [
    { id: "all-73-writes-classified", ok: plan.inventoryDispositions.length === 73 && plan.inventoryDispositions.every((item) => item.classification !== "unclassified") },
    { id: "all-14-detectors-loaded", ok: plan.detectorIds.length === 14 },
    { id: "safe-codemods-complete", ok: plan.changes.length === 0 },
    { id: "ambiguous-authority-absent", ok: !plan.blocked },
    { id: "coordinated-packages-106", ok: packagesAligned },
    { id: "forward-only-state", ok: input.state.recovery === "roll-forward-from-verified-checkpoint" && input.state.historyRewritten === false },
  ];
  return {
    schema: "receiz.sdk.v105-v106.migration-verification.v1",
    ok: checks.every((check) => check.ok),
    checks,
    authority: { verificationIsAdmission: false, strongerTruth: "sealed-receiz-proof-object" },
  };
}
