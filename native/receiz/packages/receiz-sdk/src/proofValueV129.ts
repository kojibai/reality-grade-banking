import {
  assertRuntimeCustodiedReceizArtifactVerification, readRuntimeCustodiedReceizArtifactCanonicalRead,
  readRuntimeCustodiedReceizArtifactVerifierRoots, verifyReceizArtifactWithCanonicalRoots,
  type ReceizArtifactVerificationResult,
} from "./artifactVerification.js";
import { createReceizArtifactAdmissionEngine, createReceizArtifactAdmissionEngineWithSourceContext,
  readReceizArtifactAdmissionRetainedSource, verifyReceizArtifactAdmission } from "./artifactAdmission.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { cloneAndFreezeExactValue } from "./exactClone.js";
import { parseReceizPortableAssetDocument } from "./portableAsset.js";
import { readReceizProofHistoryExactKksCoordinate } from "./proofHistory.js";
import { base64UrlDecode } from "./verifier/crypto.js";
import { isVersionIdentifier } from "./verifier/canonicalSyntax.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizKaiMomentFromSealedUpulse } from "./v124Kai.js";
import { quoteReceizDisplayUsdV122 } from "./v122Value.js";
import {
  computeIntrinsicUnsigned, SIGIL_VALUATION_ALGORITHM, SIGIL_VALUATION_POLICY,
  SIGIL_VALUATION_POLICY_CHECKSUM, SIGIL_VALUATION_ROUNDING,
  type SigilCalculationTerm, type SigilMetadataLite,
} from "./sigilValuationCore.js";
import { digestReceizRarityPolicyV129, evaluateReceizRarityPolicyV129, type ReceizRarityPolicyV129 } from "./proofValuePolicyV129.js";
import { readReceizProofValueTransactionsV129, snapshotReceizProofValueSaleEvidenceV129, type ReceizProofValueSaleEvidenceV129, type ReceizProofValueTransactionsV129 } from "./proofValueTransactionsV129.js";

export type ReceizProofValueSourceV129 = ReceizArtifactVerificationResult | ReceizVerifiedArtifactAdmission;
export type ReceizProofValueUsdBasisV129 = Readonly<{
  algorithm: "receiz.display-usd.v122";
  version: "1";
  usdPerPhiMicrocents: string;
  priceBasis: Readonly<Record<string, unknown>>;
  priceBasisDigest: string;
}>;
export type ReceizProofValueOptionsV129 = Readonly<{
  source: ReceizProofValueSourceV129;
  expectedProofDigest?: string;
  expectedHistoryHead?: string;
  policy?: Readonly<{ algorithm: typeof SIGIL_VALUATION_ALGORITHM; checksum: string }>;
  rarityPolicy?: ReceizRarityPolicyV129;
  marketReferenceRule?: "last-executed-sale-v129";
  sales?: readonly ReceizProofValueSaleEvidenceV129[];
  usdBasis?: ReceizProofValueUsdBasisV129;
  /** Display input only. Never consumed by either calculated value. */
  askingPricePhiMicro?: string;
}>;
export const RECEIZ_PROOF_VALUE_LIMITS_V129 = Object.freeze({ samples: 256, portableDepth: 4, metadataEntries: 4096 });
export const RECEIZ_LAST_EXECUTED_SALE_RULE_V129 = Object.freeze({
  algorithm: "receiz.market-reference.last-executed-sale", version: "129.0.0",
  formula: "marketReferenceValuePhiMicro = uniquely causally latest completedSale.amountPhiMicro with admitted completion at or before valuation Kai",
  intrinsicAdjustment: "none", askingPriceAdjustment: "none",
});
export type ReceizProofValueProjectionV129 = Readonly<{
  status: "available";
  schema: "receiz.proof-value-projection.v129";
  algorithm: string;
  policyChecksum: string;
  proofDigest: string;
  originProofDigest: string;
  historyHead: string | null;
  originKaiUPulse: string | null;
  originKaiPulse: string;
  valuationKaiUPulse: string;
  valuationKaiPulse: string;
  proofValuePhiMicro: string;
  marketReferenceValuePhiMicro: string | null;
  askingPricePhiMicro: string | null;
  lastExecutedPricePhiMicro: string | null;
  displayUsdCents: string | null;
  priceBasisDigest: string | null;
  inputs: Readonly<Record<string, unknown>>;
  calculation: readonly SigilCalculationTerm[];
  transactions: ReceizProofValueTransactionsV129;
  projectionDigest: string;
  writesPerformed: 0;
  authority: Readonly<{ valuationIsSettlementAuthority: false; strongerTruth: "sealed-receiz-proof-object" }>;
}>;
export type ReceizProofValueUnavailableV129 = Readonly<{
  status: "unavailable";
  code: "VALUATION_ORIGIN_NOT_CARRIED" | "VALUATION_PAYLOAD_NOT_RETAINED" | "VALUATION_PRIVATE_SOURCE_UNSUPPORTED";
  proofDigest: string;
  historyHead: string | null;
  writesPerformed: 0;
}>;
export type ReceizProofValueResultV129 = ReceizProofValueProjectionV129 | ReceizProofValueUnavailableV129;
type Basis = Readonly<{
  verification: Extract<ReceizArtifactVerificationResult, { status: "verified-artifact" }>;
  admission: ReceizVerifiedArtifactAdmission | null;
  proofDigest: string; originProofDigest: string; historyHead: string | null;
  originKaiPulse: number; originKaiUPulse: string | null;
  metadata: SigilMetadataLite; payload: Readonly<Record<string, unknown>> | null;
  transactions: ReceizProofValueTransactionsV129;
  sourceReferences: readonly string[];
}>;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (code: string): never => { throw new TypeError(`V129_${code}`); };
const decimal = (value: unknown): value is string => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value) && value.length <= 128;
const snapshot = <T>(value: T): T => JSON.parse(canonicalizeReceizV122(value)) as T;
const unavailable = (code: ReceizProofValueUnavailableV129["code"], proofDigest: string, historyHead: string | null): ReceizProofValueUnavailableV129 => Object.freeze({ status: "unavailable", code, proofDigest, historyHead, writesPerformed: 0 });

/** Package-internal snapshot. Custodied objects retain their actual identity;
 * caller JSON is copied before the first asynchronous verification read. */
export function snapshotReceizProofValueInputV129<T extends ReceizProofValueOptionsV129>(input: T): T {
  if (!record(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) fail("VALUATION_INPUT_INVALID");
  const copy: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") return fail("VALUATION_INPUT_INVALID");
    const descriptor = Object.getOwnPropertyDescriptor(input, key)!;
    if (!descriptor.enumerable || !("value" in descriptor)) fail("VALUATION_INPUT_INVALID");
    if (key === "source") copy[key] = descriptor.value;
    else if (key === "sales" && descriptor.value !== undefined) {
      const sales: unknown = descriptor.value;
      if (!Array.isArray(sales) || sales.length > 256) return fail("SALE_EVIDENCE_LIMIT");
      const entries = Object.getOwnPropertyDescriptors(sales);
      if (Reflect.ownKeys(entries).some(name => name !== "length" && (typeof name !== "string" || !/^(0|[1-9][0-9]*)$/.test(name) || Number(name) >= sales.length))) fail("VALUATION_INPUT_INVALID");
      const retained: ReceizProofValueSaleEvidenceV129[] = [];
      for (let i = 0; i < sales.length; i++) {
        const entry = entries[String(i)];
        if (!entry || !("value" in entry)) return fail("VALUATION_INPUT_INVALID");
        retained.push(snapshotReceizProofValueSaleEvidenceV129(entry.value as ReceizProofValueSaleEvidenceV129));
      }
      copy[key] = Object.freeze(retained);
    } else if (descriptor.value !== undefined) copy[key] = cloneAndFreezeExactValue(snapshot(descriptor.value));
  }
  return Object.freeze(copy) as T;
}

function decodeJson(bytes: Uint8Array): unknown {
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return null; }
}
function privatePayload(value: unknown): boolean {
  const pending: unknown[] = value ? [value] : [];
  while (pending.length) {
    const carried = pending.pop();
    if (Array.isArray(carried)) { for (const entry of carried) pending.push(entry); continue; }
    if (!record(carried)) continue;
    const schema = String(carried.schema ?? carried.kind ?? "");
    if (/^receiz\.(identity|key|conversation|chat|profile-showcase|economy-showcase|account\.(state|portable)|device\.identity|sdk\.identity_account_projection)([.-]|$)/.test(schema)
      || ["privateKeyPkcs8CiphertextB64u", "privateKeyPkcs8B64u", "privateKeyPkcs8", "accessToken", "refreshToken", "bearerToken", "clientSecret", "client_secret", "access_token", "refresh_token"]
        .some(key => key in carried)) return true;
    for (const entry of Object.values(carried)) if (entry !== null && typeof entry === "object") pending.push(entry);
  }
  return false;
}
function checkOptions(input: ReceizProofValueOptionsV129, coordinateKey: string): void {
  if (!record(input) || Object.keys(input).some(key => !["source", "expectedProofDigest", "expectedHistoryHead", "policy", "rarityPolicy", "marketReferenceRule", "sales", "usdBasis", "askingPricePhiMicro", coordinateKey].includes(key))) fail("VALUATION_INPUT_INVALID");
  if (input.policy && (input.policy.algorithm !== SIGIL_VALUATION_ALGORITHM || input.policy.checksum !== SIGIL_VALUATION_POLICY_CHECKSUM
    || Object.keys(input.policy).sort().join(",") !== "algorithm,checksum")) fail("VALUATION_POLICY_UNSUPPORTED");
  if (input.askingPricePhiMicro !== undefined && !decimal(input.askingPricePhiMicro)) fail("ASKING_PRICE_INVALID");
  if (input.marketReferenceRule !== undefined && input.marketReferenceRule !== "last-executed-sale-v129") fail("MARKET_REFERENCE_RULE_UNSUPPORTED");
  if (input.rarityPolicy && input.marketReferenceRule) fail("MARKET_REFERENCE_RULE_AMBIGUOUS");
  if (input.usdBasis && privatePayload(input.usdBasis)) fail("VALUATION_PRIVATE_DISPLAY_UNSUPPORTED");
}

/** Package-internal source composition; every payload is read only after the
 * enclosing canonical verification that issued its retained runtime. */
export async function readReceizProofValueBasisV129(input: ReceizProofValueOptionsV129): Promise<Basis | ReceizProofValueUnavailableV129> {
  let verification: ReceizArtifactVerificationResult;
  let admission: ReceizVerifiedArtifactAdmission | null = null;
  if (record(input.source) && "status" in input.source && input.source.status === "verified-artifact") {
    verification = input.source as ReceizArtifactVerificationResult;
    assertRuntimeCustodiedReceizArtifactVerification(verification);
  } else {
    const admitted = await verifyReceizArtifactAdmission(input.source);
    if ("code" in admitted) throw new TypeError(admitted.code);
    admission = admitted;
    verification = await readReceizArtifactAdmissionRetainedSource(admitted);
  }
  assertRuntimeCustodiedReceizArtifactVerification(verification);
  const proofDigest = verification.artifactDigest.value;
  const historyHead = admission?.proofHistoryHead?.headDigest
    ?? (admission?.proofHistory?.headDigests.length === 1 ? admission.proofHistory.headDigests[0]! : null)
    ?? (verification.continuity.state === "verified" ? verification.continuity.headReference ?? null : null);
  if ((input.expectedProofDigest !== undefined && input.expectedProofDigest !== proofDigest)
    || (input.expectedHistoryHead !== undefined && input.expectedHistoryHead !== historyHead)) fail("SOURCE_BINDING_INVALID");
  if (admission && admission.profile !== "portable-state") return unavailable("VALUATION_PRIVATE_SOURCE_UNSUPPORTED", proofDigest, historyHead);
  const roots = readRuntimeCustodiedReceizArtifactVerifierRoots(verification);
  let originVerification = verification;
  let opened = await readRuntimeCustodiedReceizArtifactCanonicalRead(originVerification);
  if (!opened) return unavailable("VALUATION_PAYLOAD_NOT_RETAINED", proofDigest, historyHead);
  let decoded = decodeJson(opened.payloadBytes);
  if (privatePayload(decoded)) return unavailable("VALUATION_PRIVATE_SOURCE_UNSUPPORTED", proofDigest, historyHead);
  let payload = record(decoded) ? decoded : null;
  let genesisOrigin: Readonly<{ kaiPulse: string; kaiUpulse: string; nodeDigest: string; proofHead: string }> | null = null;
  // Transfers keep the original complete proof in the immutable portable
  // payload. The successor's seal time is not a new valuation origin.
  for (let depth = 0; payload?.schema === "receiz.portable_asset.v1"; depth++) {
    if (depth >= RECEIZ_PROOF_VALUE_LIMITS_V129.portableDepth) fail("VALUATION_PORTABLE_DEPTH_LIMIT");
    const portable = await parseReceizPortableAssetDocument(payload);
    const carriedBytes = base64UrlDecode(portable.payload.bytesBase64Url);
    const carried = await verifyReceizArtifactWithCanonicalRoots(carriedBytes, roots);
    if (carried.status !== "verified-artifact") {
      const content = decodeJson(carriedBytes);
      // These are the existing canonical reader's explicit no-proof outcomes,
      // not permission to discard an invalid or unsupported carried proof.
      if (carried.status !== "invalid" || carried.errors.length !== 1
        || carried.errors[0]!.code !== "ARTIFACT_VERIFICATION_FAILED"
        || ![
          "Missing proof bundle chunk (likely not the original sealed artifact).",
          "Missing embedded PDF proof bundle.", "Missing embedded HEIC proof bundle.",
          "Missing embedded SVG proof bundle.", "Missing embedded JSON proof bundle.", "Missing trailer proof bundle.",
          "Unsupported ZIP artifact. Upload a sealed ZIP/package artifact or upload individual sealed artifacts.",
          "Unsupported artifact format. Upload a sealed file, .receizbundle, or sealed package ZIP.",
        ].includes(carried.errors[0]!.message)
        || (record(content) && isVersionIdentifier(content.kind, "receiz.bundle.v"))) {
        return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
      }
      // The existing initial-source producer seals raw content beneath a full
      // KaiSigil genesis before the enclosing file is sealed. Read that exact
      // source frame only after admission; a later envelope is not issuance.
      let originAdmission = originVerification === verification ? admission : null;
      if (!originAdmission) {
        const engine = admission ? await createReceizArtifactAdmissionEngineWithSourceContext(admission)
          : createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: roots });
        const admittedOrigin = await engine(originVerification, { profile: "portable-state" });
        if (!("admissionProof" in admittedOrigin) || admittedOrigin.profile !== "portable-state") {
          return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
        }
        originAdmission = admittedOrigin;
      }
      if (originAdmission.profile !== "portable-state" || !originAdmission.proofHistory) {
        return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
      }
      const history = originAdmission.proofHistory;
      if (history.artifactId !== originAdmission.artifactId || history.artifactId !== portable.payload.sha256
        || originAdmission.artifactSha256 !== originVerification.artifactDigest.value) fail("VALUATION_ORIGIN_BINDING_INVALID");
      const genesisNodes = history.nodes.filter(node => node.parentDigests.length === 0);
      if (genesisNodes.length !== 1) return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
      const root = genesisNodes[0]!;
      if (root.artifactId !== history.artifactId || root.event.type !== "ownership.transition"
        || root.event.fromOwnerReceizId !== null) return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
      const coordinate = await readReceizProofHistoryExactKksCoordinate(root);
      if (!coordinate) return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
      genesisOrigin = { kaiPulse: coordinate.kaiPulse, kaiUpulse: coordinate.kaiUpulse,
        nodeDigest: root.nodeDigest, proofHead: coordinate.kaiSigil.proofHead };
      decoded = content;
      if (privatePayload(decoded)) return unavailable("VALUATION_PRIVATE_SOURCE_UNSUPPORTED", proofDigest, historyHead);
      payload = record(decoded) ? decoded : null;
      break;
    }
    if (carried.artifactDigest.value !== portable.payload.sha256) fail("VALUATION_ORIGIN_BINDING_INVALID");
    originVerification = carried;
    opened = await readRuntimeCustodiedReceizArtifactCanonicalRead(carried);
    if (!opened) return unavailable("VALUATION_PAYLOAD_NOT_RETAINED", proofDigest, historyHead);
    decoded = decodeJson(opened.payloadBytes);
    if (privatePayload(decoded)) return unavailable("VALUATION_PRIVATE_SOURCE_UNSUPPORTED", proofDigest, historyHead);
    payload = record(decoded) ? decoded : null;
  }
  const origin = originVerification.verification.bundle;
  if (!genesisOrigin && record(origin.nativeRecordSeal) && origin.nativeRecordSeal.proofPredecessor !== undefined) {
    const predecessor = origin.nativeRecordSeal.proofPredecessor;
    const continuity = origin.nativeRecordSeal.ownershipContinuity;
    const genesis = record(continuity) && Array.isArray(continuity.history) ? continuity.history[0] : null;
    // Native ownership successors preserve the original bundle and claim.
    // A new wrapper around another proof cannot supply that proof's origin.
    if (!record(predecessor) || predecessor.headReference !== origin.receizClaimId
      || !record(genesis) || genesis.schema !== "receiz.native_ownership_genesis.v1"
      || genesis.headReference !== origin.receizClaimId) {
      return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
    }
  }
  const originPulse = genesisOrigin?.kaiPulse ?? origin.kaiPulseEternal;
  if (!decimal(originPulse) || !Number.isSafeInteger(Number(originPulse))) return unavailable("VALUATION_ORIGIN_NOT_CARRIED", proofDigest, historyHead);
  const originKaiPulse = Number(originPulse);
  const originKaiUPulse = genesisOrigin?.kaiUpulse ?? null;
  if (originKaiUPulse !== null && receizKaiMomentFromSealedUpulse(BigInt(originKaiUPulse)).pulse !== originKaiPulse) fail("KAI_ORIGIN_BRIDGE_INVALID");
  const metadata: SigilMetadataLite = { pulse: originKaiPulse, kaiPulse: originKaiPulse };
  if (record(payload?.sigilMetadata)) {
    const declared = snapshot(payload.sigilMetadata);
    // Geometry and craft parameters are sealed declarations; creator status,
    // reputation and transfers need their implemented verification boundary.
    for (const key of ["beat", "stepIndex", "stepsPerBeat", "seriesSize", "quality", "frequencyHz", "chakraDay", "chakraGate", "ip", "valuationPolicyId"] as const) {
      if (declared[key] !== undefined) (metadata as Record<string, unknown>)[key] = declared[key];
    }
    for (const key of ["pulse", "kaiPulse"] as const) if (declared[key] !== undefined && declared[key] !== originKaiPulse) fail("VALUATION_METADATA_ORIGIN_MISMATCH");
  }
  if (Object.keys(metadata).length > RECEIZ_PROOF_VALUE_LIMITS_V129.metadataEntries) fail("VALUATION_METADATA_LIMIT");
  for (const key of ["beat", "stepIndex", "stepsPerBeat", "seriesSize", "frequencyHz"] as const) if (metadata[key] !== undefined && (typeof metadata[key] !== "number" || !Number.isFinite(metadata[key]))) fail("VALUATION_METADATA_INVALID");
  if (metadata.quality !== undefined && !["low", "med", "high"].includes(metadata.quality)) fail("VALUATION_METADATA_INVALID");
  for (const key of ["chakraDay", "chakraGate", "valuationPolicyId"] as const) if (metadata[key] !== undefined && (typeof metadata[key] !== "string" || metadata[key]!.length > 256)) fail("VALUATION_METADATA_INVALID");
  if (metadata.ip !== undefined) {
    if (!record(metadata.ip) || Object.keys(metadata.ip).some(key => !["expectedCashflowPhi", "expectedCashflowKS"].includes(key))) fail("VALUATION_METADATA_INVALID");
    for (const [name, flows] of Object.entries(metadata.ip)) {
      if (!Array.isArray(flows) || flows.length > RECEIZ_PROOF_VALUE_LIMITS_V129.metadataEntries) fail("VALUATION_METADATA_LIMIT");
      for (const flow of flows) {
        const declared = flow as Record<string, unknown>;
        if (!record(declared) || !Number.isSafeInteger(declared.atPulse) || Number(declared.atPulse) < 0
          || typeof declared[name === "expectedCashflowPhi" ? "amountPhi" : "amountKS"] !== "number"
          || !Number.isFinite(declared[name === "expectedCashflowPhi" ? "amountPhi" : "amountKS"])) fail("VALUATION_METADATA_INVALID");
      }
    }
  }
  const transactions = await readReceizProofValueTransactionsV129({ ...(admission ? { admission } : {}), ...(input.sales ? { sales: input.sales } : {}) });
  return Object.freeze({ verification, admission, proofDigest, originProofDigest: originVerification.artifactDigest.value, historyHead,
    originKaiPulse, originKaiUPulse, metadata: cloneAndFreezeExactValue(metadata), payload: cloneAndFreezeExactValue(payload), transactions,
    sourceReferences: Object.freeze([`artifact:sha256:${proofDigest}`, `origin-artifact:sha256:${originVerification.artifactDigest.value}`,
      ...(genesisOrigin ? [`origin-genesis:sha256:${genesisOrigin.nodeDigest}`, `origin-kai-sigil:sha256:${genesisOrigin.proofHead}`] : []),
      ...(historyHead ? [`history:${historyHead}`] : [])]) });
}

async function projectBasis(basis: Basis, input: ReceizProofValueOptionsV129, coordinate: string): Promise<ReceizProofValueProjectionV129> {
  if (!decimal(coordinate)) fail("KAI_VALUATION_INVALID");
  const moment = receizKaiMomentFromSealedUpulse(BigInt(coordinate));
  if (moment.pulse < basis.originKaiPulse || (basis.originKaiUPulse !== null && BigInt(coordinate) < BigInt(basis.originKaiUPulse))) fail("KAI_VALUATION_BEFORE_ORIGIN");
  const metadata: SigilMetadataLite = { ...basis.metadata, cumulativeTransfers: basis.transactions.ownershipChanges.filter(row => row.previousOwnerReceizId !== null
    && row.previousOwnerReceizId !== row.currentOwnerReceizId && (row.kaiUPulse !== null
      ? BigInt(row.kaiUPulse) <= BigInt(coordinate) : BigInt(row.kaiPulse) < BigInt(moment.pulse))).length };
  const computation = computeIntrinsicUnsigned(metadata, moment.pulse);
  const phiMicro = Math.round(computation.unsigned.valuePhi * 1_000_000);
  if (!Number.isSafeInteger(phiMicro) || phiMicro < 0) fail("VALUATION_RESULT_RANGE_INVALID");
  const proofValuePhiMicro = String(phiMicro);
  const calculation: SigilCalculationTerm[] = computation.calculation.map(term => ({ ...term, sourceReferences: [...term.sourceReferences, ...basis.sourceReferences] }));
  calculation.push({ id: "proofValuePhiMicro", label: "Intrinsic Phi micro-units", formula: "Math.round(valuePhi * 1_000_000)",
    operands: { valuePhi: String(computation.unsigned.valuePhi), scale: "1000000" }, result: proofValuePhiMicro, unit: "PhiMicro", sourceReferences: [...basis.sourceReferences, "app/lib/wallet/glyphEconomyProjection.ts#projectGlyphEconomySeed"] });
  const applicableSales = basis.transactions.completedSales.filter(sale => sale.completionKaiUPulse !== null
    ? BigInt(sale.completionKaiUPulse) <= BigInt(coordinate) : BigInt(sale.completionKaiPulse) < BigInt(moment.pulse));
  const historyNodes = new Map(basis.admission?.proofHistory?.nodes.map(node => [node.nodeDigest, node]) ?? []);
  const descends = (later: string, earlier: string): boolean => {
    const visited = new Set<string>(); const pending = [...(historyNodes.get(later)?.parentDigests ?? [])];
    while (pending.length) { const next = pending.pop()!; if (next === earlier) return true;
      if (!visited.has(next)) { visited.add(next); pending.push(...(historyNodes.get(next)?.parentDigests ?? [])); } }
    return false;
  };
  const candidates = applicableSales.filter(sale => !applicableSales.some(other => other !== sale && descends(other.deliveryHead, sale.deliveryHead)));
  const lastSale = candidates.length === 1 ? candidates[0]! : null;
  let marketReferenceValuePhiMicro: string | null = null;
  let marketReferencePolicy: unknown = null;
  if (input.marketReferenceRule) {
    marketReferencePolicy = RECEIZ_LAST_EXECUTED_SALE_RULE_V129;
    if (lastSale) {
      marketReferenceValuePhiMicro = lastSale.amountPhiMicro;
      calculation.push({ id: "marketReferenceValuePhiMicro", label: "Executed-sale market reference", formula: RECEIZ_LAST_EXECUTED_SALE_RULE_V129.formula,
        operands: { amountPhiMicro: lastSale.amountPhiMicro, receiptDigest: lastSale.saleDigest, priceBasisDigest: lastSale.priceBasisDigest,
          usdPerPhiMicrocents: lastSale.usdPerPhiMicrocents, quotedUsdCents: lastSale.quotedUsdCents }, result: marketReferenceValuePhiMicro,
        unit: "PhiMicro", sourceReferences: [lastSale.saleDigest, lastSale.acceptedDeliveryReference.receiptDigest, ...lastSale.paymentReferences.map(reference => reference.receiptDigest)] });
    }
  }
  if (input.rarityPolicy) {
    const policy = snapshot(input.rarityPolicy);
    const carried = basis.payload?.receizRarity;
    const digest = await digestReceizRarityPolicyV129(policy);
    if (!record(carried) || carried.policyDigest !== digest || carried.platform !== policy.platform || carried.algorithm !== policy.algorithm
      || carried.version !== policy.version || typeof carried.issuanceId !== "string" || !carried.issuanceId || carried.issuanceId.length > 256
      || !record(carried.operands)) return fail("RARITY_POLICY_BINDING_INVALID");
    const rarity = evaluateReceizRarityPolicyV129(policy, carried.operands as Record<string, string>);
    marketReferenceValuePhiMicro = rarity.valuePhiMicro;
    marketReferencePolicy = { policy, policyDigest: digest, issuanceId: carried.issuanceId, operands: carried.operands };
    calculation.push(...rarity.calculation.map(term => ({ ...term, sourceReferences: [...term.sourceReferences, ...basis.sourceReferences, `policy:sha256:${digest}`] })));
  }
  let displayUsdCents: string | null = null; let priceBasisDigest: string | null = null;
  let usdBasis: ReceizProofValueUsdBasisV129 | null = null;
  if (input.usdBasis) {
    usdBasis = snapshot(input.usdBasis);
    if (Object.keys(usdBasis).sort().join(",") !== "algorithm,priceBasis,priceBasisDigest,usdPerPhiMicrocents,version"
      || usdBasis.algorithm !== "receiz.display-usd.v122" || usdBasis.version !== "1"
      || !decimal(usdBasis.usdPerPhiMicrocents) || usdBasis.usdPerPhiMicrocents === "0" || !record(usdBasis.priceBasis)
      || usdBasis.priceBasis.algorithm !== usdBasis.algorithm || usdBasis.priceBasis.version !== usdBasis.version
      || usdBasis.priceBasis.usdPerPhiMicrocents !== usdBasis.usdPerPhiMicrocents
      || await digestReceizCanonicalV122(usdBasis.priceBasis) !== usdBasis.priceBasisDigest) fail("USD_BASIS_BINDING_INVALID");
    priceBasisDigest = usdBasis.priceBasisDigest;
    displayUsdCents = proofValuePhiMicro === "0" ? "0" : quoteReceizDisplayUsdV122(proofValuePhiMicro, usdBasis.usdPerPhiMicrocents);
    calculation.push({ id: "displayUsdCents", label: "Intrinsic USD display", formula: "floor((PhiMicro * usdPerPhiMicrocents + 500000000000) / 1000000000000)",
      operands: { proofValuePhiMicro, usdPerPhiMicrocents: usdBasis.usdPerPhiMicrocents }, result: displayUsdCents, unit: "USD cents", sourceReferences: [priceBasisDigest, "packages/receiz-sdk/src/v122Value.ts#quoteReceizDisplayUsdV122"] });
  }
  const output = {
    status: "available" as const, schema: "receiz.proof-value-projection.v129" as const,
    algorithm: SIGIL_VALUATION_ALGORITHM, policyChecksum: SIGIL_VALUATION_POLICY_CHECKSUM,
    proofDigest: basis.proofDigest, originProofDigest: basis.originProofDigest, historyHead: basis.historyHead,
    originKaiUPulse: basis.originKaiUPulse, originKaiPulse: String(basis.originKaiPulse), valuationKaiUPulse: coordinate, valuationKaiPulse: String(moment.pulse),
    proofValuePhiMicro, marketReferenceValuePhiMicro, askingPricePhiMicro: input.askingPricePhiMicro ?? null,
    lastExecutedPricePhiMicro: lastSale?.amountPhiMicro ?? null, displayUsdCents, priceBasisDigest,
    inputs: { metadata, metadataAuthority: "sealed-declarations-and-verified-history", diagnostics: computation.unsigned.inputs,
      appliedDefaults: computation.appliedDefaults, unknownInputs: ["creatorVerified", "creatorRep"], policy: SIGIL_VALUATION_POLICY,
      rounding: SIGIL_VALUATION_ROUNDING, marketReferencePolicy, usdBasis, sourceReferences: basis.sourceReferences },
    calculation, transactions: basis.transactions, writesPerformed: 0 as const,
    authority: { valuationIsSettlementAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const },
  };
  return cloneAndFreezeExactValue({ ...output, projectionDigest: await digestReceizCanonicalV122(output) });
}

export async function projectReceizProofValueV129(input: ReceizProofValueOptionsV129 & Readonly<{ valuationKaiUPulse: string }>): Promise<ReceizProofValueResultV129> {
  input = snapshotReceizProofValueInputV129(input);
  checkOptions(input, "valuationKaiUPulse");
  if (!decimal(input.valuationKaiUPulse)) fail("KAI_VALUATION_INVALID");
  const basis = await readReceizProofValueBasisV129(input);
  return "status" in basis ? basis : projectBasis(basis, input, input.valuationKaiUPulse);
}

export async function sampleReceizProofValueV129(input: ReceizProofValueOptionsV129 & Readonly<{ valuationKaiUPulses: readonly string[] }>): Promise<Readonly<{
  kind: "recomputed-model-samples";
  samples: readonly ReceizProofValueResultV129[];
  transactions: ReceizProofValueTransactionsV129 | null;
  writesPerformed: 0;
}>> {
  input = snapshotReceizProofValueInputV129(input);
  checkOptions(input, "valuationKaiUPulses");
  if (!Array.isArray(input.valuationKaiUPulses) || input.valuationKaiUPulses.length < 1 || input.valuationKaiUPulses.length > RECEIZ_PROOF_VALUE_LIMITS_V129.samples) fail("SAMPLE_LIMIT");
  const coordinates = [...input.valuationKaiUPulses];
  for (const coordinate of coordinates) { if (!decimal(coordinate)) fail("KAI_VALUATION_INVALID"); receizKaiMomentFromSealedUpulse(BigInt(coordinate)); }
  const basis = await readReceizProofValueBasisV129(input);
  const samples: ReceizProofValueResultV129[] = [];
  for (const coordinate of coordinates) samples.push("status" in basis ? basis : await projectBasis(basis, input, coordinate));
  return cloneAndFreezeExactValue({ kind: "recomputed-model-samples", samples, transactions: "status" in basis ? null : basis.transactions, writesPerformed: 0 });
}
