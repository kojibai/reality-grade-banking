import { RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_EFFECTIVE_KAI, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_PREDECESSOR_DIGEST } from './v125ConversationClosureRegistry.generated.js';
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from './currentRegistry.generated.js';
import { verifyPackageCurrentRegistry } from './currentRegistryAuthority.js';
import { validateReceizConstitutionRegistry, digestReceizConstitution, canonicalizeReceizConstitution } from './constitution.js';
import type { ReceizConstitutionLaw } from './constitution.js';
import { digestReceizCompositeCanonical } from './compositeProofKernel.js';

/** Deterministic interpretation only; the enclosing source remains admission authority. */
export const RECEIZ_CONVERSATION_REDUCER_V2_DESCRIPTOR = Object.freeze({
  schema: 'receiz.conversation-reducer-descriptor.v2',
  namespace: 'receiz.chat.conversation.v2',
  eventSchema: 'receiz.chat.conversation-event.v2',
  projectionSchema: 'receiz.chat.conversation-projection.v2',
  reducerVersion: 2,
  causalOrder: 'topological-event-id',
  membership: 'existing-active-owner-admin-member-causal-core',
  closure: 'active-owner-exact-observed-frontier',
  closedDescendants: 'reject-all-causally-later-events',
  concurrentHistory: 'preserve-prior-and-concurrent-siblings',
  absence: 'omit-closure-coordinates',
  admission: 'enclosing-sealed-source-and-source-authenticated-actor',
  activation: 'new-family-only-exact-registry-reducer-tuple',
});
export const RECEIZ_CONVERSATION_REDUCER_V2_DIGEST = digestReceizCompositeCanonical(RECEIZ_CONVERSATION_REDUCER_V2_DESCRIPTOR);
function deepFreeze<T>(value:T):T {
  if(value && typeof value==='object') { for(const nested of Object.values(value)) deepFreeze(nested); Object.freeze(value); }
  return value;
}
export const RECEIZ_CONVERSATION_V2_REGISTRATION_LAWS: readonly ReceizConstitutionLaw[] = deepFreeze([
  {
    id: 'receiz.conversation.reducer.v2', version: 2, phases: ['command','event','admission','migration'],
    denyWhen: {op:'all',values:[
      {op:'equal',left:{op:'path',value:'operation.kind'},right:{op:'literal',value:'conversation-source-open'}},
      {op:'not',value:{op:'equal',left:{op:'path',value:'proposed.conversation.registration'},right:{op:'literal',value:{
        ...RECEIZ_CONVERSATION_REDUCER_V2_DESCRIPTOR, reducerDigest:RECEIZ_CONVERSATION_REDUCER_V2_DIGEST,
      }}}},
    ]},
    denial:{code:'CONVERSATION_REGISTERED_REDUCER_REQUIRED',safeAlternatives:['verify-enclosing-source','retain-exact-legacy-family','write-zero']},
  },
  {
    id:'receiz.conversation.source-operation.v2',version:2,phases:['command','event','admission','migration'],
    denyWhen:{op:'all',values:[
      {op:'equal',left:{op:'path',value:'operation.kind'},right:{op:'literal',value:'conversation-source-open'}},
      {op:'not',value:{op:'equal',left:{op:'path',value:'proposed.conversation.operation'},right:{op:'literal',value:'conversation.source.open'}}},
    ]},
    denial:{code:'CONVERSATION_SOURCE_OPERATION_REQUIRED',safeAlternatives:['open-sealed-source-family','write-zero']},
  },
]);

/** Pinned registered semantics survive a later current-registry successor. No caller registry gains custody. */
export async function bindReceizConversationV2Registration(registry: unknown, tuple: Readonly<{
  registryDigest: string; reducerDigest: string; namespace: string;
}>) {
  if (registry !== RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY) throw new TypeError('CONVERSATION_REGISTRY_RUNTIME_CUSTODY_REQUIRED');
  if (registry === RECEIZ_CURRENT_CONSTITUTION_REGISTRY) await verifyPackageCurrentRegistry(registry);
  const pinned = RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY;
  if (!validateReceizConstitutionRegistry(pinned).ok || pinned.effectiveKai !== RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_EFFECTIVE_KAI
    || pinned.previousRegistryDigest !== RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_PREDECESSOR_DIGEST
    || await digestReceizConstitution(pinned) !== RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST) throw new TypeError('CONVERSATION_REGISTRATION_INVALID');
  if (tuple.registryDigest !== RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST
    || tuple.reducerDigest !== RECEIZ_CONVERSATION_REDUCER_V2_DIGEST
    || tuple.namespace !== RECEIZ_CONVERSATION_REDUCER_V2_DESCRIPTOR.namespace) throw new TypeError('CONVERSATION_REGISTRATION_TUPLE_MISMATCH');
  for (const required of RECEIZ_CONVERSATION_V2_REGISTRATION_LAWS) {
    const matches = pinned.laws.filter((law) => law.id === required.id);
    if (matches.length !== 1 || canonicalizeReceizConstitution(matches[0]) !== canonicalizeReceizConstitution(required)) throw new TypeError('CONVERSATION_REGISTRATION_LAW_MISMATCH');
  }
  return RECEIZ_CONVERSATION_REDUCER_V2_DESCRIPTOR;
}
