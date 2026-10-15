import { isRuntimeVerifiedReceizProofHistory, type ReceizProofHistoryNode, type ReceizVerifiedProofHistory } from "./proofHistory.js";
import { canonicalizeReceizConstitution, type ReceizConstitutionJson } from "./constitution.js";
import { receizBase64UrlDecode, verifyReceizIdentityPublicKeyProjectionSignature } from "./identity.js";
import { sha256ReceizBytes } from "./artifacts.js";

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.trim() === value;
const hex64 = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
const canonical = (value: unknown): string => canonicalizeReceizConstitution(value as ReceizConstitutionJson);

/** Package-internal projection beneath an admitted enclosing artifact history.
 * This is signed ownership-action timing, not an independent KKS proof. */
export async function readReceizProofHistoryOwnershipConsentCoordinateV129(
  node: ReceizProofHistoryNode,
  history: ReceizVerifiedProofHistory,
): Promise<Readonly<{ kaiUPulse: string; kaiPulse: string }> | null> {
  if (!isRuntimeVerifiedReceizProofHistory(history)) throw new TypeError("HISTORY_NOT_VERIFIED");
  try {
    const member = history.nodes.find((candidate) => candidate.nodeDigest === node.nodeDigest);
    if (!member || canonical(member) !== canonical(node) || node.event.type !== "ownership.transition") return null;
    const receipt = node.receipt;
    if (!record(receipt) || !record(receipt.envelope) || !record(receipt.identityBinding)) return null;
    const envelope = receipt.envelope, binding = receipt.identityBinding;
    if (envelope.schema !== "receiz.local.signed-action.v1" || !hex64(receipt.actionId)
      || envelope.actionId !== receipt.actionId || !record(envelope.actor) || !record(envelope.request)
      || !text(receipt.challengeB64Url) || !text(receipt.signatureB64Url)) return null;
    const actor = envelope.actor, request = envelope.request;
    // These are the same exact challenge/request/body mechanics used by the
    // implemented verifyLocalSignedAction and verifyOwnershipSendConsent paths.
    const challenge = new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(receipt.challengeB64Url));
    if (canonical(envelope) !== challenge || request.method !== "POST"
      || request.path !== "/api/receiz/ownership/transfer" || request.contentType !== "application/json"
      || request.replayable !== true || !text(request.bodyReplayText) || request.bodyReplayText.length > 96_000
      || !hex64(request.bodyHashHex) || !text(actor.uid) || !text(actor.localUid)) return null;
    const body = request.bodyReplayText;
    const command: unknown = JSON.parse(body);
    if (!record(command) || canonical(command) !== body
      || await sha256ReceizBytes(new TextEncoder().encode(body)) !== request.bodyHashHex
      || command.action !== "source-ownership-send" || !hex64(command.operationId)
      || !text(command.sourceIdentity) || !hex64(command.predecessorArtifactSha256) || !text(command.predecessorHead)
      || !text(command.previousOwnerReceizId) || !text(command.senderActorId)
      || typeof command.recipient !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/u.test(command.recipient)
      || !text(command.recipientOwnerReceizId) || command.recipientOwnerReceizId === command.previousOwnerReceizId
      || typeof command.kaiUpulse !== "string" || !/^(0|[1-9][0-9]*)$/u.test(command.kaiUpulse)) return null;
    if (binding.schema !== "receiz.verified-actor-identity-binding.v124" || binding.signatureVerified !== true
      || !hex64(binding.artifactSha256) || !hex64(binding.payloadSha256) || !hex64(binding.registryDigest)
      || !hex64(binding.keyId) || !text(binding.publicKeyRawB64u)
      || (binding.alg !== "Ed25519" && binding.alg !== "P-256")
      || actor.uid !== binding.actorId || actor.receizKeyId !== binding.keyId || actor.publicKeyRawB64u !== binding.publicKeyRawB64u
      || command.senderActorId !== binding.actorId
      || ![binding.artifactOwnerReceizId, binding.identityOwnerReceizId].includes(command.previousOwnerReceizId)
      || node.event.fromOwnerReceizId !== command.previousOwnerReceizId
      || node.event.toOwnerReceizId !== command.recipientOwnerReceizId
      // Historical ownership nodes stored the signed exact decimal in kaiPulse.
      // Do not reinterpret a whole pulse as micro precision or rewrite its digest.
      || node.kaiPulse !== command.kaiUpulse) return null;
    if (!await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: binding.keyId, alg: binding.alg,
      publicKeyRawB64u: binding.publicKeyRawB64u, challengeB64Url: receipt.challengeB64Url,
      signatureB64Url: receipt.signatureB64Url })) return null;
    return Object.freeze({ kaiUPulse: command.kaiUpulse, kaiPulse: (BigInt(command.kaiUpulse) / 1_000_000n).toString() });
  } catch {
    return null;
  }
}
