import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { parseReceizConversationEventV1, parseReceizConversationEventV2, parseReceizConversationParticipantBindingV1 } from "./conversationDomain.js";
import { receizBase64UrlDecode, readReceizIdentityArtifact } from "./identity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { validateReceizSubjectAccessPublicBindingV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";
import { projectReceizSubjectNamespacesV123 } from "./v123Namespaces.js";
import { closedRecord, digest, freeze, text } from "./v124Contracts.js";
import type { ReceizDomainReplaySourceAuthoringEvidenceV124, ReceizDomainReplaySourceAuthorityV124 } from "./v124ReplayProofObject.js";
import { readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { readReceizSubjectSourceFamilyMemberV125, type ReceizOpenedSubjectSourceFamilyV125 } from "./v125SubjectSourceFamily.js";
import { bindReceizConversationV2Registration, RECEIZ_CONVERSATION_REDUCER_V2_DIGEST } from "./conversationRegistration.js";
import { RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY, RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST } from "./v125ConversationClosureRegistry.generated.js";
const code = "V125_THREAD_SOURCE_SHAPE_INVALID";
function fail(reason: string): never { throw new TypeError(`V125_THREAD_SOURCE_${reason}`); }
function same(a: unknown, b: unknown): boolean { return canonicalizeReceizV122(a) === canonicalizeReceizV122(b); }
/** Selection only: every coordinate and public-key byte is derived from its sealed source. */
export type ReceizConversationAuthorSourceSelectionV125 = Readonly<{
  currentArtifactSha256: string; identityArtifactSha256: string; subjectArtifactSha256: string; accessNamespace: string;
}>;
export function normalizeReceizConversationAuthorSelectionV125(value: unknown): ReceizConversationAuthorSourceSelectionV125 {
  const r = closedRecord(value, ["currentArtifactSha256", "identityArtifactSha256", "subjectArtifactSha256", "accessNamespace"], code);
  if (typeof r.accessNamespace !== "string" || !/^[a-z][a-z0-9._-]{0,63}$/.test(r.accessNamespace)) fail("ACCESS_NAMESPACE_INVALID");
  return freeze({ currentArtifactSha256: digest(r.currentArtifactSha256, code), identityArtifactSha256: digest(r.identityArtifactSha256, code),
    subjectArtifactSha256: digest(r.subjectArtifactSha256, code), accessNamespace: text(r.accessNamespace, code) });
}
/** The namespace name selects existing carried access material; it never grants access. */
export async function projectReceizConversationParticipantSourceV125(input: Readonly<{
  family: ReceizOpenedSubjectSourceFamilyV125; selection: ReceizConversationAuthorSourceSelectionV125;
}>) {
  const selected = normalizeReceizConversationAuthorSelectionV125(input.selection);
  const family = input.family;
  if (!family.family.bindings.some((binding) => binding.currentArtifactSha256 === selected.currentArtifactSha256
    && binding.identityArtifactSha256 === selected.identityArtifactSha256 && binding.subjectArtifactSha256 === selected.subjectArtifactSha256)) fail("AUTHOR_SELECTION_MISSING");
  const current = readReceizSubjectSourceFamilyMemberV125(family, selected.currentArtifactSha256);
  const identity = readReceizSubjectSourceFamilyMemberV125(family, selected.identityArtifactSha256);
  const subject = await readReceizTemporalSubjectSourceV125(readReceizSubjectSourceFamilyMemberV125(family, selected.subjectArtifactSha256).artifact);
  const state = subject.source.subjectState;
  const history = current.verification.verification.bundle.pbiAuthorshipHistory;
  if (!Array.isArray(history) || !history.length) fail("AUTHOR_PBI_REQUIRED");
  const actorId = text(history.at(-1)!.receizId, code);
  const namespaces = await projectReceizSubjectNamespacesV123(state, [selected.accessNamespace]);
  const namespace = namespaces.namespaces[0];
  if (!namespace?.found || !namespace.exactBytesB64u) fail("ACCESS_SOURCE_REQUIRED");
  const raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(namespace.exactBytesB64u)));
  closedRecord(raw, ["schema", "subjectId", "subjectHead", "accessKeyHead", "publicKeyJwk", "bindingDigest"], code);
  const access = freeze(raw) as ReceizSubjectAccessPublicBindingV122;
  if (!await validateReceizSubjectAccessPublicBindingV122(access) || access.subjectId !== state.subjectId
    || access.subjectHead !== state.head || access.accessKeyHead !== state.accessKeyHead) fail("ACCESS_BINDING_MISMATCH");
  if (Object.prototype.hasOwnProperty.call(access.publicKeyJwk, "d")) fail("ACCESS_PRIVATE_KEY_FORBIDDEN");
  await crypto.subtle.importKey("jwk", access.publicKeyJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const basis = { receizId: actorId, subjectId: state.subjectId, subjectHead: state.head, accessKeyHead: access.accessKeyHead };
  const participant = await parseReceizConversationParticipantBindingV1({ ...basis, bindingDigest: await digestReceizCanonicalV122(basis) });
  return Object.freeze({ participant, access, subject, identity, actorId });
}

export async function bindReceizConversationAuthorSourceV125(input: Readonly<{ family: ReceizOpenedSubjectSourceFamilyV125; selection: ReceizConversationAuthorSourceSelectionV125;
  evidence: ReceizDomainReplaySourceAuthoringEvidenceV124; authority: ReceizDomainReplaySourceAuthorityV124 }>) {
  const derived = await projectReceizConversationParticipantSourceV125(input);
  const { evidence, authority } = input;
  if (derived.identity.artifact.payloadSha256 !== evidence.identity.identityArtifactDigest

    || authority.ownerReceizId !== derived.subject.source.subjectState.ownerReceizId
    || authority.actorSubjectId !== derived.participant.subjectId || authority.actorSubjectHead !== derived.participant.subjectHead) fail("AUTHOR_BINDING_MISMATCH");
  const proof = evidence.signedChallenge.proof;
  const admission = await createReceizArtifactAdmissionEngine()(derived.identity.verification, { profile: "identity",
    ownerConstraint: authority.ownerReceizId, actorConstraint: derived.actorId, identityProof: proof,
    identityExactChallengeB64Url: proof.challengeB64Url });
  if (admission.verdict !== "canonical-identity" || admission.profile !== "identity") fail("AUTHOR_IDENTITY_REQUIRED");
  const key = await readReceizIdentityArtifact(admission.verifiedPayload.bytes);
  if (key.keyId !== evidence.identity.keyId || key.alg !== evidence.identity.alg
    || key.crypto.publicKeyRawB64u !== evidence.identity.publicKeyRawB64u) fail("AUTHOR_KEY_MISMATCH");
  return Object.freeze({ ...derived, admission });
}
export async function bindReceizConversationSourceEventsV125(additions: readonly { exactEventBytesB64u: string }[], derived: Awaited<ReturnType<typeof bindReceizConversationAuthorSourceV125>>, kaiUpulse?: string, replay?: Readonly<{ registryDigest: string; reducerDigest: string; namespace: Readonly<{ name: string }> }>) {
  const registered = replay && (replay.registryDigest === RECEIZ_CONVERSATION_CANDIDATE_REGISTRY_DIGEST
    || replay.reducerDigest === RECEIZ_CONVERSATION_REDUCER_V2_DIGEST || replay.namespace.name === "receiz.chat.conversation.v2");
  if (registered) await bindReceizConversationV2Registration(RECEIZ_CONVERSATION_CANDIDATE_CONSTITUTION_REGISTRY,
    { registryDigest: replay.registryDigest, reducerDigest: replay.reducerDigest, namespace: replay.namespace.name });
  const events = [];
  for (const addition of additions) {
    const event = await (registered ? parseReceizConversationEventV2 : parseReceizConversationEventV1)(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(addition.exactEventBytesB64u))));
    if (event.actorReceizId !== derived.actorId) fail("EVENT_ACTOR_EVIDENCE_REQUIRED");
    if (kaiUpulse !== undefined && String(event.kaiUPulse) !== kaiUpulse) fail("EVENT_KKS_MISMATCH");
    if (event.effect.kind === "genesis" && !same(event.effect.creator, derived.participant)
      || event.effect.kind === "accept" && !same(event.effect.recipient, derived.participant)) fail("PARTICIPANT_BINDING_MISMATCH");
    events.push(event);
  }
  return freeze(events);
}

