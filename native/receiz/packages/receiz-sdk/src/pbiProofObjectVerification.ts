import { assertRuntimeCustodiedReceizArtifactVerification, type ReceizArtifactVerificationResult } from "./artifactVerification.js";
import { verifyReceizPbiProofObjectAuthorshipChainV1, type ReceizPbiProofObjectAuthorshipAppendV1 } from "./proofObjectAuthorship.js";
import type { PortableJson } from "./portableAsset.js";
import { jcsCanonicalize } from "./verifier/crypto.js";
import { normalizeLocalPbiProofObjectScopeV115, verifyLocalPbiAuthorshipProof, type LocalPbiAuthorshipProofV1, type LocalPbiProofObjectScopeV115 } from "./pbiLocalAuthorship.js";
import { verifyLocalPbiAssertion, type LocalPbiVerifyResult } from "./pbiLocalVerifier.js";

const HEX64_RE = /^[0-9a-f]{64}$/;
const SLUG_RE = /^\d{8}_\d{4}$/;
const CODE_RE = /^[A-Z0-9]{8}$/;

type VerifiedArtifactContext = Readonly<{
  artifactSha256: string;
  baseProofHead: string;
  slug: string;
  code: string;
  pulse: string;
  claimHashHex: string;
}>;

export type VerifiedOfflinePbiProofObjectAppend = Readonly<{
  append: ReceizPbiProofObjectAuthorshipAppendV1;
  localPbiProof: LocalPbiAuthorshipProofV1;
}>;

type LocalProofVerifier = (args: {
  challengeB64Url: string;
  assertion: LocalPbiAuthorshipProofV1["assertion"];
}) => Promise<LocalPbiVerifyResult>;

function normalizeHex64(value: unknown): string | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return HEX64_RE.test(normalized) ? normalized : null;
}

export function verifiedArtifactContext(
  verifiedArtifact: ReceizArtifactVerificationResult,
): VerifiedArtifactContext | null {
  try {
    assertRuntimeCustodiedReceizArtifactVerification(verifiedArtifact);
  } catch {
    return null;
  }
  const bundle = verifiedArtifact.verification.bundle;
  const artifactSha256 = normalizeHex64(verifiedArtifact.artifactDigest.value);
  const continuityHead = normalizeHex64(verifiedArtifact.continuity.headReference);
  const groth16ProofDigest = normalizeHex64(bundle.groth16ProofDigest);
  const baseProofHead = continuityHead ?? groth16ProofDigest;
  const slug = typeof bundle.slug === "string" ? bundle.slug.trim() : "";
  const code = typeof bundle.code === "string" ? bundle.code.trim().toUpperCase() : "";
  const pulse = typeof bundle.kaiPulseEternal === "string"
    ? bundle.kaiPulseEternal.trim()
    : "";
  const claimHashHex = normalizeHex64(bundle.artifactSha256Basis);
  if (
    !artifactSha256
    || !baseProofHead
    || !SLUG_RE.test(slug)
    || !CODE_RE.test(code)
    || !pulse
    || !claimHashHex
  ) {
    return null;
  }
  return {
    artifactSha256,
    baseProofHead,
    slug,
    code,
    pulse,
    claimHashHex,
  };
}

export function exactScope(
  args: Readonly<{
    context: VerifiedArtifactContext;
    scope: LocalPbiProofObjectScopeV115;
    receizId: string;
    kaiUpulse: string;
    history: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  }>,
): LocalPbiProofObjectScopeV115 | null {
  const scope = normalizeLocalPbiProofObjectScopeV115(args.scope);
  const receizId = normalizeHex64(args.receizId);
  const kaiUpulse = args.kaiUpulse.trim();
  const predecessorProofHead =
    args.history.at(-1)?.appendHeadSha256 ?? args.context.baseProofHead;
  if (
    !scope
    || !receizId
    || scope.predecessorArtifactSha256 !== args.context.artifactSha256
    || scope.predecessorProofHead !== predecessorProofHead
    || scope.receizId !== receizId
    || scope.authorshipPosition !== args.history.length
    || scope.kaiUpulse !== kaiUpulse
  ) {
    return null;
  }
  return scope;
}

export function receiptAsPortableJson(proof: LocalPbiAuthorshipProofV1): PortableJson {
  return JSON.parse(jcsCanonicalize(proof.receipt)) as PortableJson;
}

function samePortableJson(left: unknown, right: unknown): boolean {
  try {
    return jcsCanonicalize(left) === jcsCanonicalize(right);
  } catch {
    return false;
  }
}

export async function verifyOfflinePbiProofObjectAppend(args: Readonly<{
  verifiedArtifact: ReceizArtifactVerificationResult;
  proofObjectScope: LocalPbiProofObjectScopeV115;
  receizId: string;
  kaiUpulse: string;
  history: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  localPbiProof: LocalPbiAuthorshipProofV1;
  append: ReceizPbiProofObjectAuthorshipAppendV1;
  verifyAssertion?: LocalProofVerifier;
}>): Promise<VerifiedOfflinePbiProofObjectAppend | null> {
  const context = verifiedArtifactContext(args.verifiedArtifact);
  if (!context || !await verifyReceizPbiProofObjectAuthorshipChainV1(args.history)) return null;
  const scope = exactScope({
    context,
    scope: args.proofObjectScope,
    receizId: args.receizId,
    kaiUpulse: args.kaiUpulse,
    history: args.history,
  });
  if (!scope) return null;
  const verifyAssertion = args.verifyAssertion ?? verifyLocalPbiAssertion;
  if (!await verifyLocalPbiAuthorshipProof(args.localPbiProof, verifyAssertion)) return null;
  const proof = args.localPbiProof;
  const append = args.append;
  if (
    proof.input.slug !== context.slug
    || proof.input.code !== context.code
    || proof.input.pulse !== context.pulse
    || proof.input.claimHashHex !== context.claimHashHex
    || jcsCanonicalize(proof.input.proofObjectScope) !== jcsCanonicalize(scope)
    || append.position !== scope.authorshipPosition
    || append.predecessorArtifactSha256 !== scope.predecessorArtifactSha256
    || append.predecessorProofHead !== scope.predecessorProofHead
    || append.claimHashHex !== context.claimHashHex
    || append.slug !== context.slug
    || append.code !== context.code
    || append.pulse !== context.pulse
    || append.receizId !== scope.receizId
    || append.credentialId !== proof.assertion.credIdB64Url
    || append.credentialPublicKeyPem !== proof.assertion.pubKeyPem
    || !samePortableJson(append.pbiReceipt, proof.receipt)
    || append.pbiReceiptHash !== proof.pbiReceiptHash
    || append.signedAt !== proof.verifiedAt
    || append.kaiUpulse !== scope.kaiUpulse
    || !await verifyReceizPbiProofObjectAuthorshipChainV1([...args.history, append])
  ) {
    return null;
  }
  return Object.freeze({ append, localPbiProof: proof });
}

