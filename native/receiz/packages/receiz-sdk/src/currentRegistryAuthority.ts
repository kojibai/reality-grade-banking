import { RECEIZ_V125_CONSTITUTION_REGISTRY } from "./v125Registry.generated.js";
import { RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_EFFECTIVE_KAI, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_PREDECESSOR_DIGEST } from "./v125ConversationClosureRegistry.generated.js";
import type { ReceizConstitutionRegistry } from "./constitution.js";
import { RECEIZ_V125_REGISTRY_EFFECTIVE_KAI } from "./releaseIdentity.js";
import { RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST } from "./v125ConversationClosureRegistry.generated.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import { validateReceizConstitutionRegistry, digestReceizConstitution } from "./constitution.js";
import {
  RECEIZ_RULESET_VERSION,
  RECEIZ_CURRENT_REGISTRY_DIGEST,
  RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI,
  RECEIZ_CURRENT_REGISTRY_PREDECESSOR_DIGEST,
  RECEIZ_V106_REGISTRY_DIGEST,
  RECEIZ_V107_REGISTRY_DIGEST,
  RECEIZ_V108_REGISTRY_DIGEST,
  RECEIZ_V109_REGISTRY_DIGEST,
  RECEIZ_V110_REGISTRY_DIGEST,
  RECEIZ_V111_REGISTRY_DIGEST,
  RECEIZ_V112_REGISTRY_DIGEST,
  RECEIZ_V113_REGISTRY_DIGEST,
  RECEIZ_V114_REGISTRY_DIGEST,
  RECEIZ_V115_REGISTRY_DIGEST,
  RECEIZ_V116_REGISTRY_DIGEST,
  RECEIZ_V117_REGISTRY_DIGEST,
  RECEIZ_V118_REGISTRY_DIGEST,
  RECEIZ_V119_REGISTRY_DIGEST,
  RECEIZ_V120_REGISTRY_DIGEST,
  RECEIZ_V121_REGISTRY_DIGEST,
  RECEIZ_V122_REGISTRY_DIGEST,
  RECEIZ_V123_REGISTRY_DIGEST,
  RECEIZ_V124_REGISTRY_DIGEST,
  RECEIZ_V125_REGISTRY_DIGEST,
  RECEIZ_V126_REGISTRY_DIGEST
} from "./releaseIdentity.js";

export async function verifyPackageCurrentRegistry(
  registry: unknown,
): Promise<void> {
  if (registry !== RECEIZ_CURRENT_CONSTITUTION_REGISTRY) {
    throw new TypeError("CURRENT_REGISTRY_RUNTIME_CUSTODY_REQUIRED");
  }
  const currentRegistry = registry as typeof RECEIZ_CURRENT_CONSTITUTION_REGISTRY;
  const validation = validateReceizConstitutionRegistry(currentRegistry);
  if (!validation.ok) throw new TypeError("CURRENT_REGISTRY_INVALID");
  if (currentRegistry.version !== RECEIZ_RULESET_VERSION
    || currentRegistry.effectiveKai !== RECEIZ_CURRENT_REGISTRY_EFFECTIVE_KAI
    || currentRegistry.previousRegistryDigest !== RECEIZ_CURRENT_REGISTRY_PREDECESSOR_DIGEST
    || await digestReceizConstitution(currentRegistry) !== RECEIZ_CURRENT_REGISTRY_DIGEST) {
    throw new TypeError("CURRENT_REGISTRY_DIGEST_MISMATCH");
  }
  const pinnedChain = [
    RECEIZ_V106_REGISTRY_DIGEST,
    RECEIZ_V107_REGISTRY_DIGEST,
    RECEIZ_V108_REGISTRY_DIGEST,
    RECEIZ_V109_REGISTRY_DIGEST,
    RECEIZ_V110_REGISTRY_DIGEST,
    RECEIZ_V111_REGISTRY_DIGEST,
    RECEIZ_V112_REGISTRY_DIGEST,
    RECEIZ_V113_REGISTRY_DIGEST,
    RECEIZ_V114_REGISTRY_DIGEST,
    RECEIZ_V115_REGISTRY_DIGEST,
    RECEIZ_V116_REGISTRY_DIGEST,
    RECEIZ_V117_REGISTRY_DIGEST,
    RECEIZ_V118_REGISTRY_DIGEST,
    RECEIZ_V119_REGISTRY_DIGEST,
    RECEIZ_V120_REGISTRY_DIGEST,
    RECEIZ_V121_REGISTRY_DIGEST,
    RECEIZ_V122_REGISTRY_DIGEST,
    RECEIZ_V123_REGISTRY_DIGEST,
    RECEIZ_V124_REGISTRY_DIGEST,
    RECEIZ_V125_REGISTRY_DIGEST,
    RECEIZ_V126_REGISTRY_DIGEST,
    RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST,
    ...(([RECEIZ_V125_REGISTRY_DIGEST, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST] as readonly string[]).some((digest) => digest === RECEIZ_CURRENT_REGISTRY_DIGEST) ? [] : [RECEIZ_CURRENT_REGISTRY_DIGEST]),
  ];
  if (new Set(pinnedChain).size !== pinnedChain.length
    || pinnedChain.some((digestValue) => !/^[0-9a-f]{64}$/.test(digestValue))) {
    throw new TypeError("CURRENT_REGISTRY_PREDECESSOR_CHAIN_INVALID");
  }
}

/** Selects packaged interpretation only. Callers must first verify the enclosing artifact. */
export async function resolvePackagePinnedHistoryRegistry(digest: string): Promise<ReceizConstitutionRegistry> {
  const registry = digest === RECEIZ_V125_REGISTRY_DIGEST ? RECEIZ_V125_CONSTITUTION_REGISTRY
    : digest === RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST ? RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY
      : digest === RECEIZ_CURRENT_REGISTRY_DIGEST ? RECEIZ_CURRENT_CONSTITUTION_REGISTRY : null;
  if (!registry) throw new TypeError("HISTORY_REGISTRY_NOT_PINNED");
  await verifyPackagePinnedHistoryRegistry(registry);
  return registry;
}
export async function verifyPackagePinnedHistoryRegistry(registry: unknown): Promise<void> {
  if (registry === RECEIZ_V125_CONSTITUTION_REGISTRY || registry === RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY) {
    const published = registry === RECEIZ_V125_CONSTITUTION_REGISTRY;
    const expectedDigest = published ? RECEIZ_V125_REGISTRY_DIGEST : RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST;
    const expectedPredecessor = published ? RECEIZ_V124_REGISTRY_DIGEST : RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_PREDECESSOR_DIGEST;
    const expectedKai = published ? RECEIZ_V125_REGISTRY_EFFECTIVE_KAI : RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_EFFECTIVE_KAI;
    const pinned = registry as ReceizConstitutionRegistry;
    if (!validateReceizConstitutionRegistry(pinned).ok || pinned.version !== "125.0.0"
      || pinned.previousRegistryDigest !== expectedPredecessor || pinned.effectiveKai !== expectedKai
      || await digestReceizConstitution(pinned) !== expectedDigest) throw new TypeError("HISTORY_REGISTRY_PIN_MISMATCH");
    return;
  }
  await verifyPackageCurrentRegistry(registry);
}
