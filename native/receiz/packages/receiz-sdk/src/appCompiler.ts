import { RECEIZ_V126_APPLICATION_OPERATION_MATRIX, RECEIZ_V126_APPLICATION_OPERATION_MATRIX_DIGEST, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX, RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST } from "./appContract.js";
import {
  RECEIZ_OIDC_SCOPES_BY_RAIL,
  receizOidcScopesForRails,
  type ReceizRailScopeKey,
} from "./capabilities.js";
import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
import {
  RECEIZ_V112_APP_CLIENT_SURFACES,
  RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
  RECEIZ_V112_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V112_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V113_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V113_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V114_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V115_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V115_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V116_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V116_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V117_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V117_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V118_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V118_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V119_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V119_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V120_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V120_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V121_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V121_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V122_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V122_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V123_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V123_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V124_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V124_APPLICATION_OPERATION_MATRIX_DIGEST,
  RECEIZ_V125_APPLICATION_OPERATION_MATRIX,
  RECEIZ_V125_APPLICATION_OPERATION_MATRIX_DIGEST,
  validateReceizAppContract,
  type ReceizAppOperationAuthorityDeclaration,
  type ReceizAppContract,
  type ReceizAppFeature,
} from "./appContract.js";

export type ReceizIntegrationDisposition =
  | "satisfied"
  | "safe_automatic_change"
  | "user_decision_required"
  | "manual_implementation_required"
  | "blocked_missing_capability_or_authority"
  | "unsafe_or_incompatible";

export type ReceizIntegrationRisk = "none" | "low" | "medium" | "high" | "critical";

export type ReceizIntegrationFinding = Readonly<{
  code: string;
  disposition: ReceizIntegrationDisposition;
  risk: ReceizIntegrationRisk;
  summary: string;
  explanation: string;
  authorityBoundary: string;
  affectedFiles: readonly string[];
}>;

export type ReceizAppCompilerContext = Readonly<{
  targetSdkVersion?: string;
  project?: Readonly<{
    installedVersions?: Readonly<{
      sdk?: string;
      mcp?: string;
      aiSkills?: string;
    }>;
  }>;
}>;

export type ReceizEnvironmentRequirement = Readonly<{
  name: string;
  exposure: "server-only" | "public";
  secret: boolean;
  reason: string;
}>;

export type ReceizAppIntegrationPlan = Readonly<{
  schema: "receiz.app.integration_plan.v1";
  contract: ReceizAppContract;
  targetSdkVersion: string;
  requiredRails: readonly ReceizRailScopeKey[];
  requiredCapabilities: readonly string[];
  requiredScopes: readonly string[];
  environment: Readonly<{
    required: readonly ReceizEnvironmentRequirement[];
    optional: readonly ReceizEnvironmentRequirement[];
  }>;
  operations: Readonly<{
    public: readonly string[];
    delegated: readonly string[];
  }>;
  operationAuthorityMatrix?: readonly ReceizAppOperationAuthorityDeclaration[];
  operationAuthorityMatrixDigest?: string;
  clientSurfaces?: typeof RECEIZ_V112_APP_CLIENT_SURFACES;
  unavailableClientSurfaces?: typeof RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES;
  authority: Readonly<{
    strongerTruth: "sealed-receiz-proof-object";
    inspectionIsVerification: false;
    proofCreation: "authenticated-native-record-before-seal";
    profileUpdate: "neutral-admitted-same-account-uid";
    ownershipClaim: "complete-sealed-artifact-before-authenticated-owner-append";
    operationCompatibility: "current-v127-local-proof-creation" | "current-v126-source-continuity" | "current-v125-lawful-economy" | "current-v124-production-runtime" | "current-v123-universal-execution-authority" | "current-v122-remote-runtime" | "current-v120-living-subjects" | "current-v119-baseline" | "current-v118-baseline" | "current-v117-baseline" | "current-v116-baseline" | "current-v115-offline-proof-appends" | "current-v114-recursive-composites" | "current-v113-production-coordination" | "current-v112-declarative-authority" | "current-v111-native-composition" | "legacy-target";
    databaseAuthority: false;
    existingWitnessedHistoryMutable: false;
  }>;
  framework: Readonly<{
    adapter: string;
    requiredModules: readonly string[];
  }>;
  proofMemory: Readonly<{
    required: boolean;
    behavior: "first-admission-then-append-forever";
    offlineFirstPaint: boolean;
  }>;
  sandboxFixtures: readonly string[];
  conformanceTests: readonly string[];
  releaseTests: readonly string[];
  findings: readonly ReceizIntegrationFinding[];
  changes: readonly unknown[];
  verificationCommands: readonly string[];
  rollbackGuidance: readonly string[];
}>;

const FEATURE_RAILS: Record<ReceizAppFeature, readonly ReceizRailScopeKey[]> = {
  identity: ["identity"],
  proof: ["proofStore"],
  proofMemory: ["appState", "offline"],
  publicStore: ["publicStore"],
  commerce: ["commerce"],
  media: ["media"],
  webhooks: ["webhooks"],
  world: ["world"],
  subjects: ["subjects", "subjectTwin", "subjectMemory", "subjectMandates", "worldEvents", "worldCommands", "subjectRuntime", "subjectRelationships", "subjectInventory"],
};

const AUTHORITY_BOUNDARY = "Repository inspection does not verify artifacts; sealed Receiz proof objects remain stronger truth than planning output.";

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function environmentFor(contract: ReceizAppContract): ReceizAppIntegrationPlan["environment"] {
  const required: ReceizEnvironmentRequirement[] = [
    { name: "RECEIZ_BASE_URL", exposure: "server-only", secret: false, reason: "Canonical Receiz API origin." },
  ];
  if (contract.features.includes("identity")) {
    required.push(
      { name: "RECEIZ_CLIENT_ID", exposure: "server-only", secret: false, reason: "Receiz Connect application identity." },
      { name: "RECEIZ_CLIENT_SECRET", exposure: "server-only", secret: true, reason: "Delegated server credential; never expose to browser code." },
      { name: "RECEIZ_REDIRECT_URI", exposure: "server-only", secret: false, reason: "Receiz Connect callback URI." },
    );
  }
  if (contract.features.includes("webhooks")) {
    required.push({ name: "RECEIZ_WEBHOOK_SECRET", exposure: "server-only", secret: true, reason: "Verify webhook delivery before projection." });
  }
  required.sort((left, right) => left.name.localeCompare(right.name));
  return {
    required,
    optional: [{ name: "NEXT_PUBLIC_RECEIZ_BASE_URL", exposure: "public", secret: false, reason: "Optional browser-safe public proof origin." }],
  };
}

function versionFindings(context: ReceizAppCompilerContext, target: string): ReceizIntegrationFinding[] {
  const versions = context.project?.installedVersions;
  if (!versions) return [];
  const affectedFiles = ["package.json"];
  const outdated = Object.entries(versions)
    .filter(([, version]) => version !== undefined && version !== target)
    .map(([name, version]) => `${name}:${version}`)
    .sort();
  if (outdated.length === 0) {
    return [{
      code: "package_versions_aligned",
      disposition: "satisfied",
      risk: "none",
      summary: `Receiz packages are aligned at ${target}.`,
      explanation: `SDK, MCP, and AI-skills package evidence matches ${target}.`,
      authorityBoundary: AUTHORITY_BOUNDARY,
      affectedFiles,
    }];
  }
  return [{
    code: "package_version_outdated",
    disposition: "safe_automatic_change",
    risk: "low",
    summary: `Receiz package versions must be upgraded to ${target}.`,
    explanation: `Detected ${outdated.join(", ")}; update approved package.json dependency fields to ${target}.`,
    authorityBoundary: AUTHORITY_BOUNDARY,
    affectedFiles,
  }];
}

export function compileReceizAppContract(contract: ReceizAppContract, context: ReceizAppCompilerContext = {}): ReceizAppIntegrationPlan {
  const validated = validateReceizAppContract(contract);
  if (!validated.ok) throw new Error(validated.issues.map((issue) => `${issue.code}:${issue.path}`).join(","));
  const normalized = validated.value;
  const requiredRails = sortedUnique(normalized.features.flatMap((feature) => FEATURE_RAILS[feature])) as ReceizRailScopeKey[];
  const requiredScopes = sortedUnique(receizOidcScopesForRails(...requiredRails));
  const requiredCapabilities = sortedUnique(requiredRails.filter((rail) => rail in RECEIZ_OIDC_SCOPES_BY_RAIL));
  const targetSdkVersion = context.targetSdkVersion ?? RECEIZ_CURRENT_RELEASE_VERSION;
  const currentV127Operations = targetSdkVersion === RECEIZ_CURRENT_RELEASE_VERSION || /^127\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(targetSdkVersion);
  const currentV126Operations = /^126\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(targetSdkVersion);
  const currentV125Operations = /^125\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(targetSdkVersion);
  const currentV124Operations = /^124\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(targetSdkVersion);
  const currentV123Operations = targetSdkVersion === "123.0.0";
  const currentV122Operations = targetSdkVersion === "122.0.0";
  const currentV121Operations = targetSdkVersion === "121.0.0";
  const currentV120Operations = targetSdkVersion === "120.0.0";
  const currentV119Operations = targetSdkVersion === "119.0.0";
  const currentV118Operations = targetSdkVersion === "118.0.0";
  const currentV117Operations = targetSdkVersion === "117.0.0";
  const currentV116Operations = targetSdkVersion === "116.0.0";
  const currentV115Operations = targetSdkVersion === "115.0.0";
  const currentV114Operations = targetSdkVersion === "114.0.0";
  const currentV113Operations = targetSdkVersion === "113.0.0";
  const currentV112Operations = targetSdkVersion === "112.0.0";
  const currentV111Operations = targetSdkVersion === "111.0.0";
  if (currentV127Operations && normalized.operations !== RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX) throw new Error("V127_APPLICATION_OPERATION_MATRIX_REQUIRED");
  if (currentV126Operations && normalized.operations !== RECEIZ_V126_APPLICATION_OPERATION_MATRIX) throw new Error("V126_APPLICATION_OPERATION_MATRIX_REQUIRED");
  if (currentV125Operations && normalized.operations !== RECEIZ_V125_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V125_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV124Operations && normalized.operations !== RECEIZ_V124_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V124_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV123Operations && normalized.operations !== RECEIZ_V123_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V123_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV122Operations && normalized.operations !== RECEIZ_V122_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V122_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV121Operations && normalized.operations !== RECEIZ_V121_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V121_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV120Operations && normalized.operations !== RECEIZ_V120_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V120_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV119Operations && normalized.operations !== RECEIZ_V119_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V119_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV118Operations && normalized.operations !== RECEIZ_V118_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V118_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV117Operations && normalized.operations !== RECEIZ_V117_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V117_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV116Operations && normalized.operations !== RECEIZ_V116_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V116_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV115Operations && normalized.operations !== RECEIZ_V115_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V115_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV114Operations && normalized.operations !== RECEIZ_V114_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V114_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV113Operations && normalized.operations !== RECEIZ_V113_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V113_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  if (currentV112Operations && normalized.operations !== RECEIZ_V112_APPLICATION_OPERATION_MATRIX) {
    throw new Error("V112_APPLICATION_OPERATION_MATRIX_REQUIRED");
  }
  const hasIdentity = normalized.features.includes("identity");
  const hasProof = normalized.features.includes("proof");
  const proofMemoryRequired = normalized.features.includes("proofMemory");

  return {
    schema: "receiz.app.integration_plan.v1",
    contract: normalized,
    targetSdkVersion,
    requiredRails,
    requiredCapabilities,
    requiredScopes,
    environment: environmentFor(normalized),
    operations: currentV127Operations || currentV126Operations || currentV125Operations || currentV124Operations || currentV123Operations || currentV122Operations || currentV121Operations || currentV120Operations || currentV119Operations || currentV118Operations || currentV117Operations || currentV116Operations || currentV115Operations || currentV114Operations || currentV113Operations || currentV112Operations ? { public: [], delegated: [] } : {
      public: sortedUnique([
        "proof.verify",
        ...(normalized.features.includes("publicStore") ? ["publicStore.restore"] : []),
        ...(currentV111Operations && hasProof ? ["artifacts.verifyAndOpen", "artifacts.download", "artifacts.admit", "artifacts.planRecovery", "artifacts.admitAndRecover", "artifacts.commitRecovery"] : []),
      ]),
      delegated: sortedUnique([
        ...(hasProof && currentV111Operations
          ? ["assets.createProofObject", "ownership.claimBearerAsset"]
          : hasProof
            ? ["proof.record", "proof.seal"]
            : []),
        ...(normalized.features.includes("publicStore") ? ["publicStore.publish"] : []),
        ...(normalized.features.includes("commerce") ? ["commerce.checkout"] : []),
        ...(currentV111Operations && hasIdentity ? ["profile.update"] : []),
      ]),
    },
    ...(currentV127Operations ? { operationAuthorityMatrix: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX, operationAuthorityMatrixDigest: RECEIZ_CURRENT_APPLICATION_OPERATION_MATRIX_DIGEST } : currentV126Operations ? { operationAuthorityMatrix: RECEIZ_V126_APPLICATION_OPERATION_MATRIX, operationAuthorityMatrixDigest: RECEIZ_V126_APPLICATION_OPERATION_MATRIX_DIGEST } : currentV125Operations ? {
      operationAuthorityMatrix: RECEIZ_V125_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V125_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV124Operations ? {
      operationAuthorityMatrix: RECEIZ_V124_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V124_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV123Operations ? {
      operationAuthorityMatrix: RECEIZ_V123_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V123_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV122Operations ? {
      operationAuthorityMatrix: RECEIZ_V122_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V122_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV121Operations ? {
      operationAuthorityMatrix: RECEIZ_V121_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V121_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV120Operations ? {
      operationAuthorityMatrix: RECEIZ_V120_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V120_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV119Operations ? {
      operationAuthorityMatrix: RECEIZ_V119_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V119_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV118Operations ? {
      operationAuthorityMatrix: RECEIZ_V118_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V118_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV117Operations ? {
      operationAuthorityMatrix: RECEIZ_V117_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V117_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV116Operations ? {
      operationAuthorityMatrix: RECEIZ_V116_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V116_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV115Operations ? {
      operationAuthorityMatrix: RECEIZ_V115_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V115_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV114Operations ? {
      operationAuthorityMatrix: RECEIZ_V114_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V114_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV113Operations ? {
      operationAuthorityMatrix: RECEIZ_V113_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V113_APPLICATION_OPERATION_MATRIX_DIGEST,
    } : currentV112Operations ? {
      operationAuthorityMatrix: RECEIZ_V112_APPLICATION_OPERATION_MATRIX,
      operationAuthorityMatrixDigest: RECEIZ_V112_APPLICATION_OPERATION_MATRIX_DIGEST,
      clientSurfaces: RECEIZ_V112_APP_CLIENT_SURFACES,
      unavailableClientSurfaces: RECEIZ_V112_APP_UNAVAILABLE_CLIENT_SURFACES,
    } : {}),
    authority: {
      strongerTruth: "sealed-receiz-proof-object",
      inspectionIsVerification: false,
      proofCreation: "authenticated-native-record-before-seal",
      profileUpdate: "neutral-admitted-same-account-uid",
      ownershipClaim: "complete-sealed-artifact-before-authenticated-owner-append",
      operationCompatibility: currentV127Operations ? "current-v127-local-proof-creation" : currentV126Operations ? "current-v126-source-continuity" : currentV125Operations
        ? "current-v125-lawful-economy"
        : currentV124Operations
        ? "current-v124-production-runtime"
        : currentV123Operations
        ? "current-v123-universal-execution-authority"
        : currentV122Operations
        ? "current-v122-remote-runtime"
        : currentV120Operations
        ? "current-v120-living-subjects"
        : currentV119Operations
        ? "current-v119-baseline"
        : currentV118Operations
        ? "current-v118-baseline"
        : currentV117Operations
        ? "current-v117-baseline"
        : currentV116Operations
        ? "current-v116-baseline"
        : currentV115Operations
        ? "current-v115-offline-proof-appends"
        : currentV114Operations
        ? "current-v114-recursive-composites"
        : currentV113Operations
        ? "current-v113-production-coordination"
        : currentV112Operations
        ? "current-v112-declarative-authority"
        : currentV111Operations
          ? "current-v111-native-composition"
          : "legacy-target",
      databaseAuthority: false,
      existingWitnessedHistoryMutable: false,
    },
    framework: {
      adapter: normalized.framework,
      requiredModules: normalized.framework === "nextjs-app-router"
        ? ["receiz.server", "receiz.browser", "receiz.adapter", "receiz.environment", "receiz.extensions", "receiz.extensions.types", "receiz.boundaries"]
        : ["receiz.adapter"],
    },
    proofMemory: {
      required: proofMemoryRequired,
      behavior: "first-admission-then-append-forever",
      offlineFirstPaint: proofMemoryRequired,
    },
    sandboxFixtures: currentV111Operations
        ? sortedUnique([
          ...(hasIdentity ? ["same-uid-profile-update"] : []),
          ...(hasProof ? ["complete-sealed-artifact-ownership", "seal-failure-no-artifact"] : []),
          ...(proofMemoryRequired ? ["portable-restore-cross-app-continuation", "namespace-isolation"] : []),
        ])
        : ["receiz-proof-object.fixture.json", "receiz-webhook.fixture.json"],
    conformanceTests: ["receiz-app-contract.conformance", "receiz-authority-boundary.conformance"],
    releaseTests: ["receiz-app-check", "receiz-generated-project-compile", "receiz-package-tarball-smoke"],
    findings: versionFindings(context, targetSdkVersion),
    changes: [],
    verificationCommands: ["receiz app check --json", "pnpm test"],
    rollbackGuidance: ["Restore only files listed in the confirmed preview; never rewrite witnessed proof history."],
  };
}

export function explainReceizIntegrationFinding(finding: ReceizIntegrationFinding): string {
  return `${finding.summary} ${finding.explanation} Authority boundary: ${finding.authorityBoundary}`;
}
