import type { ReceizArtifactTransitionStore } from "./artifactTransitionStore.js";
import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { verifyReceizArtifact, verifyReceizArtifactWithCanonicalRoots } from "./artifactVerification.js";
import { receizBase64UrlDecode, type ReceizIdentityLoginProof } from "./identity.js";
import { bindReceizCurrentArtifactAppendRegistryAuthority, planReceizExactKksArtifactAppend,
  sealArtifactTransitionCandidate, commitArtifactTransition,
  type ReceizArtifactAppendPlan, type ReceizArtifactTransitionSealer } from "./artifactTransition.js";
import type { ReceizVerifiedCapability } from "./capabilityAuthority.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import { canonicalizeReceizV122 } from "./v122Canonical.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { openVerifiedReceizV125ArtifactPayloadBytes, readReceizV125BindingAdmission,
  type ReceizV125EnclosingArtifactBinding, type ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { transportReceizSealedArtifactV124, type ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";

export type ReceizSealedLifecycleContextV125 = Readonly<{
  sourceArtifact: ReceizPortableSealedArtifactV124;
  identityArtifact: ReceizPortableSealedArtifactV124;
  expectedArtifactDigest: string;
  expectedHead: string;
  commitDomain: ReceizArtifactAppendPlan["commitDomain"];
  kksCoordinate: unknown;
  verifier: ReceizV125EnclosingArtifactVerifierOptions;
}>;
export type ReceizSealedLifecycleExecutionV125 = Readonly<{
  capability: ReceizVerifiedCapability;
  sealer: ReceizArtifactTransitionSealer;
  store: ReceizArtifactTransitionStore;
}>;
type Event = Readonly<{ actorReceizId: string; actorProof: ReceizIdentityLoginProof; eventKai: string; eventDigest: string; idempotencyKey: string }>;
type Addition<E extends Event> = Readonly<{ schema: "receiz.lifecycle.source-append.v125"; lifecycle: string; event: E;
  identityArtifact: ReceizPortableSealedArtifactV124 }>;
const custody = new WeakMap<object, { context: ReceizSealedLifecycleContextV125; transitionPlan: ReceizArtifactAppendPlan }>();

function invalid(): never { throw new TypeError("V125_LIFECYCLE_SOURCE_BINDING_INVALID"); }
export function readReceizLifecyclePlanCustodyV125(plan: object) { return custody.get(plan); }
export function retainReceizLifecyclePlanV125(plan: object, context: ReceizSealedLifecycleContextV125, transitionPlan: ReceizArtifactAppendPlan) {
  custody.set(plan, { context, transitionPlan });
}
async function actor(artifact: ReceizPortableSealedArtifactV124, event: Event, verifier: ReceizV125EnclosingArtifactVerifierOptions) {
  const bytes = receizBase64UrlDecode(artifact.exactBytesB64u);
  const file = new File([new Uint8Array(bytes).buffer], artifact.filename, { type: artifact.mimeType });
  const verified = verifier.canonicalSignatureV4RootPublicKeys
    ? await verifyReceizArtifactWithCanonicalRoots(file, verifier.canonicalSignatureV4RootPublicKeys) : await verifyReceizArtifact(file);
  if (verified.status !== "verified-artifact" || verified.artifactDigest.value !== artifact.artifactSha256
    || verified.payloadDigest.value !== artifact.payloadSha256) invalid();
  const identity = await createReceizArtifactAdmissionEngine(verifier)(verified, { profile: "identity", ownerConstraint: event.actorReceizId,
    identityProof: event.actorProof, identityExactChallengeB64Url: event.actorProof.challengeB64Url });
  if (identity.profile !== "identity" || identity.verdict !== "canonical-identity") invalid();
  return identity;
}
/** Only additions bound to canonical carried nodes may extend the immutable payload. */
export async function readReceizLifecycleAdditionsV125<E extends Event>(binding: ReceizV125EnclosingArtifactBinding,
  lifecycle: string, verifier: ReceizV125EnclosingArtifactVerifierOptions): Promise<readonly E[]> {
  const additions = binding.provenance.appends.filter((entry) => entry !== null && typeof entry === "object"
    && !Array.isArray(entry) && entry.schema === "receiz.lifecycle.source-append.v125") as unknown as readonly Addition<E>[];
  const admitted = readReceizV125BindingAdmission(binding);
  if (!additions.length && !(admitted.profile === "portable-state" && admitted.proofHistory?.nodes.some((node) => node.event.type === "state.append"
    && (node.event.state as { event?: { schema?: string } })?.event?.schema === "receiz.lifecycle.source-append.v125"))) return [];
  if (admitted.profile !== "portable-state" || admitted.verdict !== "bearer-recovery" || !admitted.proofHistory) invalid();
  const carriedNodes = admitted.proofHistory.nodes.filter((node) => node.event.type === "state.append"
    && (node.event.state as { event?: { schema?: string } })?.event?.schema === "receiz.lifecycle.source-append.v125");
  if (carriedNodes.length !== additions.length) invalid();
  const events: E[] = [];
  for (const addition of additions) {
    if (Object.keys(addition).sort().join() !== "event,identityArtifact,lifecycle,schema" || addition.lifecycle !== lifecycle) invalid();
    const node = admitted.proofHistory.nodes.find((candidate) => candidate.event.type === "state.append"
      && canonicalizeReceizV122(candidate.event.state) === canonicalizeReceizV122({ namespace: "provenance", event: addition }));
    if (!node || node.parentDigests.length !== 1) invalid();
    const temporal = await admitReceizKksV1ProofCoordinate(node.namespaceData["receiz.kks-v1"]);
    const identity = await actor(addition.identityArtifact, addition.event, verifier);
    if (temporal.kaiUpulse !== addition.event.eventKai
      || (node.receipt as { actor?: { actorId?: string } }).actor?.actorId !== identity.actor.actorId) invalid();
    events.push(addition.event);
  }
  return events;
}
export async function readReceizLifecyclePayloadV125(context: ReceizSealedLifecycleContextV125) {
  const opened = await openVerifiedReceizV125ArtifactPayloadBytes({ artifact: context.sourceArtifact, verifier: context.verifier,
    enclosingProofError: "V125_LIFECYCLE_ENCLOSING_PROOF_INVALID", payloadError: "V125_LIFECYCLE_PAYLOAD_INVALID" });
  if (opened.artifactSha256 !== context.expectedArtifactDigest) invalid();
  const admitted = readReceizV125BindingAdmission(opened);
  if (admitted.profile !== "portable-state" || admitted.verdict !== "bearer-recovery" || !admitted.proofHistory
    || admitted.proofHistory.headDigests.length !== 1 || admitted.proofHistory.headDigests[0] !== context.expectedHead) invalid();
  return { opened, admitted };
}
export async function planReceizSealedLifecycleV125(context: ReceizSealedLifecycleContextV125, lifecycle: string, event: Event) {
  const { admitted } = await readReceizLifecyclePayloadV125(context);
  const identity = await actor(context.identityArtifact, event, context.verifier);
  const coordinate = await admitReceizKksV1ProofCoordinate(context.kksCoordinate);
  if (coordinate.kaiUpulse !== event.eventKai) invalid();
  await bindReceizCurrentArtifactAppendRegistryAuthority({ admission: admitted, registry: RECEIZ_CURRENT_CONSTITUTION_REGISTRY });
  return planReceizExactKksArtifactAppend({ admission: admitted, verifiedHistory: admitted.proofHistory, verifiedActorEvidence: identity,
    commitDomain: context.commitDomain, namespace: { scheme: "receiz-namespace.v1", value: "provenance" },
    event: { schema: "receiz.lifecycle.source-append.v125", lifecycle, event, identityArtifact: context.identityArtifact } as unknown as ReceizConstitutionJson,
    expectedHead: { algorithm: "sha-256", binds: "verified-proof-history", value: context.expectedHead }, idempotencyKey: event.idempotencyKey, kksCoordinate: coordinate });
}
export async function applyReceizSealedLifecycleV125<T>(plan: object, execution: ReceizSealedLifecycleExecutionV125,
  project: (sourceArtifact: ReceizPortableSealedArtifactV124, verifier: ReceizV125EnclosingArtifactVerifierOptions) => Promise<T>) {
  const held = custody.get(plan);
  if (!held || !execution.capability || !execution.sealer || !execution.store) throw new TypeError("V125_LIFECYCLE_SEALED_TRANSITION_REQUIRED");
  const candidate = await sealArtifactTransitionCandidate({ plan: held.transitionPlan, capability: execution.capability, sealer: execution.sealer });
  const sourceArtifact = await transportReceizSealedArtifactV124(candidate.artifact);
  // Derive and validate the complete successor before reaching any commit.
  const projection = await project(sourceArtifact, held.context.verifier);
  const staged = await execution.store.stageCandidate(candidate);
  const committedTransition = await commitArtifactTransition({ plan: held.transitionPlan, capability: execution.capability, staged, store: execution.store });
  if (committedTransition.status !== "committed-artifact-transition") throw new TypeError(committedTransition.code);
  return { projection, sourceArtifact, committedTransition, writesPerformed: committedTransition.acceptance === "committed" ? 1 as const : 0 as const };
}
