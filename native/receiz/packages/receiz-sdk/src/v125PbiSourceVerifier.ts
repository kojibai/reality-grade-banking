import { verifyAndOpenReceizCredentialArtifactV125 } from "./v125Credential.js";
import type { ReceizAttestationAuthorityV125 } from "./v125AttestationAuthority.js";
import type { ReceizV125EnclosingArtifactVerifierOptions } from "./v125ArtifactBinding.js";
import { assertRuntimeCustodiedReceizArtifactVerification, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { readReceizTemporalSubjectSourceV125 } from "./v125SubjectSource.js";
import { verifyReceizPbiProofObjectAuthorshipChainV1, type ReceizPbiProofObjectAuthorshipAppendV1 } from "./proofObjectAuthorship.js";
import { normalizeLocalPbiAuthorshipProof } from "./pbiLocalAuthorship.js";
import { verifyOfflinePbiProofObjectAppend } from "./pbiProofObjectVerification.js";
import { verifyLocalPbiAssertion, type LocalPbiVerifyPolicy } from "./pbiLocalVerifier.js";
import { jcsCanonicalize } from "./verifier/crypto.js";
import type { ReceizPbiAuthorshipVerifierV125 } from "./v125PbiCeremony.js";

type CredentialBinding = Readonly<{ artifactSha256: string; proofObjectId: string; acceptedHead: string; ownerReceizId: string; holderReceizId: string }>;
const credentialBindings = new WeakMap<ReceizPbiAuthorshipVerifierV125, readonly CredentialBinding[]>();
/** Internal composition only. Identity proof is still admitted by ceremony verification before redemption. */
export function hasReceizCredentialPbiSourceBindingV125(verifier: ReceizPbiAuthorshipVerifierV125, expected: CredentialBinding): boolean {
  return credentialBindings.get(verifier)?.some((binding) => Object.keys(expected).every((key) =>
    binding[key as keyof CredentialBinding] === expected[key as keyof CredentialBinding])) ?? false;
}
const issued = new WeakSet<ReceizPbiAuthorshipVerifierV125>();
export function isReceizSourceBoundPbiVerifierV125(value: ReceizPbiAuthorshipVerifierV125): boolean { return issued.has(value); }

export type ReceizPbiSourceBindingV125 = Readonly<{
  /** Exact source carrying the entire PBI history, never a detached history. */
  currentArtifact: ReceizArtifactVerificationResult;
  predecessorArtifacts: readonly ReceizArtifactVerificationResult[];
  identityArtifact: ReceizArtifactVerificationResult;
  /** Its immutable admittedProofDigest must name this source or an exact verified PBI predecessor. */
  subjectSource?: ReceizPortableSealedArtifactV124;
  /** This exact complete credential must itself carry the verified PBI history. */
  credentialSource?: Readonly<{ artifact: ReceizPortableSealedArtifactV124;
    verifier: ReceizV125EnclosingArtifactVerifierOptions; authority: ReceizAttestationAuthorityV125 }>;

}>;

/** Reuses the offline append verifier and canonical Identity admission. No caller verifier is accepted. */
export async function createReceizSourceBoundPbiAuthorshipVerifierV125(input: Readonly<{
  bindings: readonly ReceizPbiSourceBindingV125[];
  /** Trusted host policy only; source-carried origins never select this policy. */
  policy?: Pick<LocalPbiVerifyPolicy, "rpId" | "originAllowList">;
}>): Promise<ReceizPbiAuthorshipVerifierV125> {
  const policy = Object.freeze({ rpId: input.policy?.rpId ?? "receiz.com",
    originAllowList: Object.freeze([...(input.policy?.originAllowList ?? ["https://receiz.com", "https://www.receiz.com"])]),
    requireUP: true, requireUV: true });
  // Preserve canonical runtime custody references, but detach every caller-owned
  // collection and plain projection input before the first asynchronous check.
  const sourceBindings = Object.freeze(input.bindings.map((binding): ReceizPbiSourceBindingV125 => Object.freeze({
    currentArtifact: binding.currentArtifact,
    identityArtifact: binding.identityArtifact,
    predecessorArtifacts: Object.freeze([...binding.predecessorArtifacts]),
    ...(binding.subjectSource ? { subjectSource: Object.freeze(structuredClone(binding.subjectSource)) } : {}),
    ...(binding.credentialSource ? { credentialSource: Object.freeze({
      artifact: Object.freeze(structuredClone(binding.credentialSource.artifact)),
      verifier: Object.freeze(structuredClone(binding.credentialSource.verifier)),
      authority: binding.credentialSource.authority,
    }) } : {}),
  })));
  if (!sourceBindings.length) throw new TypeError("V125_PBI_SOURCE_REQUIRED");
  const bindings: Array<{ proofObjectId: string; acceptedHead: string; ownerReceizId: string; holderReceizId: string; historyCanonical: string; identity: ReceizArtifactVerificationResult }> = [];
  const credentials: CredentialBinding[] = [];
  for (const binding of sourceBindings) {
    if (binding.subjectSource && binding.credentialSource) throw new TypeError("V125_PBI_SOURCE_PROJECTION_AMBIGUOUS");
    assertRuntimeCustodiedReceizArtifactVerification(binding.currentArtifact);
    assertRuntimeCustodiedReceizArtifactVerification(binding.identityArtifact);
    const current = binding.currentArtifact;
    const rawHistory = current.verification.bundle.pbiAuthorshipHistory;
    if (!Array.isArray(rawHistory) || rawHistory.length === 0 || !await verifyReceizPbiProofObjectAuthorshipChainV1(rawHistory)) {
      throw new TypeError("V125_PBI_CARRIED_HISTORY_REQUIRED");
    }
    const history = rawHistory as readonly ReceizPbiProofObjectAuthorshipAppendV1[];
    const predecessors = new Map<string, Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>>();
    for (const predecessor of binding.predecessorArtifacts) {
      assertRuntimeCustodiedReceizArtifactVerification(predecessor);
      predecessors.set(predecessor.artifactDigest.value, predecessor);
    }
    const verifiedPredecessors = new Map<string, Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>>();
    for (let position = 0; position < history.length; position += 1) {
      const append = history[position]!;
      const predecessor = predecessors.get(append.predecessorArtifactSha256);
      const priorHistory = history.slice(0, position);
      if (!predecessor || jcsCanonicalize(predecessor.verification.bundle.pbiAuthorshipHistory ?? []) !== jcsCanonicalize(priorHistory)
        || predecessor.payloadDigest.value !== current.payloadDigest.value) {
        throw new TypeError("V125_PBI_EXACT_PREDECESSOR_REQUIRED");
      }
      const receipt = append.pbiReceipt as Record<string, unknown>;
      const sig = receipt?.authorSig as Record<string, unknown> | undefined;
      const scope = { predecessorArtifactSha256: append.predecessorArtifactSha256,
        predecessorProofHead: append.predecessorProofHead, receizId: append.receizId,
        authorshipPosition: append.position, kaiUpulse: append.kaiUpulse };
      // Projection uses only exact carried fields. Canonical action, challenge,
      // receipt hash, ES256, RP/origin, UP/UV and predecessor checks follow.
      const proof = normalizeLocalPbiAuthorshipProof({ schema: "receiz.pbi.authorship.local-proof.v1",
        input: { slug: append.slug, code: append.code, pulse: append.pulse, claimHashHex: append.claimHashHex, proofObjectScope: scope },
        actionHashHex: receipt?.actionHash, challengeId: receipt?.challengeId, challengeB64Url: receipt?.challenge,
        assertion: { authenticatorDataB64Url: sig?.authenticatorData, clientDataJSONB64Url: sig?.clientDataJSON,
          signatureB64Url: sig?.signature, credIdB64Url: sig?.credId, pubKeyPem: append.credentialPublicKeyPem },
        receipt, pbiReceiptHash: append.pbiReceiptHash, verifiedAt: append.signedAt });
      if (!proof || !await verifyOfflinePbiProofObjectAppend({ verifiedArtifact: predecessor,
        proofObjectScope: scope, receizId: append.receizId, kaiUpulse: append.kaiUpulse,
        history: priorHistory, localPbiProof: proof, append,
        verifyAssertion: (args) => verifyLocalPbiAssertion({ ...args, policy }) })) {
        throw new TypeError("V125_PBI_CANONICAL_ASSERTION_INVALID");
      }
      verifiedPredecessors.set(predecessor.artifactDigest.value, predecessor);
    }
    let proofObjectId = current.continuity.artifactId;
    let acceptedHead = history.at(-1)!.appendHeadSha256;
    let ownerReceizId = current.continuity.ownerReceizId;
    let credentialHeads: readonly string[] | null = null;
    if (binding.subjectSource) {
      const subject = await readReceizTemporalSubjectSourceV125(binding.subjectSource);
      const admittedDigest = subject.source.subjectState.admittedProofDigest;
      // Supplied artifacts do not establish lineage: only predecessors actually
      // traversed and verified against the complete carried history qualify.
      const admittedSource = admittedDigest === current.artifactDigest.value
        ? current : verifiedPredecessors.get(admittedDigest);
      if (!admittedSource || admittedSource.continuity.state !== "verified"
        || admittedSource.continuity.ownerReceizId !== ownerReceizId
        || subject.source.subjectState.ownerReceizId !== ownerReceizId) {
        throw new TypeError("V125_PBI_SUBJECT_SOURCE_BINDING_INVALID");
      }
      proofObjectId = subject.source.subjectState.proofObjectId;
      acceptedHead = subject.head;
      ownerReceizId = subject.source.subjectState.ownerReceizId;
    }
    if (binding.credentialSource) {
      const source = binding.credentialSource;
      const credential = await verifyAndOpenReceizCredentialArtifactV125({ artifact: source.artifact, verifier: source.verifier }, source.authority);
      if (credential.artifactSha256 !== current.artifactDigest.value || credential.ownerReceizId !== ownerReceizId) {
        throw new TypeError("V125_PBI_CREDENTIAL_SOURCE_BINDING_INVALID");
      }
      proofObjectId = credential.history.credential.proofObjectId;
      acceptedHead = credential.acceptedHead;
      ownerReceizId = credential.history.credential.holderReceizId;
      // Historical heads are facts carried by this same verified source.
      // Presence at one of them does not assert that it is the current head.
      credentialHeads = [credential.history.credential.acceptedHead, ...credential.history.events.map((event) => event.eventDigest)];
      for (const head of credentialHeads) credentials.push(Object.freeze({ artifactSha256: credential.artifactSha256,
        proofObjectId, acceptedHead: head, ownerReceizId, holderReceizId: history.at(-1)!.receizId }));
    }
    if (!proofObjectId || !acceptedHead || !ownerReceizId || current.continuity.state !== "verified") {
      throw new TypeError("V125_PBI_CURRENT_SOURCE_BINDING_INVALID");
    }
    for (const head of credentialHeads ?? [acceptedHead]) bindings.push(Object.freeze({ proofObjectId, acceptedHead: head, ownerReceizId,
      holderReceizId: history.at(-1)!.receizId, historyCanonical: jcsCanonicalize(history), identity: binding.identityArtifact }));
  }
  const verify: ReceizPbiAuthorshipVerifierV125 = async (request) => {
    try {
      const binding = bindings.find((entry) => entry.proofObjectId === request.proofObjectId && entry.acceptedHead === request.acceptedHead
        && entry.holderReceizId === request.holderReceizId && entry.historyCanonical === jcsCanonicalize(request.history));
      if (!binding || !request.holderProof || !request.challengeDigest) return false;
      const admission = await createReceizArtifactAdmissionEngine()(binding.identity, { profile: "identity",
        ownerConstraint: binding.ownerReceizId, actorConstraint: request.holderReceizId,
        identityProof: request.holderProof, identityExactChallenge: request.challengeDigest });
      return admission.profile === "identity" && admission.verdict === "canonical-identity";
    } catch { return false; }
  };
  credentialBindings.set(verify, Object.freeze(credentials));
  issued.add(verify);
  return Object.freeze(verify);
}
