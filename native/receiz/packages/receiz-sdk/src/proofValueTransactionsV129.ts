import { verifyReceizArtifactAdmission, createReceizArtifactAdmissionEngine, reverifyReceizArtifactWithAdmissionContext,
  type ReceizIdentityPublicBinding } from "./artifactAdmission.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { verifyReceizArtifact, readRuntimeCustodiedReceizArtifactCanonicalOpen } from "./artifactVerification.js";
import { sha256ReceizBytes } from "./artifacts.js";
import { isSdkIssuedReceizCommittedArtifactTransition, readSdkIssuedReceizCommittedArtifactTransitionCustody,
  readReceizArtifactAppendPlannedEvent, type ReceizCommittedArtifactTransition } from "./artifactTransition.js";
import type { ReceizAppendReceipt } from "./artifactTransitionStore.js";
import { receizBase64UrlDecode, receizBase64UrlEncode, verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizPortableState } from "./identity.js";
import { parseReceizPortableAssetDocument } from "./portableAssetReader.js";
import { readReceizProofHistoryExactKksCoordinate, verifyReceizProofHistory, createReceizArtifactTransitionProofHistoryAppendNode,
  normalizeReceizProofHistory, transportReceizProofHistory,
  type ReceizProofHistory, type ReceizProofHistoryNode } from "./proofHistory.js";
import { readReceizProofHistoryOwnershipConsentCoordinateV129 } from "./proofHistoryOwnershipConsentV129.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { validateReceizValueIntentV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";
import { closedRecord, digest, freeze, text, validateReceizOperationPlanV124 } from "./v124Contracts.js";
import { planAtomicOperationV124, type ReceizRegisteredOperationV124 } from "./v124Execution.js";
import { createReceizPortableExecutionAuthorityEventV124, inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124,
  type ReceizPortableExecutionOutcomeCoordinatesV124, type ReceizPortableExecutionTransitionRecoveryV124,
  type ReceizPortableExecutionTransitionMemberV124 } from "./v124PortableAuthority.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import { RECEIZ_ARTIFACT_INPUT_MAX_BYTES } from "./artifactInput.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { capabilitySigningBytes } from "./capabilityAuthority.js";
import { reduceReceizNamespace, composeReceizNamespaceReductionPayload } from "./namespaceReducer.js";
import { replaceReceizPortableProofHistoryBytes } from "./portableAsset.js";
import { readReceizDomainReplaySegmentSourceV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import type { ReceizConstitutionJson } from "./constitution.js";
import { isSegmentedReceizPortableStateRef, materializeReceizPortableStateRef,
  receizPortableSegmentSignatureBytes } from "./portableStateSegments.js";

/** A reference projection beneath the existing sealed ownership transition and atomic operation. */
export type ReceizProofValueAtomicSaleBindingV129 = Readonly<{
  schema: "proof-value.atomic-sale-binding.v129";
  assetId: string;
  ownershipNodeDigest: string;
  buyerReceizId: string;
  sellerReceizId: string;
  valueIntentDigest: string;
  paymentSourceParticipantId: string;
  paymentDestinationParticipantId: string;
  deliveryParticipantId: string;
}>;

/** The receipt remains subordinate to its enclosing, admitted ownership proof. */
export type ReceizProofValueAcceptedDeliveryBindingV129 = Readonly<{
  schema: "proof-value.accepted-delivery.v129";
  assetId: string;
  buyerReceizId: string;
  sellerReceizId: string;
  valueIntentDigest: string;
  semanticIdempotencyKey: string;
}>;

export type ReceizProofValuePrivateSaleRecoveryV129 = Readonly<{
  schema: "receiz.proof-value-sale-recovery.v129";
  recovery: ReceizPortableExecutionTransitionRecoveryV124;
  /** Exact preimage of outcomeCoordinatesDigest already carried by every sealed execution event. */
  outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
}>;
export type ReceizProofValuePublicSaleRecoveryV129 = Readonly<{
  schema: "receiz.proof-value-public-sale-recovery.v129";
  sourceArtifact: ReceizPortableSealedArtifactV124;
  applicationId: string;
  audience: string;
  domainId: string;
}>;
export type ReceizProofValueSaleRecoveryV129 = ReceizProofValuePrivateSaleRecoveryV129 | ReceizProofValuePublicSaleRecoveryV129;
type PublicMember = Omit<ReceizPortableExecutionTransitionMemberV124, "identityArtifact"> & Readonly<{
  identityBinding: ReceizIdentityPublicBinding;
  issuerKeyState: ReceizProofValuePublicIssuerKeyStateV129;
}>;
export type ReceizProofValuePublicIssuerKeyStateV129 = Readonly<Pick<ReceizPortableState, "schema" | "exportedAt" | "snapshot" | "proof">>;
/** Data to carry as an exact append inside the existing public sealed domain replay source.
 * This value alone is not evidence and never authorizes or completes a sale. */
export type ReceizProofValuePublicSaleEvidenceV129 = Readonly<{
  schema: "proof-value.completed-atomic-sale-public.v129";
  outcomeCoordinates: ReceizPortableExecutionOutcomeCoordinatesV124;
  transitionSet: Omit<ReceizPortableExecutionTransitionRecoveryV124["transitionSet"], "members"> & Readonly<{ members: readonly PublicMember[] }>;
  members: ReceizPortableExecutionTransitionRecoveryV124["members"];
}>;

export type ReceizProofValueOwnershipChangeV129 = Readonly<{
  assetId: string;
  claimHead: string;
  parentHeads: readonly string[];
  previousOwnerReceizId: string;
  currentOwnerReceizId: string;
  kaiUPulse: string | null;
  kaiPulse: string;
  receiptDigest: string;
  paymentAmountPhiMicro: null;
}>;
export type ReceizProofValueTransactionReferenceV129 = Readonly<{
  participantId: string;
  artifactDigest: string;
  acceptedHead: string;
  receiptDigest: string;
}>;
export type ReceizProofValueCompletedSaleV129 = Readonly<{
  saleDigest: string;
  assetId: string;
  deliveryHead: string;
  buyerReceizId: string;
  sellerReceizId: string;
  completionKaiUPulse: string | null;
  completionKaiPulse: string;
  amountPhiMicro: string;
  usdPerPhiMicrocents: string;
  quotedUsdCents: string;
  priceBasisDigest: string;
  valueIntentDigest: string;
  atomicPlanDigest: string;
  paymentReferences: readonly ReceizProofValueTransactionReferenceV129[];
  acceptedDeliveryReference: ReceizProofValueTransactionReferenceV129;
}>;
export type ReceizProofValueIncompleteHistoryV129 = Readonly<{
  code: "proof-history-unavailable" | "sale-join-unavailable" | "sale-proof-unavailable";
  assetId: string | null;
  reference: string | null;
}>;
export type ReceizProofValueTransactionsV129 = Readonly<{
  ownershipChanges: readonly ReceizProofValueOwnershipChangeV129[];
  completedSales: readonly ReceizProofValueCompletedSaleV129[];
  incompleteHistory: readonly ReceizProofValueIncompleteHistoryV129[];
}>;
export type ReceizProofValueCommittedAtomicSaleEvidenceV129 = Readonly<{
  kind: "committed-atomic-sale";
  sourceRecovery: ReceizProofValuePrivateSaleRecoveryV129;
  transitions: readonly Readonly<{ participantId: string; transition: ReceizCommittedArtifactTransition }>[];
  publicRecovery?: ReceizProofValuePublicSaleRecoveryV129;
}>;
/** Object identity is issued only by the pinned-root, read-only recovery verifier. */
export type ReceizProofValueVerifiedSaleRecoveryV129 = Readonly<{
  kind: "verified-sale-recovery";
  recoveryDigest: string;
  authority: Readonly<{ projectionIsProofAuthority: false; committedCustodyIssued: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;
export type ReceizProofValueSaleEvidenceV129 = ReceizProofValueCommittedAtomicSaleEvidenceV129 | ReceizProofValueVerifiedSaleRecoveryV129;

type Member = Readonly<{
  participantId: string;
  assetId: string;
  ownerReceizId: string | null;
  history: ReceizProofHistory;
  artifactDigest: string;
  receipt: ReceizAppendReceipt;
  event: unknown;
}>;
type SaleRead = Readonly<{ sale: ReceizProofValueCompletedSaleV129 | null; ownershipNode: ReceizProofHistoryNode | null;
  sourceRecovery: ReceizProofValueSaleRecoveryV129 }>;
const recoveredSaleCustody = new WeakMap<object, SaleRead>();
const MAX_SALE_EVIDENCE = 256;

function fail(code: string): never { throw new TypeError(`PROOF_VALUE_V129_${code}`); }
function same(left: unknown, right: unknown): boolean { return canonicalizeReceizV122(left) === canonicalizeReceizV122(right); }
function record(value: unknown): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("TRANSACTION_SOURCE_INVALID");
  return value as Readonly<Record<string, unknown>>;
}
function assertPublicPayload(value: unknown, seen = new Set<object>(), publicIdentityProjections: ReadonlySet<object> = new Set(), withinIssuerState = false): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  const carried = value as Record<string, unknown>;
  const schema = String(carried.schema ?? carried.kind ?? "");
  const issuerState = withinIssuerState || publicIdentityProjections.has(value) && schema === "receiz.identity-key-state.v113";
  if (Array.isArray(value)) { for (const entry of value) assertPublicPayload(entry, seen, publicIdentityProjections, issuerState); return; }
  // This exact public signed state is independently checked for its sealed
  // predecessor reference, closed coordinates and identity signature below.
  const publicIssuerState = issuerState && ["receiz.identity-key-state.v113", "receiz.account.state.segmented-ref.v1",
    "receiz.account.state.segment-composite.v1", "receiz.account.state.segment-proof.v1"].includes(schema);
  const publicLoginProof = publicIdentityProjections.has(value) && schema === "receiz.identity.login_proof.v1"
    && Object.keys(carried).sort().join(",") === "alg,challengeB64Url,keyId,schema,signatureB64Url";
  if (!publicIssuerState && !publicLoginProof && /^receiz\.(identity|key|conversation|chat|profile-showcase|economy-showcase|account\.(state|portable)|device\.identity|sdk\.identity_account_projection)([.-]|$)/u.test(schema)) {
    fail("PRIVATE_SOURCE_NOT_PUBLIC_REPLAY");
  }
  for (const [key, entry] of Object.entries(carried)) {
    if (/^(?:privateKeyPkcs8|privateKeyPkcs8B64u|privateKeyPkcs8CiphertextB64u|accessToken|refreshToken|bearerToken|clientSecret|client_secret|access_token|refresh_token|privateConversationHistory|conversationHistory)$/u.test(key)) fail("PRIVATE_SOURCE_NOT_PUBLIC_REPLAY");
    assertPublicPayload(entry, seen, publicIdentityProjections, issuerState);
  }
}
async function assertPublicPortableAdmission(admission: ReceizVerifiedArtifactAdmission): Promise<void> {
  const document = await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(admission.verifiedPayload.bytes)));
  assertPublicPayload(document);
  // Public collectible payloads retain their exact media bytes. Recognized
  // JSON private state is rejected rather than stripped from a sealed source.
  try { assertPublicPayload(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(document.payload.bytesBase64Url)))); }
  catch (error) { if (error instanceof TypeError && error.message.startsWith("PROOF_VALUE_V129_")) throw error; }
}
function historyNode(history: ReceizProofHistory, head: string): ReceizProofHistoryNode {
  const node = history.nodes.find((candidate) => candidate.nodeDigest === head);
  if (!node) fail("HISTORY_HEAD_NOT_CARRIED");
  return node;
}

/** Stable causal ordering, independent of journal array arrival and wall time. */
function orderedHistory(history: ReceizProofHistory): readonly ReceizProofHistoryNode[] {
  const nodes = new Map(history.nodes.map((node) => [node.nodeDigest, node]));
  const emitted = new Set<string>();
  const output: ReceizProofHistoryNode[] = [];
  while (emitted.size < nodes.size) {
    const next = [...nodes.values()].filter((node) => !emitted.has(node.nodeDigest)
      && node.parentDigests.every((parent) => emitted.has(parent))).sort((a, b) => a.nodeDigest.localeCompare(b.nodeDigest));
    if (next.length === 0) fail("HISTORY_CAUSAL_PARENTS_INVALID");
    for (const node of next) { emitted.add(node.nodeDigest); output.push(node); }
  }
  return output;
}

function readSourceRecovery(value: unknown): ReceizProofValuePrivateSaleRecoveryV129 {
  const holder = closedRecord(value, ["schema", "recovery", "outcomeCoordinates"], "PROOF_VALUE_V129_SALE_RECOVERY_INVALID");
  if (holder.schema !== "receiz.proof-value-sale-recovery.v129") fail("SALE_RECOVERY_INVALID");
  const coordinates = closedRecord(holder.outcomeCoordinates, ["schema", "status", "executionId", "applicationId", "domainId",
    "operationKind", "exactPlanDigest", "semanticIdempotencyKey", "attemptId", "terminalAtKaiUPulse"], "PROOF_VALUE_V129_SALE_COMPLETION_INVALID");
  if (coordinates.schema !== "receiz.execution-outcome.v124" || coordinates.status !== "committed"
    || !Number.isSafeInteger(coordinates.terminalAtKaiUPulse) || (coordinates.terminalAtKaiUPulse as number) < 0) fail("SALE_COMPLETION_INVALID");
  for (const field of ["executionId", "applicationId", "domainId", "operationKind", "semanticIdempotencyKey", "attemptId"]) text(coordinates[field], "PROOF_VALUE_V129_SALE_COMPLETION_INVALID");
  digest(coordinates.exactPlanDigest, "PROOF_VALUE_V129_SALE_COMPLETION_INVALID");
  const recovery = closedRecord(holder.recovery, ["schema", "transitionSet", "members", "authority"], "PROOF_VALUE_V129_SALE_RECOVERY_INVALID");
  if (recovery.schema !== "receiz.portable-execution-transition-recovery.v124" || !Array.isArray(recovery.members)
    || recovery.members.length < 1 || recovery.members.length > 64) fail("SALE_RECOVERY_INVALID");
  const recoveryAuthority = closedRecord(recovery.authority, ["recoveryIsProofAuthority", "receiptIsProofAuthority", "strongerTruth"], "PROOF_VALUE_V129_SALE_RECOVERY_INVALID");
  const transitionSet = closedRecord(recovery.transitionSet, ["schema", "applicationId", "exactPlanDigest", "expectedParticipantHeads",
    "proposedParticipantHeads", "members", "authority"], "PROOF_VALUE_V129_SALE_RECOVERY_INVALID");
  const setAuthority = closedRecord(transitionSet.authority, ["transitionSetIsProofAuthority", "committed", "strongerTruth"], "PROOF_VALUE_V129_SALE_RECOVERY_INVALID");
  if (recoveryAuthority.recoveryIsProofAuthority !== false || recoveryAuthority.receiptIsProofAuthority !== false
    || recoveryAuthority.strongerTruth !== "sealed-receiz-proof-object" || setAuthority.transitionSetIsProofAuthority !== false
    || setAuthority.committed !== false || setAuthority.strongerTruth !== "sealed-receiz-proof-object"
    || transitionSet.schema !== "receiz.portable-execution-transition-set.v124" || !Array.isArray(transitionSet.members)
    || transitionSet.members.length !== recovery.members.length) fail("SALE_RECOVERY_INVALID");
  return freeze(structuredClone(holder)) as unknown as ReceizProofValuePrivateSaleRecoveryV129;
}

async function exactWireBytes(wire: ReceizPortableExecutionTransitionMemberV124["candidate"]): Promise<Uint8Array> {
  const source = closedRecord(wire, ["schema", "exactBytesB64u", "filename", "mimeType", "artifactSha256", "payloadSha256"], "PROOF_VALUE_V129_SEALED_SOURCE_INVALID");
  if (source.schema !== "receiz.sealed-artifact-bytes.v124") fail("SEALED_SOURCE_INVALID");
  const encoded = text(source.exactBytesB64u, "PROOF_VALUE_V129_SEALED_SOURCE_INVALID");
  if (encoded.length > Math.ceil(RECEIZ_ARTIFACT_INPUT_MAX_BYTES * 4 / 3)) fail("SEALED_SOURCE_LIMIT_EXCEEDED");
  const bytes = receizBase64UrlDecode(encoded);
  if (bytes.length > RECEIZ_ARTIFACT_INPUT_MAX_BYTES) fail("SEALED_SOURCE_LIMIT_EXCEEDED");
  if (await sha256ReceizBytes(bytes) !== source.artifactSha256) fail("SEALED_SOURCE_DIGEST_MISMATCH");
  return bytes;
}

async function sourceEventsMatch(source: ReceizProofValuePrivateSaleRecoveryV129, members: readonly Member[]): Promise<void> {
  const wire = source.recovery.transitionSet;
  if (!Array.isArray(wire.members) || wire.members.length !== members.length || wire.members.length !== source.recovery.members.length) fail("SALE_PARTICIPANT_SET_MISMATCH");
  const ids = Object.keys(wire.expectedParticipantHeads);
  if (!same(ids, members.map((member) => member.participantId)) || !same(ids, Object.keys(wire.proposedParticipantHeads))) fail("SALE_PARTICIPANT_SET_MISMATCH");
  for (let index = 0; index < members.length; index++) {
    const member = members[index]!;
    const transported = wire.members[index]!;
    if (transported.participantId !== member.participantId || source.recovery.members[index]!.participantId !== member.participantId
      || wire.expectedParticipantHeads[member.participantId] !== member.receipt.priorHead.value
      || wire.proposedParticipantHeads[member.participantId] !== member.receipt.acceptedHead.value) fail("SALE_PARTICIPANT_HEAD_MISMATCH");
    const expectedEvent = await createReceizPortableExecutionAuthorityEventV124({ participantId: member.participantId,
      operationPlan: transported.operationPlan,
      request: { schema: "receiz.execution-authority-request.v124", phase: "resolve", method: "GET",
        path: `/api/sdk/v1/execution/${source.outcomeCoordinates.applicationId}/${encodeURIComponent(source.outcomeCoordinates.executionId)}`, body: null },
      outcomeCoordinates: source.outcomeCoordinates });
    // Stage/execute requests also carry the same independently sealed outcome
    // digest. Their exact request digest remains checked by the existing source
    // recovery inspector, rather than replaced with a fabricated GET request.
    if (!same(record(member.event).outcomeCoordinatesDigest, expectedEvent.outcomeCoordinatesDigest)
      || record(member.event).schema !== expectedEvent.schema
      || record(member.event).participantId !== member.participantId
      || record(member.event).applicationId !== expectedEvent.applicationId
      || record(member.event).exactPlanDigest !== expectedEvent.exactPlanDigest
      || !same(member.event, transported.planning.event)) fail("SEALED_COMPLETION_BINDING_MISMATCH");
    const exact = await readReceizProofHistoryExactKksCoordinate(historyNode(member.history, member.receipt.acceptedHead.value));
    if (exact && exact.kaiUpulse !== String(source.outcomeCoordinates.terminalAtKaiUPulse)) fail("SALE_EXACT_COMPLETION_MISMATCH");
  }
}

async function classifySale(sourceRecovery: ReceizProofValuePrivateSaleRecoveryV129, members: readonly Member[]): Promise<SaleRead> {
  await sourceEventsMatch(sourceRecovery, members);
  const wire = sourceRecovery.recovery.transitionSet;
  const plan = await validateReceizOperationPlanV124(wire.members[0]!.operationPlan);
  for (const member of wire.members) if (!same(member.operationPlan, plan)) fail("ATOMIC_PLAN_SUBSTITUTION");
  if (plan.exactPlanDigest !== wire.exactPlanDigest || plan.applicationId !== wire.applicationId
    || !same(plan.expectedParticipantHeads, wire.expectedParticipantHeads)) fail("ATOMIC_PLAN_BINDING_MISMATCH");
  const parsed = record(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(plan.exactPlanBytesB64u))));
  if (parsed.schema !== "receiz.atomic-operation.v124" || !Array.isArray(parsed.operations)) fail("ATOMIC_PLAN_REQUIRED");
  const replanned = await planAtomicOperationV124({ applicationId: plan.applicationId,
    operations: parsed.operations as readonly ReceizRegisteredOperationV124[], participants: parsed.participants as readonly string[],
    expectedParticipantHeads: plan.expectedParticipantHeads, semanticIdempotencyKey: plan.semanticIdempotencyKey, attemptId: plan.attemptId });
  if (!same(replanned, plan)) fail("ATOMIC_PLAN_CANONICAL_BINDING_MISMATCH");
  const operations = parsed.operations as readonly ReceizRegisteredOperationV124[];
  const bindings = operations.filter((operation) => operation.category === "custom"
    && record(record(operation.payload).operation).schema === "proof-value.atomic-sale-binding.v129");
  if (bindings.length !== 1) return freeze({ sale: null, ownershipNode: null, sourceRecovery });
  const binding = closedRecord(record(bindings[0]!.payload).operation, ["schema", "assetId", "ownershipNodeDigest", "buyerReceizId",
    "sellerReceizId", "valueIntentDigest", "paymentSourceParticipantId", "paymentDestinationParticipantId", "deliveryParticipantId"], "PROOF_VALUE_V129_SALE_JOIN_INVALID") as unknown as ReceizProofValueAtomicSaleBindingV129;
  for (const field of ["assetId", "buyerReceizId", "sellerReceizId", "paymentSourceParticipantId", "paymentDestinationParticipantId", "deliveryParticipantId"] as const) text(binding[field], "PROOF_VALUE_V129_SALE_JOIN_INVALID");
  digest(binding.ownershipNodeDigest, "PROOF_VALUE_V129_SALE_JOIN_INVALID");
  digest(binding.valueIntentDigest, "PROOF_VALUE_V129_SALE_JOIN_INVALID");
  if (binding.buyerReceizId === binding.sellerReceizId || new Set([binding.paymentSourceParticipantId, binding.paymentDestinationParticipantId, binding.deliveryParticipantId]).size !== 3) fail("SALE_PARTICIPANT_BINDING_MISMATCH");
  const payment = operations.filter((operation) => operation.category === "settlement" && record(operation.payload).valueIntentDigest === binding.valueIntentDigest);
  if (payment.length !== 1) fail("SALE_PAYMENT_MISSING");
  const intent = payment[0]!.payload as ReceizWorldValueIntentV122;
  if (intent.rail !== "settlement" || !await validateReceizValueIntentV122(intent)) fail("SALE_PAYMENT_INVALID");
  if (!same([...payment[0]!.participants].sort(), [binding.paymentSourceParticipantId, binding.paymentDestinationParticipantId].sort())
    || !same(bindings[0]!.participants, [binding.deliveryParticipantId])) fail("SALE_PARTICIPANT_BINDING_MISMATCH");
  const source = members.find((member) => member.participantId === binding.paymentSourceParticipantId);
  const destination = members.find((member) => member.participantId === binding.paymentDestinationParticipantId);
  const delivery = members.find((member) => member.participantId === binding.deliveryParticipantId);
  if (!source || !destination) fail("SALE_PAYMENT_MISSING");
  if (!delivery) fail("SALE_DELIVERY_MISSING");
  if (source.assetId !== intent.sourceProofObjectId || destination.assetId !== intent.destinationSubjectId
    || source.ownerReceizId !== binding.buyerReceizId || destination.ownerReceizId !== binding.sellerReceizId
    || delivery.ownerReceizId !== binding.buyerReceizId || delivery.assetId !== binding.assetId
    || source.receipt.priorHead.value !== intent.sourceValueHead || destination.receipt.priorHead.value !== intent.expectedDestinationHead) fail("SALE_PARTICIPANT_BINDING_MISMATCH");
  const ownershipNode = historyNode(delivery.history, binding.ownershipNodeDigest);
  if (ownershipNode.event.type !== "ownership.transition" || ownershipNode.event.fromOwnerReceizId !== binding.sellerReceizId
    || ownershipNode.event.toOwnerReceizId !== binding.buyerReceizId || delivery.history.currentOwnerReceizId !== binding.buyerReceizId) fail("SALE_ACCEPTED_OWNERSHIP_REQUIRED");
  const acceptedBinding = closedRecord(ownershipNode.receipt, ["schema", "assetId", "buyerReceizId", "sellerReceizId", "valueIntentDigest", "semanticIdempotencyKey"], "PROOF_VALUE_V129_SALE_DELIVERY_JOIN_REQUIRED") as unknown as ReceizProofValueAcceptedDeliveryBindingV129;
  if (acceptedBinding.schema !== "proof-value.accepted-delivery.v129" || acceptedBinding.assetId !== binding.assetId
    || acceptedBinding.buyerReceizId !== binding.buyerReceizId || acceptedBinding.sellerReceizId !== binding.sellerReceizId
    || acceptedBinding.valueIntentDigest !== intent.valueIntentDigest || acceptedBinding.semanticIdempotencyKey !== plan.semanticIdempotencyKey) fail("SALE_DELIVERY_JOIN_REQUIRED");
  const ownershipCoordinate = await readReceizProofHistoryExactKksCoordinate(ownershipNode);
  if (ownershipCoordinate ? BigInt(ownershipCoordinate.kaiUpulse) > BigInt(sourceRecovery.outcomeCoordinates.terminalAtKaiUPulse)
    : BigInt(ownershipNode.kaiPulse) > BigInt(sourceRecovery.outcomeCoordinates.terminalAtKaiUPulse) / 1_000_000n) fail("SALE_DELIVERY_AFTER_COMPLETION");
  const reference = async (member: Member): Promise<ReceizProofValueTransactionReferenceV129> => freeze({ participantId: member.participantId,
    artifactDigest: member.artifactDigest, acceptedHead: member.receipt.acceptedHead.value, receiptDigest: await digestReceizCanonicalV122(member.receipt) });
  const basis = freeze({ assetId: binding.assetId, deliveryHead: ownershipNode.nodeDigest, buyerReceizId: binding.buyerReceizId,
    sellerReceizId: binding.sellerReceizId, completionKaiUPulse: String(sourceRecovery.outcomeCoordinates.terminalAtKaiUPulse),
    completionKaiPulse: (BigInt(sourceRecovery.outcomeCoordinates.terminalAtKaiUPulse) / 1_000_000n).toString(), amountPhiMicro: intent.amountPhiMicro,
    usdPerPhiMicrocents: intent.usdPerPhiMicrocents, quotedUsdCents: intent.quotedUsdCents, priceBasisDigest: intent.priceBasisDigest,
    valueIntentDigest: intent.valueIntentDigest, atomicPlanDigest: plan.exactPlanDigest,
    paymentReferences: freeze(await Promise.all([source, destination].map(reference))), acceptedDeliveryReference: await reference(delivery) });
  const sale = freeze({ ...basis, saleDigest: await digestReceizCanonicalV122({ schema: "receiz.proof-value-completed-sale.v129", ...basis }) });
  return freeze({ sale, ownershipNode, sourceRecovery });
}

async function readRuntimeSale(evidence: ReceizProofValueCommittedAtomicSaleEvidenceV129): Promise<SaleRead> {
  evidence = snapshotRuntimeEvidence(evidence);
  const source = readSourceRecovery(evidence.sourceRecovery);
  if (!Array.isArray(evidence.transitions) || evidence.transitions.length !== source.recovery.members.length) fail("SALE_PARTICIPANT_SET_MISMATCH");
  const transitions = evidence.transitions.map((entry) => {
    const fields = closedRecord(entry, ["participantId", "transition"], "PROOF_VALUE_V129_SALE_EVIDENCE_INVALID");
    return freeze({ participantId: fields.participantId as string, transition: fields.transition as ReceizCommittedArtifactTransition });
  });
  const members: Member[] = [];
  for (let index = 0; index < transitions.length; index++) {
    const entry = transitions[index]!;
    if (!isSdkIssuedReceizCommittedArtifactTransition(entry.transition) || !entry.transition.committed) fail("COMMITTED_TRANSITION_NOT_SDK_ISSUED");
    const custody = readSdkIssuedReceizCommittedArtifactTransitionCustody(entry.transition);
    const admission = await verifyReceizArtifactAdmission(custody.admission);
    if ("code" in admission || admission.profile !== "portable-state" || !entry.transition.history) fail("SALE_SOURCE_NOT_ADMITTED");
    const verified = await verifyReceizProofHistory(entry.transition.history);
    const recoveryMember = source.recovery.members[index]!;
    const transported = source.recovery.transitionSet.members[index]!;
    if (!transported || recoveryMember.participantId !== entry.participantId || transported.participantId !== entry.participantId
      || !same(custody.plan, recoveryMember.commitUnit.plan) || !same(entry.transition.receipt, recoveryMember.receipt)
      || custody.plan.actor.actorId !== admission.ownerReceizId
      || transported.predecessor.artifactSha256 !== admission.artifactSha256
      || transported.candidate.artifactSha256 !== entry.transition.artifactDigest.value
      || recoveryMember.commitUnit.command.candidateArtifactDigest.value !== entry.transition.artifactDigest.value) fail("COMMITTED_SOURCE_BINDING_MISMATCH");
    await exactWireBytes(transported.predecessor);
    const candidateBytes = await exactWireBytes(transported.candidate);
    if (await sha256ReceizBytes(new Uint8Array(await entry.transition.artifact.artifact.arrayBuffer())) !== transported.candidate.artifactSha256
      || await sha256ReceizBytes(candidateBytes) !== entry.transition.artifactDigest.value) fail("COMMITTED_SOURCE_BINDING_MISMATCH");
    members.push(freeze({ participantId: entry.participantId, assetId: admission.artifactId, ownerReceizId: admission.ownerReceizId,
      history: verified, artifactDigest: entry.transition.artifactDigest.value, receipt: entry.transition.receipt,
      event: readReceizArtifactAppendPlannedEvent(custody.plan) }));
  }
  return classifySale(source, members);
}

/** Reconstructs a read-only projection using the SDK's pinned sealed-source verifier and existing recovery inspector. */
export async function verifyReceizProofValueSaleRecoveryV129(value: ReceizProofValueSaleRecoveryV129): Promise<ReceizProofValueVerifiedSaleRecoveryV129> {
  if (value.schema === "receiz.proof-value-public-sale-recovery.v129") return verifyPublicSaleRecovery(value);
  const source = readSourceRecovery(value);
  const members: Member[] = [];
  // Every payload is opened only after its complete enclosing artifact verifies.
  for (let index = 0; index < source.recovery.transitionSet.members.length; index++) {
    const transported = source.recovery.transitionSet.members[index]!;
    const bytes = await exactWireBytes(transported.candidate);
    const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], transported.candidate.filename,
      { type: transported.candidate.mimeType }));
    if (verification.status !== "verified-artifact") fail("SEALED_SOURCE_NOT_VERIFIED");
    const opened = await readRuntimeCustodiedReceizArtifactCanonicalOpen(verification, receizCurrentPinnedSignatureV4Roots());
    if (!opened) fail("SEALED_SOURCE_NOT_VERIFIED");
    const document = await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(opened.payloadBytes)));
    const history = document.receizProofHistory?.history;
    const receipt = source.recovery.members[index]?.receipt;
    if (!history || !receipt || document.payload.sha256 !== receipt.resource) fail("SALE_SOURCE_HISTORY_MISSING");
    const node = historyNode(history, receipt.acceptedHead.value);
    if (node.event.type !== "state.append") fail("SEALED_COMPLETION_BINDING_MISMATCH");
    const event = record(node.event.state).event;
    members.push(freeze({ participantId: transported.participantId, assetId: document.payload.sha256,
      ownerReceizId: document.ownership.ownerReceizId, history, artifactDigest: verification.artifactDigest.value, receipt, event }));
  }
  await sourceEventsMatch(source, members);
  const completionKai = (BigInt(source.outcomeCoordinates.terminalAtKaiUPulse) / 1_000_000n).toString();
  const inspected = await inspectReceizPortableExecutionTransitionRecoveryWithVerifierContextV124(source.recovery,
    { audience: source.outcomeCoordinates.applicationId, currentKai: completionKai });
  if (inspected.authority.committedCustodyIssued !== false) fail("READ_ONLY_RECOVERY_REQUIRED");
  await classifySale(source, members);
  // The legacy recovery inspector remains available beneath the SDK, but a
  // private identity file is not an exportable public sale replay source.
  return fail("SALE_PUBLIC_RECOVERY_UNAVAILABLE_PRIVATE_IDENTITY_SOURCE");
}

async function readSale(evidence: ReceizProofValueSaleEvidenceV129): Promise<SaleRead> {
  if (!evidence || typeof evidence !== "object") fail("SALE_EVIDENCE_INVALID");
  if (evidence.kind === "committed-atomic-sale") return readRuntimeSale(evidence);
  const recovered = recoveredSaleCustody.get(evidence);
  if (evidence.kind !== "verified-sale-recovery" || !recovered) fail("SALE_RECOVERY_NOT_SDK_VERIFIED");
  return recovered;
}

/** Public digest preimage projected from an existing, exact admitted identity source.
 * It is checked against the actor digest sealed in each committed participant. */
export async function exportReceizProofValueSalePublicEvidenceV129(
  evidence: ReceizProofValueCommittedAtomicSaleEvidenceV129,
): Promise<ReceizProofValuePublicSaleEvidenceV129> {
  evidence = snapshotRuntimeEvidence(evidence);
  const read = await readRuntimeSale(evidence);
  if (!read.sale) fail("SALE_JOIN_UNAVAILABLE");
  const source = read.sourceRecovery as ReceizProofValuePrivateSaleRecoveryV129;
  const members: PublicMember[] = [];
  for (let index = 0; index < evidence.transitions.length; index++) {
    const custody = readSdkIssuedReceizCommittedArtifactTransitionCustody(evidence.transitions[index]!.transition);
    await assertPublicPortableAdmission(custody.admission);
    const transported = source.recovery.transitionSet.members[index]!;
    const identity = transported.identityArtifact;
    const bytes = await exactWireBytes(identity);
    const canonical = await reverifyReceizArtifactWithAdmissionContext({ predecessorAdmission: custody.admission,
      candidateArtifact: { artifact: new Blob([new Uint8Array(bytes).buffer], { type: identity.mimeType }),
        filename: identity.filename, mimeType: identity.mimeType, artifactSha256: identity.artifactSha256, payloadSha256: identity.payloadSha256 } });
    const keyFile = record(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes)));
    const identityBinding: ReceizIdentityPublicBinding = freeze({ schema: "receiz.verified-actor-identity-binding.v124",
      artifactSha256: identity.artifactSha256, payloadSha256: identity.payloadSha256, artifactOwnerReceizId: custody.plan.actor.actorId,
      identityOwnerReceizId: text(record(keyFile.owner).uid, "PROOF_VALUE_V129_IDENTITY_PUBLIC_BINDING_INVALID"), actorId: custody.plan.actor.actorId,
      keyId: text(keyFile.keyId, "PROOF_VALUE_V129_IDENTITY_PUBLIC_BINDING_INVALID"), alg: text(keyFile.alg, "PROOF_VALUE_V129_IDENTITY_PUBLIC_BINDING_INVALID"),
      publicKeyRawB64u: text(record(keyFile.crypto).publicKeyRawB64u, "PROOF_VALUE_V129_IDENTITY_PUBLIC_BINDING_INVALID"),
      signatureVerified: true, registryDigest: custody.plan.actor.registryDigest.value });
    if (await digestReceizAuthority("identity", "receiz.verified-actor-identity-binding.v124", identityBinding) !== custody.plan.actor.evidenceDigest.value) fail("IDENTITY_PUBLIC_BINDING_MISMATCH");
    const issuerKeyState = record(keyFile.portableState) as unknown as ReceizProofValuePublicIssuerKeyStateV129;
    await verifyPublicIssuerKeyState(issuerKeyState, identityBinding, custody.admission, (BigInt(source.outcomeCoordinates.terminalAtKaiUPulse) / 1_000_000n).toString());
    const { identityArtifact: _privateIdentityArtifact, ...publicMember } = transported;
    members.push(freeze({ ...publicMember, identityBinding, issuerKeyState }));
  }
  const body = freeze({ schema: "proof-value.completed-atomic-sale-public.v129" as const,
    outcomeCoordinates: source.outcomeCoordinates, transitionSet: freeze({ ...source.recovery.transitionSet, members: freeze(members) }),
    members: source.recovery.members });
  assertPublicPayload(body, new Set(), new Set(members.flatMap((member) => [member.issuerKeyState, member.identityProof])));
  // This is projection data for the existing source author to seal. Its
  // presence in caller JSON never supplies replay or committed custody.
  return freeze(structuredClone(body));
}

function snapshotRuntimeEvidence(evidence: ReceizProofValueCommittedAtomicSaleEvidenceV129): ReceizProofValueCommittedAtomicSaleEvidenceV129 {
  const fields = closedRecord(evidence, ["kind", "sourceRecovery", "transitions", ...(Object.prototype.hasOwnProperty.call(evidence, "publicRecovery") ? ["publicRecovery"] : [])], "PROOF_VALUE_V129_SALE_EVIDENCE_INVALID");
  if (fields.kind !== "committed-atomic-sale" || !Array.isArray(fields.transitions) || fields.transitions.length > 64) fail("SALE_PARTICIPANT_SET_MISMATCH");
  return freeze({ kind: "committed-atomic-sale" as const, sourceRecovery: readSourceRecovery(fields.sourceRecovery),
    transitions: fields.transitions.map((entry) => {
      const fields = closedRecord(entry, ["participantId", "transition"], "PROOF_VALUE_V129_SALE_EVIDENCE_INVALID");
      return freeze({ participantId: fields.participantId as string, transition: fields.transition as ReceizCommittedArtifactTransition });
    }), ...(fields.publicRecovery === undefined ? {} : { publicRecovery: freeze(structuredClone(fields.publicRecovery)) as ReceizProofValuePublicSaleRecoveryV129 }) });
}

/** Package-internal: snapshot caller wire coordinates synchronously while
 * preserving genuine SDK transition and read-only recovery object identities. */
export function snapshotReceizProofValueSaleEvidenceV129(evidence: ReceizProofValueSaleEvidenceV129): ReceizProofValueSaleEvidenceV129 {
  if (!evidence || typeof evidence !== "object") fail("SALE_EVIDENCE_INVALID");
  const kind = Object.getOwnPropertyDescriptor(evidence, "kind");
  if (!kind || !kind.enumerable || !("value" in kind)) fail("SALE_EVIDENCE_INVALID");
  if (kind.value === "committed-atomic-sale") return snapshotRuntimeEvidence(evidence as ReceizProofValueCommittedAtomicSaleEvidenceV129);
  if (kind.value === "verified-sale-recovery" && recoveredSaleCustody.has(evidence)) return evidence;
  return fail("SALE_RECOVERY_NOT_SDK_VERIFIED");
}

async function openPinnedPortableSource(wire: ReceizPortableSealedArtifactV124): Promise<ReceizVerifiedArtifactAdmission> {
  const bytes = await exactWireBytes(wire);
  const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], wire.filename, { type: wire.mimeType }));
  if (verification.status !== "verified-artifact") fail("SEALED_SOURCE_NOT_VERIFIED");
  const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" });
  if (!("admissionProof" in admission) || admission.profile !== "portable-state" || !admission.proofHistory) fail("SALE_SOURCE_NOT_ADMITTED");
  if (admission.artifactSha256 !== wire.artifactSha256 || admission.payloadSha256 !== wire.payloadSha256) fail("SEALED_SOURCE_DIGEST_MISMATCH");
  await assertPublicPortableAdmission(admission);
  return admission;
}

async function verifyPublicIssuerKeyState(state: ReceizProofValuePublicIssuerKeyStateV129, binding: ReceizIdentityPublicBinding,
  predecessor: ReceizVerifiedArtifactAdmission, completionKai: string): Promise<void> {
  closedRecord(state, ["schema", "exportedAt", "snapshot", "proof"], "PROOF_VALUE_V129_PUBLIC_KEY_STATE_INVALID");
  if (state.schema !== "receiz.identity-key-state.v113" || !state.proof) fail("PUBLIC_KEY_STATE_INVALID");
  assertPublicPayload(state, new Set(), new Set([state]));
  const stateDigest = await digestReceizCanonicalV122(state);
  const carried = predecessor.proofHistory!.nodes.some((node) => {
    const value = node.namespaceData["proof-value.issuer-key-state.v129"];
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const reference = value as Readonly<Record<string, unknown>>;
    return reference.schema === "proof-value.issuer-key-state-reference.v129"
      && reference.identityArtifactDigest === binding.artifactSha256 && reference.publicStateDigest === stateDigest;
  });
  if (!carried) fail("PUBLIC_KEY_STATE_SOURCE_BINDING_UNAVAILABLE");
  let snapshot = state.snapshot;
  if (isSegmentedReceizPortableStateRef(state.snapshot)) {
    // The historical materializer compares the Fibonacci object's insertion
    // order. Public journal JSON is canonicalized. Restore that mechanical
    // framing after exact closed-field checks; no value or proof digest changes.
    const fib = closedRecord(state.snapshot.composite.fibonacci, ["basis", "operationCount", "checkpoints"], "PROOF_VALUE_V129_PUBLIC_KEY_STATE_INVALID");
    if (!Array.isArray(fib.checkpoints)) fail("PUBLIC_KEY_STATE_INVALID");
    const fibonacci = { basis: fib.basis as "sparse-checkpoint/v1", operationCount: fib.operationCount as number,
      checkpoints: fib.checkpoints.map((checkpoint) => {
        const fields = closedRecord(checkpoint, ["distance", "operationCount", "artifactDigest"], "PROOF_VALUE_V129_PUBLIC_KEY_STATE_INVALID");
        return { distance: fields.distance as number, operationCount: fields.operationCount as number, artifactDigest: fields.artifactDigest as string };
      }) };
    snapshot = materializeReceizPortableStateRef({ ...state.snapshot, composite: { ...state.snapshot.composite, fibonacci } });
  }
  const coordinates = closedRecord(snapshot, ["issuerKeyId", "actorId", "registryDigest", "observedThroughKai", "revokedAtKai"], "PROOF_VALUE_V129_PUBLIC_KEY_STATE_INVALID");
  if (coordinates.issuerKeyId !== binding.keyId || coordinates.actorId !== binding.actorId || coordinates.registryDigest !== binding.registryDigest
    || typeof coordinates.observedThroughKai !== "string" || !/^(0|[1-9][0-9]*)$/.test(coordinates.observedThroughKai)
    || BigInt(coordinates.observedThroughKai) < BigInt(completionKai)
    || coordinates.revokedAtKai !== null && (typeof coordinates.revokedAtKai !== "string" || !/^(0|[1-9][0-9]*)$/.test(coordinates.revokedAtKai)
      || BigInt(coordinates.revokedAtKai) <= BigInt(completionKai) || BigInt(coordinates.revokedAtKai) > BigInt(coordinates.observedThroughKai))) fail("PUBLIC_KEY_STATE_REVOKED_OR_INCOMPLETE");
  const proof = state.proof;
  const expectedMethod = binding.alg === "Ed25519" ? "ed25519.jcs.v1" : "ecdsa-p256-sha256.jcs.v1";
  const bytes = new TextEncoder().encode(canonicalizeReceizV122({ schema: state.schema, exportedAt: state.exportedAt, snapshot: state.snapshot }));
  if (proof.method !== expectedMethod || proof.digestSha256Hex !== await sha256ReceizBytes(bytes)
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: binding.keyId, alg: binding.alg as "Ed25519" | "P-256",
      publicKeyRawB64u: binding.publicKeyRawB64u, challengeB64Url: receizBase64UrlEncode(bytes), signatureB64Url: proof.signatureB64u })) fail("PUBLIC_KEY_STATE_SIGNATURE_INVALID");
  if (isSegmentedReceizPortableStateRef(state.snapshot)) for (const segment of state.snapshot.composite.segments) {
    if (!await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: binding.keyId, alg: binding.alg as "Ed25519" | "P-256",
      publicKeyRawB64u: binding.publicKeyRawB64u, challengeB64Url: receizBase64UrlEncode(receizPortableSegmentSignatureBytes(segment)),
      signatureB64Url: segment.signatureB64u })) fail("PUBLIC_KEY_STATE_SIGNATURE_INVALID");
  }
}

/** Pure reconstruction under the existing sealed sources. It creates no actor,
 * capability, plan, candidate, store, receipt, or committed-transition custody. */
async function inspectPublicAtomicMember(member: PublicMember,
  committed: ReceizPortableExecutionTransitionRecoveryV124["members"][number],
  completionKai: string): Promise<Member> {
  closedRecord(member, ["schema", "profile", "participantId", "operationPlan", "planning", "predecessor", "candidate",
    "signedCapability", "identityProof", "authority", "identityBinding", "issuerKeyState"], "PROOF_VALUE_V129_PUBLIC_MEMBER_INVALID");
  const predecessor = await openPinnedPortableSource(member.predecessor);
  const candidate = await openPinnedPortableSource(member.candidate);
  const plan = committed.commitUnit.plan;
  const receipt = committed.receipt;
  const binding = closedRecord(member.identityBinding, ["schema", "artifactSha256", "payloadSha256", "artifactOwnerReceizId",
    "identityOwnerReceizId", "actorId", "keyId", "alg", "publicKeyRawB64u", "signatureVerified", "registryDigest"], "PROOF_VALUE_V129_IDENTITY_PUBLIC_BINDING_INVALID") as unknown as ReceizIdentityPublicBinding;
  if (binding.schema !== "receiz.verified-actor-identity-binding.v124" || binding.signatureVerified !== true
    || (binding.alg !== "Ed25519" && binding.alg !== "P-256") || binding.actorId !== predecessor.ownerReceizId
    || binding.actorId !== candidate.ownerReceizId || binding.actorId !== binding.identityOwnerReceizId
    || binding.actorId !== binding.artifactOwnerReceizId || binding.actorId !== plan.actor.actorId
    || binding.registryDigest !== plan.actor.registryDigest.value
    || await digestReceizAuthority("identity", "receiz.verified-actor-identity-binding.v124", binding) !== plan.actor.evidenceDigest.value) fail("IDENTITY_PUBLIC_BINDING_MISMATCH");
  await verifyPublicIssuerKeyState(member.issuerKeyState, binding, predecessor, completionKai);
  const challengeText = ["RECEIZ-IDENTITY-ADMISSION-V112", binding.artifactSha256, binding.payloadSha256,
    binding.keyId, binding.actorId, binding.registryDigest].join("\n");
  if (member.identityProof.keyId !== binding.keyId || member.identityProof.alg !== binding.alg
    || member.identityProof.challengeB64Url !== receizBase64UrlEncode(new TextEncoder().encode(challengeText))
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: binding.keyId, alg: binding.alg,
      publicKeyRawB64u: binding.publicKeyRawB64u, challengeB64Url: member.identityProof.challengeB64Url,
      signatureB64Url: member.identityProof.signatureB64Url })) fail("IDENTITY_PUBLIC_SIGNATURE_INVALID");
  const signed = member.signedCapability;
  const capability = signed.payload;
  if (signed.alg !== binding.alg || capability.issuerKeyId !== binding.keyId || capability.actorId !== binding.actorId
    || capability.audience !== member.operationPlan.applicationId || capability.registryDigest !== binding.registryDigest
    || capability.authorityProfile !== "artifact-local" || !same(capability.resourceScopes, [predecessor.artifactId])
    || !same(capability.operations, ["artifact.append"]) || !capability.offline
    || BigInt(capability.validFromKai) > BigInt(completionKai) || BigInt(capability.expiresAtKai) <= BigInt(completionKai)
    || !same(capability.operationConstraints, { planDigest: plan.planDigest, commitDomain: plan.commitDomain })
    || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: binding.keyId, alg: binding.alg,
      publicKeyRawB64u: binding.publicKeyRawB64u, challengeB64Url: receizBase64UrlEncode(capabilitySigningBytes(capability)),
      signatureB64Url: signed.signatureB64u })) fail("PUBLIC_CAPABILITY_BINDING_INVALID");
  // The exact public actor binding is already committed by the enclosing
  // successor. It never becomes a new issuer or actor admission here.
  const before = predecessor.proofHistory!;
  const after = candidate.proofHistory!;
  const node = historyNode(after, receipt.acceptedHead.value);
  if (member.planning.namespace.value !== "provenance" || member.planning.namespace.scheme !== "receiz-namespace.v1"
    || before.headDigests.length !== 1 || after.headDigests.length !== 1
    || plan.resource !== predecessor.artifactId || candidate.artifactId !== predecessor.artifactId
    || member.planning.expectedHead.value !== before.headDigests[0] || committed.participantId !== member.participantId
    || !same(plan.commitDomain, member.planning.commitDomain)) fail("PUBLIC_TRANSITION_BINDING_MISMATCH");
  const event = member.planning.event as unknown as ReceizConstitutionJson;
  const reduction = await reduceReceizNamespace({ payloadBytes: predecessor.verifiedPayload.bytes, namespace: member.planning.namespace,
    namespaceLawVersion: plan.transition.namespaceLawVersion, namespaceReducerVersion: plan.transition.namespaceReducerVersion, event });
  const exact = await readReceizProofHistoryExactKksCoordinate(node);
  if (!exact && node.kaiPulse !== predecessor.admissionProof.registryEffectiveKai) fail("PUBLIC_TRANSITION_HISTORY_MISMATCH");
  const eventDigest = { algorithm: "sha-256" as const, binds: "canonical-namespace-event" as const,
    value: await digestReceizAuthority("event", "receiz.namespace-event.v112", event) };
  const expectedNode = await createReceizArtifactTransitionProofHistoryAppendNode({ basis: {
    artifactId: predecessor.artifactId, registryDigest: predecessor.admissionProof.registryDigest,
    parentDigest: before.headDigests[0]!, kaiPulse: node.kaiPulse, namespace: member.planning.namespace,
    namespaceLawVersion: reduction.namespaceLawVersion, namespaceReducerVersion: reduction.namespaceReducerVersion,
    eventDigest, proposedNamespaceBodyDigest: reduction.proposedTargetDigest, actor: plan.actor }, event,
    ...(exact ? { kksCoordinate: exact, predecessorArtifactDigest: predecessor.artifactSha256 } : {}) });
  if (!same(expectedNode, node)) fail("PUBLIC_TRANSITION_HISTORY_MISMATCH");
  const history = await normalizeReceizProofHistory({ artifactId: before.artifactId, registryDigest: before.registryDigest,
    nodes: [...before.nodes, expectedNode], verifyReceipt: async (value, expected) =>
      await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", value) === expected });
  if (!same(history, transportReceizProofHistory(after))) fail("PUBLIC_TRANSITION_HISTORY_MISMATCH");
  const reducedBytes = composeReceizNamespaceReductionPayload({ originalPayloadBytes: predecessor.verifiedPayload.bytes, reduction });
  const payloadBytes = await replaceReceizPortableProofHistoryBytes(reducedBytes, history);
  if (await sha256ReceizBytes(payloadBytes) !== candidate.payloadSha256) fail("PUBLIC_TRANSITION_PAYLOAD_MISMATCH");
  const typedDigest = (binds: string, value: string) => ({ algorithm: "sha-256", binds, value });
  const registryDigest = typedDigest("constitution-registry", predecessor.admissionProof.registryDigest);
  const transition = { artifactId: predecessor.artifactId, priorArtifactDigest: typedDigest("exact-artifact-bytes", predecessor.artifactSha256),
    basePayloadDigest: typedDigest("verified-payload-bytes", predecessor.artifactId), expectedHead: member.planning.expectedHead,
    proposedHistoryHead: typedDigest("verified-proof-history", node.nodeDigest), namespace: member.planning.namespace,
    namespaceLawVersion: reduction.namespaceLawVersion, namespaceReducerVersion: reduction.namespaceReducerVersion,
    priorNamespaceBodyDigest: reduction.priorTarget?.bodyDigest ?? null, eventDigest, proposedNamespaceBodyDigest: reduction.proposedTargetDigest,
    preservedNamespaces: [...reduction.preservedNamespaces.values()].filter((snapshot) => snapshot.namespace.value !== "receizProofHistory")
      .map(({ namespace, bodyDigest }) => ({ namespace, bodyDigest })).sort((a, b) => a.namespace.value.localeCompare(b.namespace.value)),
    registryDigest, actor: plan.actor, proofSuiteRequirements: { signatureVersion: 4, carrier: "native-record-seal" } };
  if (!same(plan.transition, transition) || plan.transitionDigest.value !== await digestReceizAuthority("transition", "receiz.artifact-transition.v112", transition)) fail("PUBLIC_TRANSITION_PLAN_MISMATCH");
  const effects = { "artifact.append": 1, "namespace:provenance:append": 1, [`event:${eventDigest.value}`]: 1,
    "law:artifact.append.effects-derived@1": 1, [`registry:${registryDigest.value}`]: 1, [`resource:${predecessor.artifactId}`]: 1 };
  if (!same(capability.maximumEffects, effects)) fail("PUBLIC_CAPABILITY_BINDING_INVALID");
  const effectsDigest = typedDigest("external-operation-effects", await digestReceizAuthority("effects", "receiz.artifact-append-effects.v124", {
    registryDigest, operationLaw: { lawId: "artifact.append.effects-derived", lawVersion: 1 }, admittedArtifactDigest: predecessor.artifactSha256,
    admittedPayloadDigest: predecessor.payloadSha256, carriedHistoryDigest: before.historyDigest, verifiedActor: plan.actor,
    resource: predecessor.artifactId, namespace: member.planning.namespace, canonicalEvent: event, effects }));
  const idempotencyKeyDigest = typedDigest("domain-scoped-idempotency-identity", await digestReceizAuthority("idempotency", "receiz.artifact-append-idempotency.v112", {
    commitDomain: plan.commitDomain, actor: plan.actor, resource: predecessor.artifactId, operation: "artifact.append", key: member.planning.idempotencyKey }));
  const basis = { transitionDigest: plan.transitionDigest, actor: plan.actor, resource: predecessor.artifactId, operation: "artifact.append",
    commitDomain: plan.commitDomain, effectsDigest, idempotencyKeyDigest, registryDigest };
  if (!same(plan.effectsDigest, effectsDigest) || !same(plan.idempotencyKeyDigest, idempotencyKeyDigest)
    || plan.planDigest.value !== await digestReceizAuthority("plan", "receiz.artifact-append-plan.v112", basis)
    || plan.actorConstraint !== predecessor.actorConstraint) fail("PUBLIC_TRANSITION_PLAN_MISMATCH");
  const unit = committed.commitUnit;
  const { commandDigest: _commandDigest, ...commandBasis } = unit.command;
  const capabilityDigest = await digestReceizAuthority("capability", "receiz.capability.v112", capability);
  for (const previous of before.nodes) {
    if (!previous.receipt || typeof previous.receipt !== "object" || Array.isArray(previous.receipt)) continue;
    const revoked = (previous.receipt as Readonly<Record<string, unknown>>).revokedCapabilityDigests;
    if (revoked !== undefined && (!Array.isArray(revoked) || revoked.some((value) => typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)))) fail("PUBLIC_ARTIFACT_REVOCATIONS_INVALID");
    if (Array.isArray(revoked) && revoked.includes(capabilityDigest)) fail("PUBLIC_CAPABILITY_REVOKED");
  }
  if (!same(unit.capability.payload, capability) || unit.capability.digest !== capabilityDigest
    || unit.command.capabilityDigest.value !== capabilityDigest || unit.command.planDigest.value !== plan.planDigest.value
    || unit.command.transitionDigest.value !== plan.transitionDigest.value || unit.command.candidateArtifactDigest.value !== candidate.artifactSha256
    || unit.command.commandDigest.value !== await digestReceizAuthority("command", "receiz.artifact-transition-command.v112", commandBasis)
    || !same(unit.expectedHead, plan.transition.expectedHead) || !same(unit.commitDomain, plan.commitDomain)) fail("PUBLIC_COMMIT_UNIT_MISMATCH");
  const expectedReceipt = { commitDomain: plan.commitDomain, actor: plan.actor, resource: plan.resource, operation: "artifact.append",
    planDigest: plan.planDigest, capabilityDigest: unit.command.capabilityDigest, transitionDigest: plan.transitionDigest,
    artifactDigest: unit.command.candidateArtifactDigest, priorHead: unit.expectedHead, acceptedHead: plan.transition.proposedHistoryHead,
    commandDigest: unit.command.commandDigest, idempotencyIdentityDigest: plan.idempotencyKeyDigest,
    authority: { receiptIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" } };
  if (!same(receipt, expectedReceipt)) fail("PUBLIC_COMMITTED_RECEIPT_MISMATCH");
  return freeze({ participantId: member.participantId, assetId: candidate.artifactId, ownerReceizId: candidate.ownerReceizId,
    history: after, artifactDigest: candidate.artifactSha256, receipt, event });
}

async function verifyPublicSaleRecovery(value: ReceizProofValuePublicSaleRecoveryV129): Promise<ReceizProofValueVerifiedSaleRecoveryV129> {
  closedRecord(value, ["schema", "sourceArtifact", "applicationId", "audience", "domainId"], "PROOF_VALUE_V129_PUBLIC_RECOVERY_INVALID");
  const source = await readReceizDomainReplaySegmentSourceV124({ artifact: value.sourceArtifact,
    expected: { applicationId: value.applicationId, audience: value.audience, domainId: value.domainId } });
  const events = source.journalAppends.map((append) => JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receizBase64UrlDecode(append.eventBytesB64u))) as unknown);
  const sales = events.filter((event) => record(event).schema === "proof-value.completed-atomic-sale-public.v129");
  if (sales.length !== 1) fail("PUBLIC_SALE_SOURCE_JOIN_REQUIRED");
  const body = closedRecord(sales[0], ["schema", "outcomeCoordinates", "transitionSet", "members"], "PROOF_VALUE_V129_PUBLIC_RECOVERY_INVALID") as unknown as ReceizProofValuePublicSaleEvidenceV129;
  const publicMembers = body.transitionSet.members;
  assertPublicPayload(events, new Set(), new Set(publicMembers.flatMap((member) => [member.issuerKeyState, member.identityProof])));
  // No private identity bytes are manufactured, redacted or admitted. This
  // shape is used only by the existing plan/event projector below.
  const legacyProjection = readSourceRecovery({ schema: "receiz.proof-value-sale-recovery.v129", outcomeCoordinates: body.outcomeCoordinates,
    recovery: { schema: "receiz.portable-execution-transition-recovery.v124", transitionSet: body.transitionSet, members: body.members,
      authority: { recoveryIsProofAuthority: false, receiptIsProofAuthority: false, strongerTruth: "sealed-receiz-proof-object" } } });
  if (body.outcomeCoordinates.applicationId !== source.replay.applicationId || value.audience !== body.outcomeCoordinates.applicationId
    || source.sourceIntent.sourceKai.uPulse < body.outcomeCoordinates.terminalAtKaiUPulse || publicMembers.length !== body.members.length) fail("PUBLIC_SOURCE_COMPLETION_BINDING_MISMATCH");
  const completionKai = (BigInt(body.outcomeCoordinates.terminalAtKaiUPulse) / 1_000_000n).toString();
  const members = await Promise.all(publicMembers.map((member, index) => inspectPublicAtomicMember(member, body.members[index]!, completionKai)));
  const read = await classifySale(legacyProjection, members);
  if (!read.sale) fail("PUBLIC_SALE_SOURCE_JOIN_REQUIRED");
  const buyerMember = publicMembers.find((member) => member.participantId === read.sale!.paymentReferences[0]!.participantId)!;
  if (source.ownership.ownerReceizId !== read.sale.buyerReceizId
    || source.authoringEvidence.identity.keyId !== buyerMember.identityBinding.keyId
    || source.authoringEvidence.identity.identityArtifactDigest !== buyerMember.identityBinding.artifactSha256) fail("PUBLIC_SOURCE_AUTHOR_BINDING_MISMATCH");
  const recovered = freeze({ kind: "verified-sale-recovery" as const, recoveryDigest: await digestReceizCanonicalV122(value),
    authority: freeze({ projectionIsProofAuthority: false as const, committedCustodyIssued: false as const, strongerTruth: "sealed-receiz-proof-object" as const }) });
  recoveredSaleCustody.set(recovered, freeze({ ...read, sourceRecovery: freeze(structuredClone(value)) }));
  return recovered;
}

export async function exportReceizProofValueSaleRecoveryV129(evidence: ReceizProofValueSaleEvidenceV129): Promise<ReceizProofValueSaleRecoveryV129> {
  if (evidence.kind === "committed-atomic-sale") evidence = snapshotRuntimeEvidence(evidence);
  const read = await readSale(evidence);
  if (evidence.kind === "committed-atomic-sale" && evidence.publicRecovery) {
    const verified = await verifyPublicSaleRecovery(evidence.publicRecovery);
    const recovered = recoveredSaleCustody.get(verified)!;
    if (!same(read.sale, recovered.sale)) fail("PUBLIC_SALE_SOURCE_SUBSTITUTION");
    return freeze(structuredClone(evidence.publicRecovery));
  }
  // v124 recovery may carry a complete private Receiz Key. Its exact bytes
  // cannot be redacted into a different authority source for a public replay.
  if (evidence.kind === "committed-atomic-sale") {
    const privateSource = read.sourceRecovery as ReceizProofValuePrivateSaleRecoveryV129;
    for (let index = 0; index < evidence.transitions.length; index++) {
      const admission = readSdkIssuedReceizCommittedArtifactTransitionCustody(evidence.transitions[index]!.transition).admission;
      const identity = privateSource.recovery.transitionSet.members[index]!.identityArtifact;
      const bytes = await exactWireBytes(identity);
      const canonical = await reverifyReceizArtifactWithAdmissionContext({ predecessorAdmission: admission,
        candidateArtifact: { artifact: new Blob([new Uint8Array(bytes).buffer], { type: identity.mimeType }),
          filename: identity.filename, mimeType: identity.mimeType, artifactSha256: identity.artifactSha256, payloadSha256: identity.payloadSha256 } });
      const payload = record(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(canonical.payloadBytes)));
      const crypto = record(payload.crypto);
      if (crypto.privateKeyPkcs8B64u || crypto.privateKeyPkcs8CiphertextB64u || payload.portableState) fail("SALE_PUBLIC_RECOVERY_UNAVAILABLE_PRIVATE_IDENTITY_SOURCE");
    }
  }
  if (read.sourceRecovery.schema !== "receiz.proof-value-public-sale-recovery.v129") fail("SALE_PUBLIC_RECOVERY_UNAVAILABLE_PRIVATE_IDENTITY_SOURCE");
  return freeze(structuredClone(read.sourceRecovery));
}

/** Local read only: no store, capability issuance, admission membership, wallet, or approval write is performed. */
export async function readReceizProofValueTransactionsV129(input: Readonly<{
  admission?: ReceizVerifiedArtifactAdmission;
  sales?: readonly ReceizProofValueSaleEvidenceV129[];
}>): Promise<ReceizProofValueTransactionsV129> {
  if (!input || typeof input !== "object" || Object.keys(input).some((key) => key !== "admission" && key !== "sales")) fail("TRANSACTION_INPUT_INVALID");
  closedRecord(input, Object.keys(input), "PROOF_VALUE_V129_TRANSACTION_INPUT_INVALID");
  const ownershipChanges: ReceizProofValueOwnershipChangeV129[] = [];
  const completedSales: ReceizProofValueCompletedSaleV129[] = [];
  const incompleteHistory: ReceizProofValueIncompleteHistoryV129[] = [];
  const admission = input.admission === undefined ? null : await verifyReceizArtifactAdmission(input.admission);
  if (admission && "code" in admission) fail("ADMISSION_NOT_VERIFIED");
  const admitted = admission as ReceizVerifiedArtifactAdmission | null;
  const history = admitted?.proofHistory ? await verifyReceizProofHistory(admitted.proofHistory) : null;
  if (!history) incompleteHistory.push({ code: "proof-history-unavailable", assetId: admitted?.artifactId ?? null, reference: null });
  else {
    if (history.artifactId !== admitted!.artifactId) fail("HISTORY_FOREIGN_ASSET");
    for (const node of orderedHistory(history)) {
      if (node.event.type !== "ownership.transition" || node.event.fromOwnerReceizId === null
        || node.event.fromOwnerReceizId === node.event.toOwnerReceizId) continue;
      const exact = await readReceizProofHistoryExactKksCoordinate(node);
      const consent = exact ? null : await readReceizProofHistoryOwnershipConsentCoordinateV129(node, history);
      ownershipChanges.push(freeze({ assetId: node.artifactId, claimHead: node.nodeDigest, parentHeads: freeze([...node.parentDigests]),
        previousOwnerReceizId: node.event.fromOwnerReceizId, currentOwnerReceizId: node.event.toOwnerReceizId,
        kaiUPulse: exact?.kaiUpulse ?? consent?.kaiUPulse ?? null, kaiPulse: exact?.kaiPulse ?? consent?.kaiPulse ?? node.kaiPulse,
        receiptDigest: node.receiptDigest, paymentAmountPhiMicro: null }));
    }
  }
  const sales = input.sales ?? [];
  if (!Array.isArray(sales) || sales.length > MAX_SALE_EVIDENCE) fail("SALE_EVIDENCE_LIMIT_EXCEEDED");
  if (sales.length && (!admitted || !history)) fail("SALE_ADMITTED_SOURCE_REQUIRED");
  const seen = new Set<string>();
  for (const evidence of sales) {
    const read = await readSale(evidence);
    if (!read.sale) { incompleteHistory.push({ code: "sale-join-unavailable", assetId: admitted?.artifactId ?? null,
      reference: read.sourceRecovery.schema === "receiz.proof-value-sale-recovery.v129" ? read.sourceRecovery.recovery.transitionSet.exactPlanDigest : read.sourceRecovery.sourceArtifact.artifactSha256 }); continue; }
    if (read.sale.assetId !== admitted!.artifactId) fail("SALE_FOREIGN_ASSET");
    const node = historyNode(history!, read.sale.deliveryHead);
    if (!read.ownershipNode || !same(node, read.ownershipNode)) fail("SALE_DELIVERY_NOT_CARRIED");
    if (!seen.has(read.sale.saleDigest)) { seen.add(read.sale.saleDigest); completedSales.push(read.sale); }
  }
  completedSales.sort((a, b) => BigInt(a.completionKaiUPulse!) < BigInt(b.completionKaiUPulse!) ? -1
    : BigInt(a.completionKaiUPulse!) > BigInt(b.completionKaiUPulse!) ? 1 : a.saleDigest.localeCompare(b.saleDigest));
  for (const row of ownershipChanges) {
    const receipt = historyNode(history!, row.claimHead).receipt;
    if (record(receipt).schema === "proof-value.accepted-delivery.v129" && !completedSales.some((sale) => sale.deliveryHead === row.claimHead)) {
      incompleteHistory.push({ code: "sale-proof-unavailable", assetId: row.assetId, reference: row.claimHead });
    }
  }
  return freeze({ ownershipChanges, completedSales, incompleteHistory });
}
