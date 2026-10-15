import { validateReceizAppContract, type ReceizAppContract } from "./appContract.js";
import { RECEIZ_CURRENT_RELEASE_VERSION } from "./currentRelease.generated.js";
import { generateFrameworkNeutralFiles } from "./frameworkNeutralAdapter.js";
import { generateNextjsAppRouterFiles } from "./nextjsAppRouterAdapter.js";

export const RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION = RECEIZ_CURRENT_RELEASE_VERSION;

export type ReceizGeneratedFile = Readonly<{
  path: string;
  content: string;
  ownership: "receiz-generated" | "receiz-extension";
  developerEditable: boolean;
  authorityBoundary: "sealed-receiz-proof-object";
}>;

export type ReceizFrameworkAdapter = Readonly<{
  framework: ReceizAppContract["framework"];
  operationContractVersion: typeof RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION;
  generate(contract: ReceizAppContract): readonly ReceizGeneratedFile[];
}>;

const FRAMEWORK_NEUTRAL_ADAPTER: ReceizFrameworkAdapter = {
  framework: "framework-neutral",
  operationContractVersion: RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION,
  generate: generateFrameworkNeutralFiles,
};

const NEXTJS_APP_ROUTER_ADAPTER: ReceizFrameworkAdapter = {
  framework: "nextjs-app-router",
  operationContractVersion: RECEIZ_FRAMEWORK_OPERATION_CONTRACT_VERSION,
  generate: generateNextjsAppRouterFiles,
};

export const RECEIZ_FRAMEWORK_ADAPTERS: Readonly<Record<ReceizAppContract["framework"], ReceizFrameworkAdapter>> = {
  "framework-neutral": FRAMEWORK_NEUTRAL_ADAPTER,
  "nextjs-app-router": NEXTJS_APP_ROUTER_ADAPTER,
};

export function generateReceizFrameworkFiles(contract: ReceizAppContract): readonly ReceizGeneratedFile[] {
  const validation = validateReceizAppContract(contract);
  if (!validation.ok) throw new Error(validation.issues.map((issue) => `${issue.code}:${issue.path}`).join(","));
  if (validation.value.operations === undefined) throw new Error("V125_APPLICATION_OPERATION_MATRIX_REQUIRED");
  return RECEIZ_FRAMEWORK_ADAPTERS[contract.framework].generate(contract);
}
