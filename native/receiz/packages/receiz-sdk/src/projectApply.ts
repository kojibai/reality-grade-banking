import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readlink, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { ReceizAppContract } from "./appContract.js";
import {
  generateReceizFrameworkFiles,
  RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION,
} from "./frameworkAdapters.js";

export type ReceizFileChange = Readonly<{
  path: string;
  operation: "create" | "update" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  content: string | null;
  explanation: string;
  generated: boolean;
  ownership: "receiz-generated" | "receiz-extension" | "project-manifest";
  destructive: boolean;
  manualReview: false;
}>;

export type ReceizIntegrationPreview = Readonly<{
  schema: "receiz.integration.preview.v1";
  root: string;
  targetSdkVersion: string;
  changes: readonly ReceizFileChange[];
  digest: string;
  confirmationRequired: true;
  authority: Readonly<{
    strongerTruth: "sealed-receiz-proof-object";
    inspectionIsVerification: false;
    existingWitnessedHistoryMutable: false;
  }>;
  verificationCommands: readonly string[];
  rollbackGuidance: readonly string[];
}>;

export type ReceizApplyResult = Readonly<{
  schema: "receiz.integration.apply_result.v1";
  applied: boolean;
  dryRun: boolean;
  changedFiles: readonly string[];
  previewDigest: string;
  authority: ReceizIntegrationPreview["authority"];
  verificationCommands: readonly string[];
  rollbackGuidance: readonly string[];
}>;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPreviewDigest(root: string, targetSdkVersion: string, changes: readonly ReceizFileChange[]): string {
  return hash(JSON.stringify({ root, targetSdkVersion, changes }));
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

async function rootPath(value: string): Promise<string> {
  let root: string;
  try { root = await realpath(resolve(value)); } catch { throw new Error("receiz_repository_root_not_found"); }
  if (!(await stat(root)).isDirectory()) throw new Error("receiz_repository_root_not_directory");
  return root;
}

async function currentFile(root: string, relativePath: string): Promise<string | null> {
  const path = resolve(root, relativePath);
  if (!isInside(root, path)) throw new Error("receiz_repository_path_escape");
  try {
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) {
      const linkTarget = await readlink(path);
      const target = resolve(dirname(path), linkTarget);
      if (!isInside(root, target)) throw new Error("receiz_repository_symlink_escape");
      throw new Error("receiz_generated_path_symlink_forbidden");
    }
    if (!metadata.isFile()) throw new Error("receiz_generated_path_not_file");
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function updatedPackageJson(source: string, target: string): string {
  const manifest = JSON.parse(source) as Record<string, unknown>;
  const dependencies = typeof manifest.dependencies === "object" && manifest.dependencies !== null && !Array.isArray(manifest.dependencies)
    ? { ...(manifest.dependencies as Record<string, unknown>) }
    : {};
  dependencies["@receiz/ai-skills"] = target;
  dependencies["@receiz/sdk"] = `^${target}`;
  manifest.dependencies = Object.fromEntries(Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right)));
  const devDependencies = typeof manifest.devDependencies === "object" && manifest.devDependencies !== null && !Array.isArray(manifest.devDependencies)
    ? { ...(manifest.devDependencies as Record<string, unknown>) }
    : {};
  devDependencies["@receiz/mcp-server"] = target;
  manifest.devDependencies = Object.fromEntries(Object.entries(devDependencies).sort(([left], [right]) => left.localeCompare(right)));
  const scripts = typeof manifest.scripts === "object" && manifest.scripts !== null && !Array.isArray(manifest.scripts)
    ? { ...(manifest.scripts as Record<string, unknown>) }
    : {};
  scripts["receiz:check"] = "receiz app check --json";
  manifest.scripts = Object.fromEntries(Object.entries(scripts).sort(([left], [right]) => left.localeCompare(right)));
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function createReceizIntegrationPreview(input: Readonly<{
  root: string;
  contract: ReceizAppContract;
  targetSdkVersion?: string;
}>): Promise<ReceizIntegrationPreview> {
  const targetSdkVersion = input.targetSdkVersion ?? RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION;
  if (input.contract.framework === "framework-neutral" && targetSdkVersion !== RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION) {
    throw new Error(`receiz_framework_neutral_target_requires_current:${targetSdkVersion}`);
  }
  const currentV125Package = /^125\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(targetSdkVersion);
  if (targetSdkVersion !== RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION && !currentV125Package && targetSdkVersion !== "118.0.0") {
    throw new Error(`receiz_generated_target_unsupported:${targetSdkVersion}`);
  }
  const root = await rootPath(input.root);
  const proposed: Array<{
    path: string;
    content: string;
    generated: boolean;
    ownership: ReceizFileChange["ownership"];
  }> = generateReceizFrameworkFiles(input.contract).map((item) => ({
    path: item.path,
    content: item.content,
    generated: item.ownership === "receiz-generated",
    ownership: item.ownership,
  }));
  const packageSource = await currentFile(root, "package.json");
  if (packageSource === null) throw new Error("receiz_package_manifest_required");
  proposed.push({ path: "package.json", content: updatedPackageJson(packageSource, targetSdkVersion), generated: false, ownership: "project-manifest" as const });

  const changes: ReceizFileChange[] = [];
  for (const item of proposed.sort((left, right) => left.path.localeCompare(right.path))) {
    const before = await currentFile(root, item.path);
    if (item.ownership === "receiz-extension" && before !== null) continue;
    if (before === item.content) continue;
    changes.push({
      path: item.path,
      operation: before === null ? "create" : "update",
      beforeHash: before === null ? null : hash(before),
      afterHash: hash(item.content),
      content: item.content,
      explanation: item.ownership === "receiz-extension"
        ? "Create the developer-owned Receiz extension sibling once; regeneration never overwrites it."
        : item.generated
          ? "Create or refresh a Receiz-owned generated integration module."
          : "Structurally align approved Receiz package and check fields.",
      generated: item.generated,
      ownership: item.ownership,
      destructive: false,
      manualReview: false,
    });
  }
  const digest = canonicalPreviewDigest(root, targetSdkVersion, changes);
  return {
    schema: "receiz.integration.preview.v1",
    root,
    targetSdkVersion,
    changes,
    digest,
    confirmationRequired: true,
    authority: { strongerTruth: "sealed-receiz-proof-object", inspectionIsVerification: false, existingWitnessedHistoryMutable: false },
    verificationCommands: ["receiz app check --json", "pnpm test"],
    rollbackGuidance: changes.map((change) => `Restore ${change.path} to the pre-preview repository version; never alter witnessed proof history.`),
  };
}

export async function applyReceizIntegrationPreview(input: Readonly<{
  preview: ReceizIntegrationPreview;
  confirmation?: string;
  dryRun?: boolean;
}>): Promise<ReceizApplyResult> {
  const { preview } = input;
  if (input.confirmation !== preview.digest) throw new Error("receiz_apply_confirmation_required");
  const root = await rootPath(preview.root);
  for (const change of preview.changes) {
    if (!isInside(root, resolve(root, change.path))) throw new Error("receiz_repository_path_escape");
  }
  if (canonicalPreviewDigest(root, preview.targetSdkVersion, preview.changes) !== preview.digest) throw new Error("receiz_preview_digest_invalid");
  for (const change of preview.changes) {
    const path = resolve(root, change.path);
    if (!isInside(root, path)) throw new Error("receiz_repository_path_escape");
    const before = await currentFile(root, change.path);
    const beforeHash = before === null ? null : hash(before);
    if (beforeHash !== change.beforeHash) throw new Error(`receiz_preview_stale:${change.path}`);
    if (change.operation === "delete") {
      throw new Error(`receiz_preview_delete_invalid:${change.path}`);
    } else if (change.content === null || change.afterHash === null || hash(change.content) !== change.afterHash) {
      throw new Error(`receiz_preview_content_invalid:${change.path}`);
    }
  }
  if (!input.dryRun) {
    for (const change of preview.changes.filter((item) => item.operation !== "delete")) {
      const destination = join(root, change.path);
      await mkdir(dirname(destination), { recursive: true });
      const temporary = join(dirname(destination), `.${basename(destination)}.receiz-tmp`);
      await writeFile(temporary, change.content as string, { mode: 0o600 });
      await rename(temporary, destination);
      await rm(temporary, { force: true });
      const written = await currentFile(root, change.path);
      if (written === null || hash(written) !== change.afterHash) throw new Error(`receiz_apply_write_hash_mismatch:${change.path}`);
    }
    for (const change of preview.changes.filter((item) => item.operation === "delete")) {
      await rm(join(root, change.path));
    }
  }
  return {
    schema: "receiz.integration.apply_result.v1",
    applied: !input.dryRun && preview.changes.length > 0,
    dryRun: input.dryRun ?? false,
    changedFiles: preview.changes.map((change) => change.path),
    previewDigest: preview.digest,
    authority: preview.authority,
    verificationCommands: preview.verificationCommands,
    rollbackGuidance: preview.rollbackGuidance,
  };
}
