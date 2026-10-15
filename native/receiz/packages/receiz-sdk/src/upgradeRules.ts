import type { ReceizIntegrationDisposition, ReceizIntegrationRisk } from "./appCompiler.js";

export type ReceizUpgradeAction = Readonly<{
  code: string;
  path: string;
  disposition: ReceizIntegrationDisposition;
  risk: ReceizIntegrationRisk;
  explanation: string;
  destructive: boolean;
  manualReview: boolean;
  before?: string;
  after?: string;
}>;

export type ReceizCompilerImportMigration = Readonly<{
  path: string;
  disposition: "safe_automatic_change" | "user_decision_required";
  before: string;
  after: string | null;
  compilerNames: readonly string[];
  runtimeNames: readonly string[];
}>;

const COMPILER_EXPORTS = new Set([
  "RECEIZ_APP_CONTRACT_SCHEMA",
  "RECEIZ_APP_FEATURES",
  "RECEIZ_APP_FRAMEWORKS",
  "RECEIZ_V112_APP_CLIENT_SURFACES",
  "RECEIZ_V112_APP_COMPATIBLE_SDK_RANGE",
  "RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES",
  "RECEIZ_V112_APPLICATION_OPERATION_MATRIX",
  "RECEIZ_V112_APPLICATION_OPERATIONS",
  "RECEIZ_V113_APP_COMPATIBLE_SDK_RANGE",
  "RECEIZ_V113_APPLICATION_OPERATION_MATRIX",
  "RECEIZ_V113_APPLICATION_OPERATION_MATRIX_DIGEST",
  "RECEIZ_V113_APPLICATION_OPERATIONS",
  "RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX",
  "RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST",
  "RECEIZ_FRAMEWORK_ADAPTERS",
  "ReceizAppCompilerContext",
  "ReceizAppContract",
  "ReceizAppContractValidationIssue",
  "ReceizAppContractValidationResult",
  "ReceizAppFeature",
  "ReceizAppFramework",
  "ReceizAppIntegrationPlan",
  "ReceizAppOperationAuthorityDeclaration",
  "ReceizAppOperationInputAuthority",
  "ReceizAppOperationNamespacePolicy",
  "ReceizAppOperationOutputAuthority",
  "ReceizAppOperationProcessBoundary",
  "ReceizAppOperationRequiredEvidence",
  "ReceizApplyResult",
  "ReceizEnvironmentRequirement",
  "ReceizFileChange",
  "ReceizFrameworkAdapter",
  "ReceizGeneratedFile",
  "ReceizInstalledVersions",
  "ReceizIntegrationCheck",
  "ReceizIntegrationDisposition",
  "ReceizIntegrationFinding",
  "ReceizIntegrationPreview",
  "ReceizIntegrationRisk",
  "ReceizProjectInput",
  "ReceizProjectInspection",
  "ReceizUpgradeAction",
  "ReceizUpgradePlan",
  "applyReceizIntegrationPreview",
  "checkReceizIntegration",
  "compileReceizAppContract",
  "createReceizIntegrationPreview",
  "defineReceizApp",
  "explainReceizIntegrationFinding",
  "generateNextjsAppRouterFiles",
  "generateReceizFrameworkFiles",
  "inspectReceizProject",
  "planReceizIntegration",
  "planReceizUpgrade",
  "receizPackageUpgradeAction",
  "validateReceizAppContract",
]);

function importedName(specifier: string): string | null {
  const normalized = specifier.replace(/^type\s+/, "").trim();
  const name = normalized.split(/\s+as\s+/)[0]?.trim();
  return name && /^[A-Za-z_$][\w$]*$/.test(name) ? name : null;
}

export function receizCompilerImportMigrations(path: string, source: string): ReceizCompilerImportMigration[] {
  const migrations: ReceizCompilerImportMigration[] = [];
  const namedImport = /import\s*\{([\s\S]*?)\}\s*from\s*(["'])@receiz\/sdk\2\s*;?/g;
  for (const match of source.matchAll(namedImport)) {
    const before = match[0].trim();
    const body = match[1] ?? "";
    const quote = match[2] ?? '"';
    const specifiers = body.split(",").map((value) => value.trim()).filter(Boolean);
    if (specifiers.length === 0 || specifiers.some((value) => importedName(value) === null || value.includes("/*") || value.includes("//"))) {
      migrations.push({ path, disposition: "user_decision_required", before, after: null, compilerNames: [], runtimeNames: [] });
      continue;
    }
    const compiler = specifiers.filter((value) => COMPILER_EXPORTS.has(importedName(value) ?? ""));
    if (compiler.length === 0) continue;
    const runtime = specifiers.filter((value) => !COMPILER_EXPORTS.has(importedName(value) ?? ""));
    const after = runtime.length === 0
      ? before.replace(`${quote}@receiz/sdk${quote}`, `${quote}@receiz/sdk/compiler${quote}`)
      : [
          `import { ${runtime.join(", ")} } from ${quote}@receiz/sdk${quote};`,
          `import { ${compiler.join(", ")} } from ${quote}@receiz/sdk/compiler${quote};`,
        ].join("\n");
    migrations.push({
      path,
      disposition: "safe_automatic_change",
      before,
      after,
      compilerNames: compiler.map((value) => importedName(value) as string),
      runtimeNames: runtime.map((value) => importedName(value) as string),
    });
  }

  const ambiguousImport = /(?:import\s+(?:\*\s+as\s+\w+|[A-Za-z_$][\w$]*)\s+from\s*|import\s*\()(["'])@receiz\/sdk\1/g;
  for (const match of source.matchAll(ambiguousImport)) {
    migrations.push({
      path,
      disposition: "user_decision_required",
      before: match[0],
      after: null,
      compilerNames: [],
      runtimeNames: [],
    });
  }
  return migrations;
}

export function receizCompilerImportUpgradeAction(migration: ReceizCompilerImportMigration): ReceizUpgradeAction {
  return {
    code: "migrate_compiler_import",
    path: migration.path,
    disposition: migration.disposition,
    risk: migration.disposition === "safe_automatic_change" ? "low" : "medium",
    explanation: migration.after
      ? "Move Node-only app compiler symbols to @receiz/sdk/compiler while preserving universal runtime imports."
      : "Review the ambiguous SDK import and move only Node-only compiler symbols to @receiz/sdk/compiler.",
    destructive: false,
    manualReview: migration.disposition !== "safe_automatic_change",
    before: migration.before,
    ...(migration.after ? { after: migration.after } : {}),
  };
}

export function receizPackageUpgradeAction(targetVersion: string): ReceizUpgradeAction {
  return {
    code: "upgrade_receiz_packages",
    path: "package.json",
    disposition: "safe_automatic_change",
    risk: "low",
    explanation: `Align @receiz/sdk, @receiz/mcp-server, and @receiz/ai-skills with ${targetVersion}.`,
    destructive: false,
    manualReview: false,
  };
}
