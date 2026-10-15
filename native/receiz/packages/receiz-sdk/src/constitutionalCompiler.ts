import { RECEIZ_V126_APPLICATION_OPERATION_MATRIX, RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX, RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE } from "./appContract.js";
import type { ReceizAuthorityProfile } from "./commandAdmission.js";
import {
  RECEIZ_V112_APP_CLIENT_SURFACES,
  RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
  RECEIZ_V112_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V112_APPLICATION_OPERATIONS,
  RECEIZ_V113_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V113_APPLICATION_OPERATIONS,
  RECEIZ_V114_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V114_APPLICATION_OPERATIONS,
  RECEIZ_V115_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V115_APPLICATION_OPERATIONS,
  RECEIZ_V116_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V116_APPLICATION_OPERATIONS,
  RECEIZ_V117_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V117_APPLICATION_OPERATIONS,
  RECEIZ_V118_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V118_APPLICATION_OPERATIONS,
  RECEIZ_V119_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V119_APPLICATION_OPERATIONS,
  RECEIZ_V120_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V120_APPLICATION_OPERATIONS,
  RECEIZ_V121_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V121_APPLICATION_OPERATIONS,
  RECEIZ_V122_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V122_APPLICATION_OPERATIONS,
  RECEIZ_V123_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V123_APPLICATION_OPERATIONS,
  RECEIZ_V124_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V124_APPLICATION_OPERATIONS,
  RECEIZ_V125_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V125_APPLICATION_OPERATIONS,
  type ReceizAppOperationAuthorityDeclaration,
} from "./appContract.js";
import {
  canonicalizeReceizConstitution,
  digestReceizConstitution,
  validateReceizConstitutionRegistry,
  type ReceizConstitutionJson,
  type ReceizConstitutionRegistry,
} from "./constitution.js";

export type ReceizDomainDefinition = Readonly<{
  schema: "receiz.domain.v1";
  version: "106.0.0" | "108.0.0" | "109.0.0" | "110.0.0" | "111.0.0" | "112.0.0" | "113.0.0" | "114.0.0" | "115.0.0" | "116.0.0" | "117.0.0" | "118.0.0" | "119.0.0" | "120.0.0" | "121.0.0" | "122.0.0" | "123.0.0" | "124.0.0" | "125.0.0" | "126.0.0" | "127.0.0";
  domain: string;
  aggregate: Readonly<{ name: string; idPrefix: string }>;
  authorityProfile: ReceizAuthorityProfile;
  stateSchema: Readonly<Record<string, ReceizConstitutionJson>>;
  stateMachine: Readonly<{
    initial: string;
    states: readonly string[];
    transitions: readonly Readonly<{ command: string; from: string; to: string }>[];
  }>;
  commands: readonly Readonly<{
    name: string;
    capability: string;
    events: readonly string[];
    maximumEffects: Readonly<Record<string, number>>;
  }>[];
  events: readonly Readonly<{ name: string; payloadSchema: Readonly<Record<string, ReceizConstitutionJson>> }>[];
  projections: readonly Readonly<{ name: string; events: readonly string[] }>[];
  laws: readonly string[];
  capabilities: readonly string[];
  migrations: readonly Readonly<{ from: string; to: string; preservesHistory: true }>[];
  privacy: Readonly<{ classification: string; sensitiveFields: readonly string[] }>;
  performance: Readonly<{
    maxLawOperations: number;
    maxEventsPerCommand: number;
    maxRecordsPerTransaction: number;
  }>;
  lawfulActionValue?: Readonly<{
    enabled: true;
    actionLawId: string;
    registryBindingLawId: "receiz.action.current-registry-law.v125";
    universalValueLawId: "receiz.value.universal-deterministic-kai.v125";
    phiAmountSource: "sealed-kai-coordinates-only";
  }>;
}>;

export type ReceizGeneratedDomainFile = Readonly<{
  path: string;
  content: string;
  ownership: "receiz-generated" | "developer-extension";
}>;

export type ReceizDomainCompilation = Readonly<{
  schema: "receiz.domain.compilation.v1";
  version: "106.0.0" | "108.0.0" | "109.0.0" | "110.0.0" | "111.0.0" | "112.0.0" | "113.0.0" | "114.0.0" | "115.0.0" | "116.0.0" | "117.0.0" | "118.0.0" | "119.0.0" | "120.0.0" | "121.0.0" | "122.0.0" | "123.0.0" | "124.0.0" | "125.0.0" | "126.0.0" | "127.0.0";
  domain: string;
  registryDigest: string;
  compilationDigest: string;
  implementationContract: Readonly<{
    sourceOfTruth: "sealed-receiz-proof-object";
    allowedMutations: readonly ["receiz-command-admission"];
    forbiddenOperations: readonly ["direct-state-write", "history-rewrite", "authority-bypass"];
    applicableLaws: readonly string[];
    authorityProfile: ReceizAuthorityProfile;
    requiredEvidence: readonly ["typecheck", "law-coverage", "mutation-tests", "replay-equivalence", "compatibility", "mcp-conformance"];
    completionRule: "verification-must-pass";
    operationAuthorityMatrix?: readonly ReceizAppOperationAuthorityDeclaration[];
    lawfulActionValue?: Readonly<{
      actionLawId: string;
      registrationRequiresSealedProof: true;
      developerMayDeclarePhiAmount: false;
      institutionReceivesProofExemption: false;
      executionRail: "settlement";
    }>;
  }>;
  files: readonly ReceizGeneratedDomainFile[];
}>;

const NAME = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const SYMBOL = /^[A-Za-z][A-Za-z0-9]*(?:[._:-][A-Za-z0-9]+)*$/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9]*$/;
const PROFILES = new Set<ReceizAuthorityProfile>(["artifact-local", "global-shared", "projection-only", "simulation-only"]);

function stableJson(value: unknown): string {
  return `${JSON.stringify(JSON.parse(canonicalizeReceizConstitution(value)), null, 2)}\n`;
}

function assertUnique(values: readonly string[], code: string): void {
  if (new Set(values).size !== values.length) throw new Error(code);
}

function validateDefinition(definition: ReceizDomainDefinition, registry: ReceizConstitutionRegistry): void {
  const registryValidation = validateReceizConstitutionRegistry(registry);
  if (!registryValidation.ok) throw new Error(`DOMAIN_REGISTRY_INVALID:${registryValidation.issues.join(",")}`);
  if (definition.schema !== "receiz.domain.v1" || !["106.0.0", "108.0.0", "109.0.0", "110.0.0", "111.0.0", "112.0.0", "113.0.0", "114.0.0", "115.0.0", "116.0.0", "117.0.0", "118.0.0", "119.0.0", "120.0.0", "121.0.0", "122.0.0", "123.0.0", "124.0.0", "125.0.0", "126.0.0", "127.0.0"].includes(definition.version) || !NAME.test(definition.domain)) throw new Error("DOMAIN_DEFINITION_INVALID");
  if (!IDENTIFIER.test(definition.aggregate.name) || !NAME.test(definition.aggregate.idPrefix) || !PROFILES.has(definition.authorityProfile)) throw new Error("DOMAIN_AGGREGATE_INVALID");
  canonicalizeReceizConstitution(definition);
  assertUnique(definition.commands.map((value) => value.name), "DOMAIN_COMMAND_DUPLICATE");
  if (definition.version === "112.0.0"
    && definition.commands.some((command) => (RECEIZ_V112_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "113.0.0"
    && definition.commands.some((command) => (RECEIZ_V113_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "114.0.0"
    && definition.commands.some((command) => (RECEIZ_V114_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "115.0.0"
    && definition.commands.some((command) => (RECEIZ_V115_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "116.0.0"
    && definition.commands.some((command) => (RECEIZ_V116_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "117.0.0"
    && definition.commands.some((command) => (RECEIZ_V117_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "118.0.0"
    && definition.commands.some((command) => (RECEIZ_V118_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "119.0.0"
    && definition.commands.some((command) => (RECEIZ_V119_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "120.0.0"
    && definition.commands.some((command) => (RECEIZ_V120_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "121.0.0"
    && definition.commands.some((command) => (RECEIZ_V121_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "122.0.0"
    && definition.commands.some((command) => (RECEIZ_V122_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "123.0.0"
    && definition.commands.some((command) => (RECEIZ_V123_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if (definition.version === "124.0.0"
    && definition.commands.some((command) => (RECEIZ_V124_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  if ((definition.version === "125.0.0" || definition.version === "126.0.0" || definition.version === "127.0.0")
    && definition.commands.some((command) => (RECEIZ_V125_APPLICATION_OPERATIONS as readonly string[]).includes(command.name))) {
    throw new Error("DOMAIN_COMMAND_RESERVED");
  }
  assertUnique(definition.events.map((value) => value.name), "DOMAIN_EVENT_DUPLICATE");
  assertUnique(definition.projections.map((value) => value.name), "DOMAIN_PROJECTION_DUPLICATE");
  assertUnique(definition.laws, "DOMAIN_LAW_DUPLICATE");
  assertUnique(definition.capabilities, "DOMAIN_CAPABILITY_DUPLICATE");
  assertUnique(definition.stateMachine.states, "DOMAIN_STATE_DUPLICATE");
  const laws = new Set(registry.laws.map((law) => law.id));
  if (definition.laws.some((law) => !laws.has(law))) throw new Error("DOMAIN_LAW_UNKNOWN");
  const commands = new Set(definition.commands.map((command) => command.name));
  const events = new Set(definition.events.map((event) => event.name));
  const capabilities = new Set(definition.capabilities);
  if (definition.commands.some((command) => !SYMBOL.test(command.name) || !capabilities.has(command.capability) || command.events.some((event) => !events.has(event)))) throw new Error("DOMAIN_COMMAND_INVALID");
  if (definition.events.some((event) => !SYMBOL.test(event.name))) throw new Error("DOMAIN_EVENT_INVALID");
  if (definition.projections.some((projection) => !SYMBOL.test(projection.name) || projection.events.some((event) => !events.has(event)))) throw new Error("DOMAIN_PROJECTION_INVALID");
  const states = new Set(definition.stateMachine.states);
  if (!states.has(definition.stateMachine.initial)
    || definition.stateMachine.transitions.some((transition) => !commands.has(transition.command) || !states.has(transition.from) || !states.has(transition.to))) throw new Error("DOMAIN_STATE_MACHINE_INVALID");
  if (definition.migrations.some((migration) => !migration.from || !migration.to || migration.preservesHistory !== true)) throw new Error("DOMAIN_MIGRATION_INVALID");
  const budgets = Object.values(definition.performance);
  if (budgets.some((value) => !Number.isInteger(value) || value < 1)
    || definition.performance.maxLawOperations > 100_000
    || definition.performance.maxEventsPerCommand > 1_024
    || definition.performance.maxRecordsPerTransaction > 10_000) throw new Error("DOMAIN_PERFORMANCE_INVALID");
  if (definition.commands.some((command) => command.events.length > definition.performance.maxEventsPerCommand
    || Object.values(command.maximumEffects).some((amount) => !Number.isFinite(amount) || amount < 0))) throw new Error("DOMAIN_EFFECT_BUDGET_INVALID");
  if (definition.lawfulActionValue !== undefined) {
    const value = definition.lawfulActionValue;
    if (definition.version !== "125.0.0" && definition.version !== "126.0.0" && definition.version !== "127.0.0" || value.enabled !== true || !NAME.test(value.actionLawId)
      || value.registryBindingLawId !== "receiz.action.current-registry-law.v125"
      || value.universalValueLawId !== "receiz.value.universal-deterministic-kai.v125"
      || value.phiAmountSource !== "sealed-kai-coordinates-only"
      || !laws.has(value.registryBindingLawId) || !laws.has(value.universalValueLawId)
      || !(definition.laws as readonly string[]).includes(value.registryBindingLawId)
      || !(definition.laws as readonly string[]).includes(value.universalValueLawId)) {
      throw new Error("DOMAIN_LAWFUL_ACTION_VALUE_INVALID");
    }
  }
}

function generatedFiles(definition: ReceizDomainDefinition, registryDigest: string): ReceizGeneratedDomainFile[] {
  const root = `receiz/${definition.domain}`;
  const isV112 = definition.version === "112.0.0";
  const isV113 = definition.version === "113.0.0";
  const isV114 = definition.version === "114.0.0";
  const isV115 = definition.version === "115.0.0";
  const isV116 = definition.version === "116.0.0";
  const isV117 = definition.version === "117.0.0";
  const isV118 = definition.version === "118.0.0";
  const isV119 = definition.version === "119.0.0";
  const isV120 = definition.version === "120.0.0";
  const isV121 = definition.version === "121.0.0";
  const isV122 = definition.version === "122.0.0";
  const isV123 = definition.version === "123.0.0";
  const isV124 = definition.version === "124.0.0";
  const isV127 = definition.version === "127.0.0";
  const isV126 = definition.version === "126.0.0";
  const isV125 = definition.version === "125.0.0";
  const hasDeclarativeMatrix = isV112 || isV113 || isV114 || isV115 || isV116 || isV117 || isV118 || isV119 || isV120 || isV121 || isV122 || isV123 || isV124 || isV125 || isV126 || isV127;
  const operationAuthorityMatrix = isV127 ? RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX : isV126 ? RECEIZ_V126_APPLICATION_OPERATION_MATRIX : isV125
    ? RECEIZ_V125_APPLICATION_OPERATION_MATRIX
    : isV124
    ? RECEIZ_V124_APPLICATION_OPERATION_MATRIX
    : isV123
    ? RECEIZ_V123_APPLICATION_OPERATION_MATRIX
    : isV122
    ? RECEIZ_V122_APPLICATION_OPERATION_MATRIX
    : isV121
    ? RECEIZ_V121_APPLICATION_OPERATION_MATRIX
    : isV120
    ? RECEIZ_V120_APPLICATION_OPERATION_MATRIX
    : isV119
    ? RECEIZ_V119_APPLICATION_OPERATION_MATRIX
    : isV118
    ? RECEIZ_V118_APPLICATION_OPERATION_MATRIX
    : isV117
    ? RECEIZ_V117_APPLICATION_OPERATION_MATRIX
    : isV116
    ? RECEIZ_V116_APPLICATION_OPERATION_MATRIX
    : isV115
    ? RECEIZ_V115_APPLICATION_OPERATION_MATRIX
    : isV114
      ? RECEIZ_V114_APPLICATION_OPERATION_MATRIX
    : isV113
      ? RECEIZ_V113_APPLICATION_OPERATION_MATRIX
      : RECEIZ_V112_APPLICATION_OPERATION_MATRIX;
  const compatibleSdkRange = isV127 ? RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE : isV126 ? RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE : isV125
    ? ">=125.0.0 <126.0.0"
    : isV124
    ? ">=124.0.0 <125.0.0"
    : isV123
    ? ">=123.0.0 <124.0.0"
    : isV122
    ? ">=122.0.0 <123.0.0"
    : isV121
    ? ">=121.0.0 <122.0.0"
    : isV120
    ? ">=120.0.0 <121.0.0"
    : isV119
    ? ">=119.0.0 <120.0.0"
    : isV118
    ? ">=118.0.0 <119.0.0"
    : isV117
    ? ">=117.0.0 <118.0.0"
    : isV116
    ? ">=116.0.0 <117.0.0"
    : isV115
    ? ">=115.0.0 <116.0.0"
    : isV114
    ? ">=114.0.0 <115.0.0"
    : isV113
    ? ">=113.0.0 <114.0.0"
    : ">=112.0.0 <113.0.0";
  const commandExecutionTemplate = operationAuthorityMatrix.find((row) => row.operation === "admission.command.execute")!;
  const contract = {
    schema: definition.schema,
    version: definition.version,
    domain: definition.domain,
    registryDigest,
    aggregate: definition.aggregate,
    authorityProfile: definition.authorityProfile,
    stateSchema: definition.stateSchema,
    stateMachine: definition.stateMachine,
    privacy: definition.privacy,
    performance: definition.performance,
    ...(definition.lawfulActionValue ? {
      lawfulActionValue: {
        ...definition.lawfulActionValue,
        registrationRequiresSealedProof: true,
        developerMayDeclarePhiAmount: false,
        institutionReceivesProofExemption: false,
        executionRail: "settlement",
      },
    } : {}),
    ...(hasDeclarativeMatrix ? {
      operationAuthorityMatrix,
      clientSurfaces: RECEIZ_V112_APP_CLIENT_SURFACES,
      unavailableClientSurfaces: RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
    } : {}),
  };
  const manifest = {
    schema: "receiz.skill.manifest.v1",
    name: `receiz-${definition.domain}-domain`,
    version: definition.version,
    requires: {
      sdk: definition.version === "127.0.0" ? RECEIZ_CURRENT_APP_COMPATIBLE_SDK_RANGE : definition.version === "126.0.0" ? RECEIZ_V126_APP_COMPATIBLE_SDK_RANGE : definition.version === "125.0.0"
        ? ">=125.0.0 <126.0.0"
        : definition.version === "124.0.0"
        ? ">=124.0.0 <125.0.0"
        : definition.version === "123.0.0"
        ? ">=123.0.0 <124.0.0"
        : definition.version === "122.0.0"
        ? ">=122.0.0 <123.0.0"
        : definition.version === "121.0.0"
        ? ">=121.0.0 <122.0.0"
        : definition.version === "120.0.0"
        ? ">=120.0.0 <121.0.0"
        : definition.version === "119.0.0"
        ? ">=119.0.0 <120.0.0"
        : definition.version === "118.0.0"
        ? ">=118.0.0 <119.0.0"
        : definition.version === "117.0.0"
        ? ">=117.0.0 <118.0.0"
        : definition.version === "116.0.0"
        ? ">=116.0.0 <117.0.0"
        : definition.version === "115.0.0"
        ? ">=115.0.0 <116.0.0"
        : definition.version === "114.0.0"
        ? ">=114.0.0 <115.0.0"
        : definition.version === "113.0.0"
        ? ">=113.0.0 <114.0.0"
        : definition.version === "112.0.0"
        ? ">=112.0.0 <113.0.0"
        : definition.version === "111.0.0"
        ? ">=111.0.0 <112.0.0"
        : definition.version === "110.0.0"
          ? ">=110.0.0 <111.0.0"
        : definition.version === "109.0.0"
          ? ">=109.0.0 <110.0.0"
        : definition.version === "108.0.0"
          ? ">=108.0.0 <109.0.0"
          : ">=106.0.0 <107.0.0",
      registryDigest,
    },
    laws: [...definition.laws].sort(),
    allowedTools: ["command.simulate", "mcp.execute_command", "receipt.replay"],
    forbiddenOperations: ["direct-state-write", "history-rewrite", "authority-bypass"],
    requiredEvidence: ["typecheck", "law-coverage", "mutation-tests", "replay-equivalence", "compatibility", "mcp-conformance"],
    ...(hasDeclarativeMatrix ? { operationAuthorityMatrix } : {}),
  };
  const files: ReceizGeneratedDomainFile[] = [
    {
      path: `${root}/contract.generated.ts`, ownership: "receiz-generated",
      content: `// Generated by Receiz v${definition.version}. Do not edit.\nexport const receizDomainContract = ${stableJson(contract).trim()} as const;\n`,
    },
    {
      path: `${root}/commands.generated.ts`, ownership: "receiz-generated",
      content: `// Generated command-only mutation boundary.\nimport type { ReceizClaimedCommand } from "@receiz/sdk";\n\nexport const receizCommandNames = ${stableJson(definition.commands.map((command) => command.name).sort()).trim()} as const;\n${hasDeclarativeMatrix ? `export const receizDomainCommandAuthority = ${stableJson(Object.fromEntries(definition.commands.map((command) => [command.name, { ...commandExecutionTemplate, operation: command.name, authorityTemplate: "admission.command.execute" }]))).trim()} as const;\n` : ""}\nexport async function executeReceizDomainCommand(engine: { execute(value: unknown): Promise<unknown> }, command: ReceizClaimedCommand): Promise<unknown> {\n  if (!(receizCommandNames as readonly string[]).includes(command.command)) throw new Error("DOMAIN_COMMAND_UNKNOWN");\n  return engine.execute(command);\n}\n`,
    },
    {
      path: `${root}/events.generated.ts`, ownership: "receiz-generated",
      content: `// Generated immutable event declarations.\nexport const receizEventSchemas = ${stableJson(Object.fromEntries(definition.events.map((event) => [event.name, event.payloadSchema]))).trim()} as const;\n`,
    },
    {
      path: `${root}/laws.generated.ts`, ownership: "receiz-generated",
      content: `// Generated registry-bound law context.\nexport const receizLawBinding = ${stableJson({ registryDigest, laws: [...definition.laws].sort(), maxOperations: definition.performance.maxLawOperations, ...(definition.lawfulActionValue ? { lawfulActionValue: definition.lawfulActionValue } : {}), ...(hasDeclarativeMatrix ? { operationAuthorityMatrix } : {}) }).trim()} as const;\n`,
    },
    {
      path: `${root}/projections.generated.ts`, ownership: "receiz-generated",
      content: `// Generated pure projection declarations; mutation remains inside command admission.\nexport const receizProjectionBindings = ${stableJson(definition.projections).trim()} as const;\nexport function projectAdmittedEvent<State>(state: State, _event: unknown): State { return structuredClone(state); }\n`,
    },
    {
      path: `${root}/migrations.generated.ts`, ownership: "receiz-generated",
      content: `// Generated append-preserving migration declarations.\nexport const receizMigrations = ${stableJson(definition.migrations).trim()} as const;\nexport const migrationMayRewriteWitnessedHistory = false as const;\n`,
    },
    {
      path: `${root}/mcp.generated.ts`, ownership: "receiz-generated",
      content: `// Generated constitutional context injected before MCP planning or execution.\nexport const receizMcpContext = ${stableJson({ registryDigest, laws: [...definition.laws].sort(), authorityProfile: definition.authorityProfile, allowedCommands: definition.commands.map((command) => command.name).sort(), forbiddenMutations: ["direct-state-write", "history-rewrite", "authority-bypass", "developer-declared-phi"], requiredVerification: manifest.requiredEvidence, ...(definition.lawfulActionValue ? { lawfulActionValue: definition.lawfulActionValue, mutationPath: ["sdk.action.proof.verify", "sdk.action.admit", "sdk.action.value-head.derive", "sdk.action.settlement.execute"] } : {}), ...(hasDeclarativeMatrix ? { operationAuthorityMatrix } : {}) }).trim()} as const;\n`,
    },
    { path: `${root}/skill.manifest.json`, ownership: "receiz-generated", content: stableJson(manifest) },
    ...(definition.lawfulActionValue ? [{
      path: `${root}/lawful-action.generated.ts`, ownership: "receiz-generated" as const,
      content: `// Generated v125 lawful-action binding. This projection is not authority.\nexport const receizLawfulActionValueBinding = ${stableJson({
        schema: "receiz.domain.lawful-action-binding.v125",
        ...definition.lawfulActionValue,
        registryDigest,
        registrationRequiresSealedProof: true,
        enclosingProofVerifiedFirst: true,
        developerMayDeclarePhiAmount: false,
        institutionReceivesProofExemption: false,
        oneSpendableMembership: true,
        executionRail: "settlement",
        strongerTruth: "sealed-receiz-proof-object",
      }).trim()} as const;\n`,
    }] : []),
    {
      path: `${root}/conformance.generated.test.ts`, ownership: "receiz-generated",
      content: `import assert from "node:assert/strict";\nimport test from "node:test";\nimport { receizCommandNames } from "./commands.generated.js";\nimport { receizLawBinding } from "./laws.generated.js";\n\ntest("${definition.domain} generated constitutional contract", () => {\n  assert.ok(receizCommandNames.length > 0);\n  assert.equal(receizLawBinding.registryDigest, "${registryDigest}");\n${hasDeclarativeMatrix ? `  assert.equal(receizLawBinding.operationAuthorityMatrix.length, ${operationAuthorityMatrix.length});\n  assert.equal(receizLawBinding.operationAuthorityMatrix[0].compatibleSdkRange, "${compatibleSdkRange}");\n` : ""}});\n`,
    },
    {
      path: `${root}/domain.mmd`, ownership: "receiz-generated",
      content: `flowchart LR\n  Skill["AI skill"] --> MCP["MCP constitutional context"]\n  MCP --> SDK["SDK command admission"]\n  SDK --> Events["Immutable events"]\n  Events --> Projection["Deterministic projection"]\n  SDK --> Verifier["Independent verifier"]\n`,
    },
    {
      path: `${root}/README.md`, ownership: "receiz-generated",
      content: `# ${definition.aggregate.name}\n\nRegistry: \`${registryDigest}\`\n\nAll state changes enter through Receiz command admission. Sealed Receiz proof objects remain stronger truth than generated code, MCP context, receipts, projections, or database state.\n`,
    },
    {
      path: `${root}/receiz.extensions.ts`, ownership: "developer-extension",
      content: `// Developer-owned extension boundary. The compiler must never overwrite this file.\nexport const receizDomainExtensions = {} as const;\n`,
    },
  ];
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

export async function compileReceizDomain(
  definition: ReceizDomainDefinition,
  context: Readonly<{ registry: ReceizConstitutionRegistry }>,
): Promise<ReceizDomainCompilation> {
  validateDefinition(definition, context.registry);
  const registryDigest = await digestReceizConstitution(context.registry);
  const files = generatedFiles(definition, registryDigest);
  const implementationContract: ReceizDomainCompilation["implementationContract"] = {
    sourceOfTruth: "sealed-receiz-proof-object",
    allowedMutations: ["receiz-command-admission"],
    forbiddenOperations: ["direct-state-write", "history-rewrite", "authority-bypass"],
    applicableLaws: [...definition.laws].sort(),
    authorityProfile: definition.authorityProfile,
    requiredEvidence: ["typecheck", "law-coverage", "mutation-tests", "replay-equivalence", "compatibility", "mcp-conformance"],
    completionRule: "verification-must-pass",
    ...(definition.version === "127.0.0" ? { operationAuthorityMatrix: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX } : definition.version === "126.0.0" ? { operationAuthorityMatrix: RECEIZ_V126_APPLICATION_OPERATION_MATRIX } : definition.version === "125.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V125_APPLICATION_OPERATION_MATRIX }
      : definition.version === "124.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V124_APPLICATION_OPERATION_MATRIX }
      : definition.version === "123.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V123_APPLICATION_OPERATION_MATRIX }
      : definition.version === "122.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V122_APPLICATION_OPERATION_MATRIX }
      : definition.version === "121.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V121_APPLICATION_OPERATION_MATRIX }
      : definition.version === "120.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V120_APPLICATION_OPERATION_MATRIX }
      : definition.version === "119.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V119_APPLICATION_OPERATION_MATRIX }
      : definition.version === "118.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V118_APPLICATION_OPERATION_MATRIX }
      : definition.version === "117.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V117_APPLICATION_OPERATION_MATRIX }
      : definition.version === "116.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V116_APPLICATION_OPERATION_MATRIX }
      : definition.version === "115.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V115_APPLICATION_OPERATION_MATRIX }
      : definition.version === "114.0.0"
      ? { operationAuthorityMatrix: RECEIZ_V114_APPLICATION_OPERATION_MATRIX }
      : definition.version === "113.0.0"
        ? { operationAuthorityMatrix: RECEIZ_V113_APPLICATION_OPERATION_MATRIX }
        : definition.version === "112.0.0"
          ? { operationAuthorityMatrix: RECEIZ_V112_APPLICATION_OPERATION_MATRIX }
          : {}),
    ...(definition.lawfulActionValue ? {
      lawfulActionValue: {
        actionLawId: definition.lawfulActionValue.actionLawId,
        registrationRequiresSealedProof: true,
        developerMayDeclarePhiAmount: false,
        institutionReceivesProofExemption: false,
        executionRail: "settlement",
      },
    } : {}),
  };
  const basis = {
    schema: "receiz.domain.compilation.v1",
    version: definition.version,
    domain: definition.domain,
    registryDigest,
    definition,
    implementationContract,
    files,
  };
  return {
    schema: "receiz.domain.compilation.v1",
    version: definition.version,
    domain: definition.domain,
    registryDigest,
    compilationDigest: await digestReceizConstitution(basis),
    implementationContract,
    files,
  };
}
