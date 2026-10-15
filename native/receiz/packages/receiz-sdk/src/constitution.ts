import {
  RECEIZ_V113_PROTOCOL_LIMITS,
  RECEIZ_V114_PROTOCOL_LIMITS,
  assertReceizProtocolMaximum,
} from "./verificationLimits.js";

export type ReceizConstitutionJson = null | boolean | number | string | ReceizConstitutionJson[] | { [key: string]: ReceizConstitutionJson };
export type ReceizConstitutionPhase = "command" | "event" | "merge" | "migration" | "admission";

export type ReceizLawExpression =
  | Readonly<{ op: "literal"; value: ReceizConstitutionJson }>
  | Readonly<{ op: "path"; value: string }>
  | Readonly<{ op: "equal"; left: ReceizLawExpression; right: ReceizLawExpression }>
  | Readonly<{ op: "all" | "any"; values: readonly ReceizLawExpression[] }>
  | Readonly<{ op: "not"; value: ReceizLawExpression }>
  | Readonly<{ op: "transition"; path: string; from: ReceizConstitutionJson; to: ReceizConstitutionJson }>;

export type ReceizConstitutionLaw = Readonly<{
  id: string;
  version: number;
  phases: readonly ReceizConstitutionPhase[];
  denyWhen: ReceizLawExpression;
  denial: Readonly<{ code: string; safeAlternatives: readonly string[] }>;
}>;

export type ReceizProtocolLimits = Readonly<{
  exactArtifactBytes: number;
  archiveEntries: number;
  singleDecompressedEntryBytes: number;
  totalDecompressedBytes: number;
  rootArchiveContainerDepth: number;
  embeddedArchiveNesting: number;
  perEntryCompressionRatio: number;
  aggregateCompressionRatio: number;
  canonicalArchivePathBytes: number;
  archiveEntryNameBytes: number;
  manifestBytes: number;
  verifiedHistoryNodes: number;
  reconciliationAdditions: number;
  remotePredecessorFetches: number;
  artifactNamespaces: number;
  reducerOperations: number;
  lawExpressionOperations: number;
}>;

export type ReceizConstitutionRegistry = Readonly<{
  schema: "receiz.constitution.registry.v1";
  version: "106.0.0" | "107.0.0" | "108.0.0" | "109.0.0" | "110.0.0" | "111.0.0" | "112.0.0" | "113.0.0" | "114.0.0" | "115.0.0" | "116.0.0" | "117.0.0" | "118.0.0" | "119.0.0" | "120.0.0" | "121.0.0" | "122.0.0" | "123.0.0" | "124.0.0" | "125.0.0" | "126.0.0" | "127.0.0";
  previousRegistryDigest: string;
  effectiveKai: string;
  createdAt: string;
  predicateLanguageVersion?: "receiz-law-expression.v1";
  protocolLimits?: ReceizProtocolLimits;
  laws: readonly ReceizConstitutionLaw[];
  authority: Readonly<{ registryPayloadIsAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;

export type ReceizConstitutionRegistryValidationResult =
  | Readonly<{ ok: true; value: ReceizConstitutionRegistry; issues: readonly [] }>
  | Readonly<{ ok: false; issues: readonly string[] }>;

const ROOT_KEYS = new Set(["schema", "version", "previousRegistryDigest", "effectiveKai", "createdAt", "predicateLanguageVersion", "protocolLimits", "laws", "authority"]);
const LAW_KEYS = new Set(["id", "version", "phases", "denyWhen", "denial"]);
const DENIAL_KEYS = new Set(["code", "safeAlternatives"]);
const EXPRESSION_KEYS = {
  literal: new Set(["op", "value"]),
  path: new Set(["op", "value"]),
  equal: new Set(["op", "left", "right"]),
  all: new Set(["op", "values"]),
  any: new Set(["op", "values"]),
  not: new Set(["op", "value"]),
  transition: new Set(["op", "path", "from", "to"]),
} as const;
const PHASES = new Set<ReceizConstitutionPhase>(["command", "event", "merge", "migration", "admission"]);
const HEX64 = /^[0-9a-f]{64}$/;
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function canonicalizeReceizConstitution(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("constitution_noncanonical_number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeReceizConstitution).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => {
      if (value[key] === undefined) throw new Error("constitution_undefined_value");
      return `${JSON.stringify(key)}:${canonicalizeReceizConstitution(value[key])}`;
    }).join(",")}}`;
  }
  throw new Error("constitution_non_json_value");
}

export async function digestReceizConstitution(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalizeReceizConstitution(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateExpression(value: unknown, issues: string[], path: string): value is ReceizLawExpression {
  if (!isRecord(value) || typeof value.op !== "string") { issues.push(`${path}:expression_required`); return false; }
  const allowedKeys = EXPRESSION_KEYS[value.op as keyof typeof EXPRESSION_KEYS];
  if (!allowedKeys) { issues.push(`${path}:unknown_operator:${value.op}`); return false; }
  for (const key of Object.keys(value)) if (!allowedKeys.has(key)) issues.push(`${path}:unknown_key:${key}`);
  if (value.op === "literal") { try { canonicalizeReceizConstitution(value.value); } catch { issues.push(`${path}:literal_non_json`); } return true; }
  if (value.op === "path") { if (typeof value.value !== "string" || !value.value) issues.push(`${path}:path_required`); return true; }
  if (value.op === "equal") { validateExpression(value.left, issues, `${path}.left`); validateExpression(value.right, issues, `${path}.right`); return true; }
  if (value.op === "all" || value.op === "any") {
    if (!Array.isArray(value.values) || value.values.length === 0 || value.values.length > 64) issues.push(`${path}:bounded_values_required`);
    else value.values.forEach((entry, index) => validateExpression(entry, issues, `${path}.values[${index}]`));
    return true;
  }
  if (value.op === "not") { validateExpression(value.value, issues, `${path}.value`); return true; }
  if (value.op === "transition") {
    if (typeof value.path !== "string" || !value.path) issues.push(`${path}:transition_path_required`);
    try { canonicalizeReceizConstitution(value.from); canonicalizeReceizConstitution(value.to); } catch { issues.push(`${path}:transition_non_json`); }
    return true;
  }
  return false;
}

export function validateReceizConstitutionRegistry(value: unknown): ReceizConstitutionRegistryValidationResult {
  const issues: string[] = [];
  if (!isRecord(value)) return { ok: false, issues: ["$:registry_required"] };
  for (const key of Object.keys(value)) if (!ROOT_KEYS.has(key)) issues.push(`$:unknown_key:${key}`);
  if (value.schema !== "receiz.constitution.registry.v1") issues.push("$:invalid_schema");
  if (value.version !== "106.0.0" && value.version !== "107.0.0" && value.version !== "108.0.0" && value.version !== "109.0.0" && value.version !== "110.0.0" && value.version !== "111.0.0" && value.version !== "112.0.0" && value.version !== "113.0.0" && value.version !== "114.0.0" && value.version !== "115.0.0" && value.version !== "116.0.0" && value.version !== "117.0.0" && value.version !== "118.0.0" && value.version !== "119.0.0" && value.version !== "120.0.0" && value.version !== "121.0.0" && value.version !== "122.0.0" && value.version !== "123.0.0" && value.version !== "124.0.0" && value.version !== "125.0.0" && value.version !== "126.0.0" && value.version !== "127.0.0") issues.push("$:invalid_version");
  if ((value.version === "112.0.0" || value.version === "113.0.0" || value.version === "114.0.0" || value.version === "115.0.0" || value.version === "116.0.0" || value.version === "117.0.0" || value.version === "118.0.0" || value.version === "119.0.0" || value.version === "120.0.0" || value.version === "121.0.0" || value.version === "122.0.0" || value.version === "123.0.0" || value.version === "124.0.0" || value.version === "125.0.0" || value.version === "126.0.0" || value.version === "127.0.0") && value.predicateLanguageVersion !== "receiz-law-expression.v1") issues.push("$:unsupported_predicate_language");
  else if (value.predicateLanguageVersion !== undefined && value.predicateLanguageVersion !== "receiz-law-expression.v1") issues.push("$:unsupported_predicate_language");
  if (value.version === "113.0.0" && canonicalizeReceizConstitution(value.protocolLimits) !== canonicalizeReceizConstitution(RECEIZ_V113_PROTOCOL_LIMITS)) issues.push("$:invalid_protocol_limits");
  if ((value.version === "114.0.0" || value.version === "115.0.0" || value.version === "116.0.0" || value.version === "117.0.0" || value.version === "118.0.0" || value.version === "119.0.0" || value.version === "120.0.0" || value.version === "121.0.0" || value.version === "122.0.0" || value.version === "123.0.0" || value.version === "124.0.0" || value.version === "125.0.0" || value.version === "126.0.0" || value.version === "127.0.0") && canonicalizeReceizConstitution(value.protocolLimits) !== canonicalizeReceizConstitution(RECEIZ_V114_PROTOCOL_LIMITS)) issues.push("$:invalid_protocol_limits");
  if (value.version !== "113.0.0" && value.version !== "114.0.0" && value.version !== "115.0.0" && value.version !== "116.0.0" && value.version !== "117.0.0" && value.version !== "118.0.0" && value.version !== "119.0.0" && value.version !== "120.0.0" && value.version !== "121.0.0" && value.version !== "122.0.0" && value.version !== "123.0.0" && value.version !== "124.0.0" && value.version !== "125.0.0" && value.version !== "126.0.0" && value.version !== "127.0.0" && value.protocolLimits !== undefined) issues.push("$:protocol_limits_version_mismatch");
  if (typeof value.previousRegistryDigest !== "string" || !HEX64.test(value.previousRegistryDigest)) issues.push("$:previous_digest_required");
  if (typeof value.effectiveKai !== "string" || !value.effectiveKai) issues.push("$:effective_kai_required");
  if (typeof value.createdAt !== "string" || !value.createdAt) issues.push("$:created_at_metadata_required");
  if (!isRecord(value.authority) || value.authority.registryPayloadIsAuthority !== false || value.authority.strongerTruth !== "sealed-receiz-proof-object") issues.push("$:invalid_authority_boundary");
  if (!Array.isArray(value.laws) || value.laws.length === 0 || value.laws.length > 1024) issues.push("$:bounded_laws_required");
  else value.laws.forEach((law, index) => {
    if (!isRecord(law)) { issues.push(`$.laws[${index}]:law_required`); return; }
    for (const key of Object.keys(law)) if (!LAW_KEYS.has(key)) issues.push(`$.laws[${index}]:unknown_key:${key}`);
    if (typeof law.id !== "string" || !law.id) issues.push(`$.laws[${index}]:id_required`);
    if (!Number.isInteger(law.version) || Number(law.version) < 1) issues.push(`$.laws[${index}]:version_required`);
    if (!Array.isArray(law.phases) || law.phases.some((phase) => !PHASES.has(phase as ReceizConstitutionPhase))) issues.push(`$.laws[${index}]:invalid_phases`);
    validateExpression(law.denyWhen, issues, `$.laws[${index}].denyWhen`);
    if (!isRecord(law.denial)) issues.push(`$.laws[${index}]:denial_required`);
    else {
      for (const key of Object.keys(law.denial)) if (!DENIAL_KEYS.has(key)) issues.push(`$.laws[${index}].denial:unknown_key:${key}`);
      if (typeof law.denial.code !== "string"
        || !Array.isArray(law.denial.safeAlternatives)
        || law.denial.safeAlternatives.some((alternative) => typeof alternative !== "string")) issues.push(`$.laws[${index}]:denial_required`);
    }
  });
  return issues.length ? { ok: false, issues: issues.sort() } : { ok: true, value: value as ReceizConstitutionRegistry, issues: [] };
}

function pathValue(context: unknown, path: string): unknown {
  let current = context;
  for (const segment of path.split(".")) {
    if (!isRecord(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return false;
  return canonicalizeReceizConstitution(left) === canonicalizeReceizConstitution(right);
}

function evaluate(expression: ReceizLawExpression, context: unknown, budget: { remaining: number; consumed: number }): unknown {
  budget.remaining -= 1; budget.consumed += 1;
  if (budget.remaining < 0) throw new Error("constitution_budget_exhausted");
  if (expression.op === "literal") return expression.value;
  if (expression.op === "path") return pathValue(context, expression.value);
  if (expression.op === "equal") return jsonEqual(evaluate(expression.left, context, budget), evaluate(expression.right, context, budget));
  if (expression.op === "all") return expression.values.every((entry) => Boolean(evaluate(entry, context, budget)));
  if (expression.op === "any") return expression.values.some((entry) => Boolean(evaluate(entry, context, budget)));
  if (expression.op === "not") return !Boolean(evaluate(expression.value, context, budget));
  if (expression.op === "transition") return jsonEqual(pathValue(context, `previous.${expression.path}`), expression.from)
    && jsonEqual(pathValue(context, `proposed.${expression.path}`), expression.to);
  throw new Error("constitution_unknown_operator");
}

function inspectExpression(expression: ReceizLawExpression, budget: { remaining: number; consumed: number }): void {
  budget.remaining -= 1; budget.consumed += 1;
  if (budget.remaining < 0) throw new Error("constitution_budget_exhausted");
  if (expression.op === "literal" || expression.op === "path" || expression.op === "transition") return;
  if (expression.op === "equal") {
    inspectExpression(expression.left, budget);
    inspectExpression(expression.right, budget);
    return;
  }
  if (expression.op === "all" || expression.op === "any") {
    for (const nested of expression.values) inspectExpression(nested, budget);
    return;
  }
  if (expression.op === "not") {
    inspectExpression(expression.value, budget);
    return;
  }
  throw new Error("constitution_unknown_operator");
}

export function assertReceizConstitutionRegistryInterpretable(input: {
  registry: ReceizConstitutionRegistry;
  budget: number;
}): Readonly<{ predicateLanguageVersion: "receiz-law-expression.v1"; budgetConsumed: number }> {
  const validated = validateReceizConstitutionRegistry(input.registry);
  if (!validated.ok) {
    if (validated.issues.some((issue) => issue.includes("unknown_operator"))) throw new Error("constitution_unknown_operator");
    if (validated.issues.some((issue) => issue.includes("unsupported_predicate_language"))) throw new Error("constitution_predicate_language_unsupported");
    throw new Error(`constitution_registry_invalid:${validated.issues.join(",")}`);
  }
  if (validated.value.predicateLanguageVersion !== "receiz-law-expression.v1") throw new Error("constitution_predicate_language_unsupported");
  if (!Number.isInteger(input.budget) || input.budget < 1) throw new Error("constitution_budget_required");
  assertReceizProtocolMaximum("lawExpressionOperations", input.budget);
  const budget = { remaining: input.budget, consumed: 0 };
  for (const law of validated.value.laws) inspectExpression(law.denyWhen, budget);
  return { predicateLanguageVersion: "receiz-law-expression.v1", budgetConsumed: budget.consumed };
}

export async function evaluateReceizLawSet(input: { registry: ReceizConstitutionRegistry; context: unknown; phase: ReceizConstitutionPhase; budget: number }) {
  const validated = validateReceizConstitutionRegistry(input.registry);
  if (!validated.ok) throw new Error(`constitution_registry_invalid:${validated.issues.join(",")}`);
  if (!Number.isInteger(input.budget) || input.budget < 1) throw new Error("constitution_budget_required");
  assertReceizProtocolMaximum("lawExpressionOperations", input.budget);
  canonicalizeReceizConstitution(input.context);
  const budget = { remaining: input.budget, consumed: 0 };
  const denials: Array<{ law: string; code: string; attemptedTransition: string | null; affectedAsset: string | null; safeAlternatives: readonly string[] }> = [];
  for (const law of input.registry.laws) {
    if (!law.phases.includes(input.phase)) continue;
    if (Boolean(evaluate(law.denyWhen, input.context, budget))) denials.push({
      law: law.id,
      code: law.denial.code,
      attemptedTransition: `${String(pathValue(input.context, "previous.life") ?? "unknown")} → ${String(pathValue(input.context, "proposed.life") ?? "unknown")}`,
      affectedAsset: typeof pathValue(input.context, "asset.id") === "string" ? pathValue(input.context, "asset.id") as string : null,
      safeAlternatives: law.denial.safeAlternatives,
    });
  }
  return { schema: "receiz.constitution.evaluation.v1" as const, allowed: denials.length === 0, denials, budgetConsumed: budget.consumed, registryDigest: await digestReceizConstitution(input.registry), authority: { evaluationIsAdmission: false as const, strongerTruth: "sealed-receiz-proof-object" as const } };
}
