import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  compileReceizAppContract,
  type ReceizAppIntegrationPlan,
  type ReceizIntegrationDisposition,
  type ReceizIntegrationFinding,
  type ReceizIntegrationRisk,
} from "./appCompiler.js";
import { validateReceizAppContract, type ReceizAppContract } from "./appContract.js";
import {
  receizCompilerImportMigrations,
  receizCompilerImportUpgradeAction,
  receizPackageUpgradeAction,
  type ReceizCompilerImportMigration,
  type ReceizUpgradeAction,
} from "./upgradeRules.js";
import { RECEIZ_RELEASE_VERSION } from "./releaseIdentity.js";
import { generateReceizFrameworkFiles } from "./frameworkAdapters.js";
import {
  runReceizConformance,
  type ReceizConformanceCheckId,
  type ReceizConformanceReport,
} from "./conformance.js";

export type ReceizInstalledVersions = Readonly<{
  sdk: string | null;
  mcp: string | null;
  aiSkills: string | null;
}>;

export type ReceizProjectInput = Readonly<{
  root: string;
  contractPath?: string;
  targetSdkVersion?: string;
}>;

export type ReceizProjectInspection = Readonly<{
  schema: "receiz.project.inspection.v1";
  root: string;
  targetSdkVersion: string;
  contractPath: string | null;
  contract: ReceizAppContract | null;
  installedVersions: ReceizInstalledVersions;
  findings: readonly ReceizIntegrationFinding[];
  compilerImportMigrations: readonly ReceizCompilerImportMigration[];
  inspectedFiles: readonly string[];
  authority: Readonly<{
    inspectionIsVerification: false;
    strongerTruth: "sealed-receiz-proof-object";
    existingWitnessedHistoryMutable: false;
  }>;
}>;

export type ReceizIntegrationCheck = Readonly<{
  ok: boolean;
  schema: "receiz.integration.check.v1";
  inspection: ReceizProjectInspection;
  blockingFindings: readonly ReceizIntegrationFinding[];
}>;

export type ReceizAppConformance = Readonly<{
  schema: "receiz.app.conformance.v126";
  ok: boolean;
  inspection: ReceizProjectInspection;
  conformance: ReceizConformanceReport;
  blockingFindings: readonly ReceizIntegrationFinding[];
  authority: Readonly<{
    qualificationIsVerification: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizAppQualification = Readonly<{
  schema: "receiz.app.qualification.v126";
  qualified: boolean;
  inspection: ReceizProjectInspection;
  conformance: ReceizConformanceReport;
  blockingFindings: readonly ReceizIntegrationFinding[];
  authority: Readonly<{
    qualificationIsVerification: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizUpgradePlan = Readonly<{
  schema: "receiz.app.upgrade_plan.v1";
  fromVersions: ReceizInstalledVersions;
  targetVersion: string;
  findings: readonly ReceizIntegrationFinding[];
  actions: readonly ReceizUpgradeAction[];
  authority: Readonly<{
    strongerTruth: "sealed-receiz-proof-object";
    existingWitnessedHistoryMutable: false;
  }>;
}>;

const SKIP_DIRECTORIES = new Set([".git", ".next", "build", "coverage", "dist", "node_modules", "out"]);
const TEXT_EXTENSIONS = new Set([".cjs", ".cts", ".js", ".json", ".jsx", ".md", ".mjs", ".mts", ".ts", ".tsx"]);
const AUTHORITY = "Inspection does not verify artifacts; sealed Receiz proof objects and native continuity remain stronger truth.";

function finding(
  code: string,
  disposition: ReceizIntegrationDisposition,
  risk: ReceizIntegrationRisk,
  summary: string,
  explanation: string,
  affectedFiles: readonly string[],
): ReceizIntegrationFinding {
  return { code, disposition, risk, summary, explanation, authorityBoundary: AUTHORITY, affectedFiles: [...affectedFiles].sort() };
}

function dependencyVersion(manifest: Record<string, unknown>, name: string): string | null {
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const group = manifest[key];
    if (typeof group === "object" && group !== null && !Array.isArray(group)) {
      const value = (group as Record<string, unknown>)[name];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

function versionNumber(range: string | null): string | null {
  if (!range) return null;
  const match = range.match(/\d+\.\d+\.\d+/);
  return match?.[0] ?? range;
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

async function repositoryRoot(input: string): Promise<string> {
  const absolute = resolve(input);
  let resolved: string;
  try {
    resolved = await realpath(absolute);
  } catch {
    throw new Error("receiz_repository_root_not_found");
  }
  if (!(await stat(resolved)).isDirectory()) throw new Error("receiz_repository_root_not_directory");
  return resolved;
}

async function projectFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (!isInside(root, path)) throw new Error("receiz_repository_path_escape");
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) {
        const target = await realpath(path);
        if (!isInside(root, target)) throw new Error("receiz_repository_symlink_escape");
        continue;
      }
      if (metadata.isDirectory()) await visit(path);
      else if (metadata.isFile() && metadata.size <= 1_000_000 && TEXT_EXTENSIONS.has(extname(entry.name))) files.push(path);
    }
  }
  await visit(root);
  return files;
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  const value = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`receiz_invalid_json_object:${basename(path)}`);
  return value as Record<string, unknown>;
}

function nonSatisfied(findings: readonly ReceizIntegrationFinding[]): ReceizIntegrationFinding[] {
  return findings.filter((item) => item.disposition !== "satisfied");
}

function normalizedUtf8Sha256(content: string): string {
  return createHash("sha256").update(content.replace(/\r\n?/g, "\n"), "utf8").digest("hex");
}

function normalizedGeneratedText(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

function generatedFileHashRows(value: unknown): ReadonlyMap<string, string> | null {
  if (!Array.isArray(value)) return null;
  const rows = new Map<string, string>();
  for (const row of value) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
    const path = (row as Record<string, unknown>).path;
    const digest = (row as Record<string, unknown>).digest;
    if (typeof path !== "string" || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest) || rows.has(path)) return null;
    rows.set(path, digest);
  }
  return rows;
}

function generatedManifestMatches(expected: Record<string, unknown>, actual: Record<string, unknown>): boolean {
  const expectedKeys = Object.keys(expected).sort();
  if (JSON.stringify(Object.keys(actual).sort()) !== JSON.stringify(expectedKeys)) return false;
  return expectedKeys
    .filter((key) => key !== "generatedFiles")
    .every((key) => JSON.stringify(actual[key]) === JSON.stringify(expected[key]));
}

async function inspectFrameworkNeutralGeneratedOutput(input: Readonly<{
  root: string;
  files: readonly string[];
  contract: ReceizAppContract;
  generated: Record<string, unknown>;
  generatedText: string | null;
}>): Promise<ReceizIntegrationFinding[]> {
  const expectedFiles = generateReceizFrameworkFiles(input.contract);
  const expectedManifestFile = expectedFiles.find((file) => file.path === "receiz.generated.json");
  if (!expectedManifestFile) throw new Error("receiz_framework_neutral_manifest_required");
  const expectedManifest = JSON.parse(expectedManifestFile.content) as Record<string, unknown>;
  const actualRows = generatedFileHashRows(input.generated.generatedFiles);
  const expectedRows = generatedFileHashRows(expectedManifest.generatedFiles);
  const findings: ReceizIntegrationFinding[] = [];

  if (!generatedManifestMatches(expectedManifest, input.generated) || actualRows === null || expectedRows === null) {
    findings.push(finding(
      "framework_neutral_generated_manifest_flags_invalid",
      "unsafe_or_incompatible",
      "critical",
      "The framework-neutral generated manifest does not bind the approved v126 contract.",
      "Regenerate the deterministic framework-neutral integration; manifest projection must retain exact v126 flags beneath sealed Receiz proof-object authority.",
      ["receiz.generated.json"],
    ));
    return findings;
  }

  if (input.generatedText === null
    || normalizedGeneratedText(input.generatedText) !== normalizedGeneratedText(expectedManifestFile.content)) {
    findings.push(finding(
      "framework_neutral_generated_manifest_noncanonical",
      "unsafe_or_incompatible",
      "critical",
      "The framework-neutral generated manifest is not the canonical v126 projection.",
      "Regenerate the manifest exactly; reordered or reformatted generated projection text cannot qualify even when parsed fields are semantically equal.",
      ["receiz.generated.json"],
    ));
    return findings;
  }

  if (actualRows.size !== expectedRows.size) {
    findings.push(finding(
      "framework_neutral_generated_manifest_hash_invalid",
      "unsafe_or_incompatible",
      "critical",
      "The framework-neutral manifest does not carry the approved generated-file hashes.",
      "Regenerate the deterministic framework-neutral integration; manifest file hashes must remain bound to the approved generated inventory.",
      ["receiz.generated.json"],
    ));
    return findings;
  }
  for (const [path, digest] of expectedRows) {
    if (actualRows.get(path) !== digest) {
      findings.push(finding(
        "framework_neutral_generated_manifest_hash_invalid",
        "unsafe_or_incompatible",
        "critical",
        "The framework-neutral manifest does not carry the approved generated-file hashes.",
        "Regenerate the deterministic framework-neutral integration; manifest file hashes must remain bound to the approved generated inventory.",
        ["receiz.generated.json"],
      ));
      return findings;
    }
  }

  for (const file of expectedFiles.filter((item) => item.ownership === "receiz-generated" && item.path !== "receiz.generated.json")) {
    if (!input.files.includes(file.path)) {
      findings.push(finding(
        "framework_neutral_generated_file_missing",
        "unsafe_or_incompatible",
        "critical",
        "A required framework-neutral generated file is missing.",
        "Restore the deterministic Receiz-generated file; developer-owned extension files remain outside this generated-file requirement.",
        [file.path],
      ));
      continue;
    }
    const actualContent = await readFile(join(input.root, file.path), "utf8");
    const expectedDigest = actualRows.get(file.path);
    if (expectedDigest !== normalizedUtf8Sha256(actualContent)) {
      findings.push(finding(
        "framework_neutral_generated_file_hash_mismatch",
        "unsafe_or_incompatible",
        "critical",
        "A framework-neutral generated file no longer matches its deterministic manifest hash.",
        "Regenerate the Receiz-owned file from the approved contract; do not rewrite developer-owned extension files or witnessed proof history.",
        [file.path],
      ));
    }
  }
  return findings;
}

export async function inspectReceizProject(input: ReceizProjectInput): Promise<ReceizProjectInspection> {
  const root = await repositoryRoot(input.root);
  const targetSdkVersion = input.targetSdkVersion ?? RECEIZ_RELEASE_VERSION;
  const files = await projectFiles(root);
  const relativeFiles = files.map((path) => relative(root, path).split(sep).join("/"));
  const packagePath = join(root, "package.json");
  const packageManifest = relativeFiles.includes("package.json") ? await readJson(packagePath) : {};
  const rawVersions: ReceizInstalledVersions = {
    sdk: dependencyVersion(packageManifest, "@receiz/sdk"),
    mcp: dependencyVersion(packageManifest, "@receiz/mcp-server"),
    aiSkills: dependencyVersion(packageManifest, "@receiz/ai-skills"),
  };
  const installedVersions: ReceizInstalledVersions = {
    sdk: versionNumber(rawVersions.sdk),
    mcp: versionNumber(rawVersions.mcp),
    aiSkills: versionNumber(rawVersions.aiSkills),
  };

  const requestedContractPath = input.contractPath ?? "receiz.app.json";
  const absoluteContractPath = resolve(root, requestedContractPath);
  if (!isInside(root, absoluteContractPath)) throw new Error("receiz_contract_path_escape");
  let contract: ReceizAppContract | null = null;
  const findings: ReceizIntegrationFinding[] = [];
  if (relativeFiles.includes(relative(root, absoluteContractPath).split(sep).join("/"))) {
    const result = validateReceizAppContract(await readJson(absoluteContractPath));
    if (result.ok) {
      contract = result.value;
      if (result.value.framework === "framework-neutral" && targetSdkVersion !== RECEIZ_RELEASE_VERSION) {
        findings.push(finding(
          "framework_neutral_target_requires_current",
          "unsafe_or_incompatible",
          "critical",
          "Framework-neutral generation is bound to the exact current Receiz v126 release.",
          `Use ${RECEIZ_RELEASE_VERSION}; framework-neutral output cannot be generated, checked, conformed, or qualified as ${targetSdkVersion}.`,
          [requestedContractPath],
        ));
      }
      if (targetSdkVersion === RECEIZ_RELEASE_VERSION && result.value.operations === undefined) {
        findings.push(finding(
          "app_contract_v125_matrix_missing",
          "unsafe_or_incompatible",
          "critical",
          "The current Receiz app contract is missing the v126 operation authority matrix.",
          "Declare the complete exact v126 operation authority matrix; current authority cannot be inferred from a historical matrix-free contract.",
          [requestedContractPath],
        ));
      }
      if (targetSdkVersion === "112.0.0" && result.value.operations === undefined) {
        findings.push(finding(
          "app_contract_v112_matrix_missing",
          "unsafe_or_incompatible",
          "critical",
          "The current Receiz app contract is missing the v112 operation authority matrix.",
          "Declare the complete exact nine-operation v112 authority matrix; current authority cannot be inferred from a historical matrix-free contract.",
          [requestedContractPath],
        ));
      }
    }
    else findings.push(finding("app_contract_invalid", "unsafe_or_incompatible", "high", "Receiz app contract is invalid.", result.issues.map((issue) => issue.message).join(" "), [requestedContractPath]));
  } else {
    findings.push(finding("app_contract_missing", "safe_automatic_change", "low", "Receiz app contract is missing.", "Create receiz.app.json from an approved starter contract.", [requestedContractPath]));
  }

  const present = Object.values(installedVersions).filter((value): value is string => value !== null);
  if (present.length !== 3 || new Set(present).size !== 1) {
    findings.push(finding("package_version_mismatch", "safe_automatic_change", "medium", "Receiz package versions are not aligned.", `SDK, MCP, and AI skills must align with ${targetSdkVersion}.`, ["package.json"]));
  }
  if (Object.values(rawVersions).some((value) => value?.startsWith("workspace:"))) {
    findings.push(finding("workspace_dependency_leak", "unsafe_or_incompatible", "high", "A registry dependency uses the workspace protocol.", "Replace workspace: ranges before packing or publishing.", ["package.json"]));
  }
  if (present.some((version) => version !== targetSdkVersion)) {
    findings.push(finding("package_version_outdated", "safe_automatic_change", "low", `Receiz packages are not at ${targetSdkVersion}.`, "Upgrade approved package manifest fields without rewriting proof history.", ["package.json"]));
  }

  const generatedPath = join(root, "receiz.generated.json");
  const hasGeneratedManifest = relativeFiles.includes("receiz.generated.json");
  const generatedText = hasGeneratedManifest ? await readFile(generatedPath, "utf8") : null;
  const generated = hasGeneratedManifest ? await readJson(generatedPath) : {};
  if (contract?.framework === "framework-neutral"
    && targetSdkVersion === RECEIZ_RELEASE_VERSION
    && contract.operations !== undefined) {
    findings.push(...await inspectFrameworkNeutralGeneratedOutput({ root, files: relativeFiles, contract, generated, generatedText }));
  }
  const sourceFiles = files.filter((path) => path !== packagePath && path !== absoluteContractPath && path !== generatedPath);
  const sources = await Promise.all(sourceFiles.map(async (path) => ({ path: relative(root, path).split(sep).join("/"), text: await readFile(path, "utf8") })));
  const compilerImportMigrations = sources.flatMap((source) => receizCompilerImportMigrations(source.path, source.text));
  const combined = sources.map((source) => source.text).join("\n");
  const affected = (pattern: RegExp) => sources.filter((source) => pattern.test(source.text)).map((source) => source.path);

  const deprecated = affected(/createReceizPortableAssetDocument|receiz_verify_asset|receiz_verify_offline_file/);
  if (deprecated.length) findings.push(finding("deprecated_api", "manual_implementation_required", "medium", "Deprecated Receiz API usage detected.", "Replace deprecated imports or tools with the documented compiler and verification rails.", deprecated));
  const bypass = affected(/createReceizClient\s*\(/);
  if (bypass.length && generated.adapterCreated !== true) findings.push(finding("direct_sdk_adapter_bypass", "manual_implementation_required", "medium", "Direct SDK client creation bypasses the project adapter.", "Route application calls through the generated project adapter.", bypass));
  const mcpVerify = affected(/(?:verified|verification)\s*=.*mcp\.(?:inspect|resolve)|mcp\.(?:inspect|resolve).*\bverif/i);
  if (mcpVerify.length) findings.push(finding("mcp_inspection_claimed_as_verification", "unsafe_or_incompatible", "critical", "MCP inspection is claimed as proof verification.", "Verify byte-bearing artifacts through the SDK verifier; MCP remains inspection tooling.", mcpVerify));
  const weakAuthority = affected(/(?:database|db|cache|ui|model)(?:\.|\w)*.*(?:proofAuthority|sourceOfTruth)|(?:proofAuthority|sourceOfTruth)\s*=\s*(?:database|db|cache|ui|model)/i);
  if (weakAuthority.length) findings.push(finding("weak_state_used_as_proof_authority", "unsafe_or_incompatible", "critical", "Weaker application state is used as proof authority.", "Bind projections to verified sealed proof objects and rebuild incorrect projections.", weakAuthority));
  const artifactPayloadFallback = affected(/\b(?:sealed\w*|artifact\w*|remoteProof|proof\w*)\s*(?:\?\?|\|\|)\s*(?:originalPayload|portableBytes|payload\w*)\b/i);
  if (artifactPayloadFallback.length) findings.push(finding(
    "artifact_payload_fallback",
    "unsafe_or_incompatible",
    "critical",
    "Payload bytes are used as a fallback for a sealed Receiz artifact.",
    "Remove the fallback. Record or Seal failure must produce no artifact; download only the SDK-issued sealed artifact.",
    artifactPayloadFallback,
  ));
  const artifactAsDomainPayload = affected(/\b(?:verify|parse|decode)\w*(?:Payload|Png|Json|Domain)\w*\s*\(\s*(?:nativeArtifact|sealedArtifact|artifact(?:Bytes)?)\b/i);
  if (artifactAsDomainPayload.length) findings.push(finding(
    "artifact_domain_parser_bypass",
    "unsafe_or_incompatible",
    "critical",
    "Complete artifact bytes are passed to a domain payload parser.",
    "Call SDK artifacts.verifyAndOpen first, then pass only verifiedPayload bytes to the domain parser.",
    artifactAsDomainPayload,
  ));
  const downloadOriginalOnFailure = affected(/catch\s*(?:\([^)]*\))?\s*\{[\s\S]{0,500}\bdownload\s*\(\s*(?:originalPayload|portableBytes|payload\w*)\b/i);
  if (downloadOriginalOnFailure.length) findings.push(finding(
    "artifact_download_original_on_failure",
    "unsafe_or_incompatible",
    "critical",
    "A failed Record or Seal path downloads original payload bytes.",
    "Propagate the SDK failure. No payload may be downloaded or relabeled as a Receiz artifact when Record, Seal, or verification fails.",
    downloadOriginalOnFailure,
  ));
  const manualArtifactBlobRepack = affected(/new\s+Blob\s*\(\s*\[\s*(?:sealed|artifact)\w*\s*\]\s*,\s*\{[\s\S]{0,180}\btype\s*:/i);
  if (manualArtifactBlobRepack.length) findings.push(finding(
    "artifact_manual_blob_relabel",
    "unsafe_or_incompatible",
    "critical",
    "Native artifact bytes are manually repacked with caller-selected metadata.",
    "Keep the SDK-issued artifact Blob, filename, and MIME type together; use artifacts.download without wrapping or relabeling bytes.",
    manualArtifactBlobRepack,
  ));
  const artifactShapeClaimedVerified = affected(/\b(?:verified|verification)\s*=\s*(?:inspect|check|parse|decode|is)\w*(?:Artifact)?(?:Shape|Structure|Kind|Schema)?\w*\s*\(\s*(?:artifact|sealed|nativeArtifact)/i);
  if (artifactShapeClaimedVerified.length) findings.push(finding(
    "artifact_shape_claimed_verified",
    "unsafe_or_incompatible",
    "critical",
    "Artifact shape inspection is claimed as proof verification.",
    "Call SDK verification.verifyArtifact or artifacts.verifyAndOpen on the complete enclosing bytes; structure alone cannot verify proof.",
    artifactShapeClaimedVerified,
  ));
  const artifactPlanClaimedSealed = affected(/\b(?:sealedArtifact|sealed\w*)\s*=\s*(?:artifactPlan|plan\w*)\b/i);
  if (artifactPlanClaimedSealed.length) findings.push(finding(
    "artifact_plan_claimed_sealed",
    "unsafe_or_incompatible",
    "critical",
    "A read-only artifact plan is claimed as a sealed artifact.",
    "Execute the registry-bound plan with its exact confirmation, then accept only the SDK-issued verified Record -> Seal artifact.",
    artifactPlanClaimedSealed,
  ));
  const browserSecret = affected(/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY|RECOVERY)/);
  if (browserSecret.length) findings.push(finding("server_secret_exposed_to_browser", "unsafe_or_incompatible", "critical", "Server credential name is exposed to browser code.", "Move credentials to server-only environment declarations and rotate exposed material.", browserSecret));
  const safeCompilerImports = compilerImportMigrations.filter((migration) => migration.disposition === "safe_automatic_change");
  if (safeCompilerImports.length) {
    findings.push(finding(
      "compiler_import_must_use_node_entrypoint",
      "safe_automatic_change",
      "low",
      "Node-only compiler imports must use @receiz/sdk/compiler.",
      "Split compiler symbols from universal runtime imports using the exact proposed source replacements.",
      safeCompilerImports.map((migration) => migration.path),
    ));
  }
  const ambiguousCompilerImports = compilerImportMigrations.filter((migration) => migration.disposition === "user_decision_required");
  if (ambiguousCompilerImports.length) {
    findings.push(finding(
      "compiler_import_requires_manual_migration",
      "user_decision_required",
      "medium",
      "An ambiguous SDK import may contain Node-only compiler symbols.",
      "Review default, namespace, or dynamic imports and move compiler symbols to @receiz/sdk/compiler.",
      ambiguousCompilerImports.map((migration) => migration.path),
    ));
  }

  if (contract?.features.includes("webhooks") && generated.webhookVerification !== true && !/verifyReceizWebhookSignature|parseReceizWebhookRequest/.test(combined)) {
    findings.push(finding("webhook_verification_missing", "manual_implementation_required", "high", "Webhook verification is missing.", "Verify every webhook before parsing or projection.", ["receiz.generated.json"]));
  }
  if (/\.(?:publish|create|update|delete|transfer|seal|record)\s*\(/.test(combined) && generated.idempotency !== true && !/idempotencyKey/.test(combined)) {
    findings.push(finding("idempotency_key_missing", "manual_implementation_required", "high", "A generated mutation lacks idempotency.", "Every mutation must carry a stable idempotency key.", affected(/\.(?:publish|create|update|delete|transfer|seal|record)\s*\(/)));
  }
  if (contract?.features.includes("proofMemory") && generated.proofMemoryPersistence !== "durable" && !/createReceizProofMemory/.test(combined)) {
    findings.push(finding("proof_memory_persistence_missing", "manual_implementation_required", "high", "Durable proof-memory persistence is missing.", "Persist first admission and append verified additions after the known head.", ["receiz.generated.json"]));
  }
  if (contract?.features.includes("proof") && generated.continuityVerification !== true && !/verifyArtifact/.test(combined)) {
    findings.push(finding("continuity_verification_missing", "unsafe_or_incompatible", "critical", "Continuity-bound artifact verification is missing.", "Use SDK verifyArtifact so integrity, owner, namespace, and chain continuity remain indivisible.", ["receiz.generated.json"]));
  }

  if (contract && nonSatisfied(findings).length === 0) {
    findings.push(finding("integration_compliant", "satisfied", "none", "Receiz integration is compliant.", `The repository evidence satisfies the ${targetSdkVersion} contract without proposed changes.`, []));
  }
  findings.sort((left, right) => left.code.localeCompare(right.code) || left.affectedFiles.join().localeCompare(right.affectedFiles.join()));

  return {
    schema: "receiz.project.inspection.v1",
    root,
    targetSdkVersion,
    contractPath: contract ? relative(root, absoluteContractPath).split(sep).join("/") : null,
    contract,
    installedVersions,
    findings,
    compilerImportMigrations,
    inspectedFiles: relativeFiles,
    authority: { inspectionIsVerification: false, strongerTruth: "sealed-receiz-proof-object", existingWitnessedHistoryMutable: false },
  };
}

export async function checkReceizIntegration(input: ReceizProjectInput): Promise<ReceizIntegrationCheck> {
  const inspection = await inspectReceizProject(input);
  const blockingFindings = nonSatisfied(inspection.findings);
  return { ok: blockingFindings.length === 0, schema: "receiz.integration.check.v1", inspection, blockingFindings };
}

export async function runReceizAppConformance(input: ReceizProjectInput & Readonly<{
  failChecks?: readonly ReceizConformanceCheckId[];
}>): Promise<ReceizAppConformance> {
  const [inspection, conformance] = await Promise.all([
    inspectReceizProject(input),
    runReceizConformance(input.failChecks ? { failChecks: input.failChecks } : {}),
  ]);
  const conformanceTargetFindings = conformance.sdkVersion === inspection.targetSdkVersion ? [] : [finding(
    "sdk_conformance_target_mismatch",
    "unsafe_or_incompatible",
    "critical",
    "SDK conformance evidence does not match the inspected target.",
    `The SDK report is ${conformance.sdkVersion}, but the requested and inspected target is ${inspection.targetSdkVersion}; mismatched evidence cannot qualify this integration.`,
    [inspection.contractPath ?? "receiz.app.json", "package.json"],
  )];
  const blockingFindings = [...nonSatisfied(inspection.findings), ...conformanceTargetFindings]
    .sort((left, right) => left.code.localeCompare(right.code) || left.affectedFiles.join().localeCompare(right.affectedFiles.join()));
  return {
    schema: "receiz.app.conformance.v126",
    ok: blockingFindings.length === 0 && conformance.ok,
    inspection,
    conformance,
    blockingFindings,
    authority: { qualificationIsVerification: false, strongerTruth: "sealed-receiz-proof-object" },
  };
}

export async function qualifyReceizApp(input: ReceizProjectInput & Readonly<{
  failChecks?: readonly ReceizConformanceCheckId[];
}>): Promise<ReceizAppQualification> {
  const conformance = await runReceizAppConformance(input);
  return {
    schema: "receiz.app.qualification.v126",
    qualified: conformance.ok,
    inspection: conformance.inspection,
    conformance: conformance.conformance,
    blockingFindings: conformance.blockingFindings,
    authority: { qualificationIsVerification: false, strongerTruth: "sealed-receiz-proof-object" },
  };
}

export async function planReceizIntegration(input: ReceizProjectInput): Promise<ReceizAppIntegrationPlan> {
  const inspection = await inspectReceizProject(input);
  if (!inspection.contract) throw new Error("receiz_app_contract_required");
  const base = compileReceizAppContract(inspection.contract, {
    targetSdkVersion: inspection.targetSdkVersion,
    project: {
      installedVersions: {
        ...(inspection.installedVersions.sdk ? { sdk: inspection.installedVersions.sdk } : {}),
        ...(inspection.installedVersions.mcp ? { mcp: inspection.installedVersions.mcp } : {}),
        ...(inspection.installedVersions.aiSkills ? { aiSkills: inspection.installedVersions.aiSkills } : {}),
      },
    },
  });
  const required = nonSatisfied(inspection.findings);
  return {
    ...base,
    findings: inspection.findings,
    changes: required.map((item) => ({
      code: item.code,
      path: item.affectedFiles[0] ?? "receiz.app.json",
      disposition: item.disposition,
      explanation: item.explanation,
      destructive: false,
      manualReview: item.disposition !== "safe_automatic_change",
    })),
  };
}

export async function planReceizUpgrade(input: ReceizProjectInput & { targetSdkVersion: string }): Promise<ReceizUpgradePlan> {
  const inspection = await inspectReceizProject(input);
  const needsUpgrade = Object.values(inspection.installedVersions).some((version) => version !== input.targetSdkVersion);
  return {
    schema: "receiz.app.upgrade_plan.v1",
    fromVersions: inspection.installedVersions,
    targetVersion: input.targetSdkVersion,
    findings: inspection.findings,
    actions: [
      ...(needsUpgrade ? [receizPackageUpgradeAction(input.targetSdkVersion)] : []),
      ...inspection.compilerImportMigrations.map(receizCompilerImportUpgradeAction),
    ],
    authority: { strongerTruth: "sealed-receiz-proof-object", existingWitnessedHistoryMutable: false },
  };
}
