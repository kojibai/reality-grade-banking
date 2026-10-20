import { ed25519 } from "@noble/curves/ed25519.js";
import { normalizePlan, type Plan } from "@/app/lib/premium/plan";
import { pinnedReceizSignatureV4RootPublicKeysForClient } from "@/app/lib/security/receizSignatureV4Pinned";
import type { ReceizSignatureV4RootPublicKey } from "@/app/lib/security/receizSignatureV4";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { base64UrlDecode } from "@/app/utils/sha256";
import { KaiTimeSource, N_DAY_MICRO, microPulsesSinceGenesis } from "@/app/utils/kai_pulse";

export const SUBSCRIPTION_TERM_SCHEMA = "receiz.subscription.term.v1" as const;
export const SUBSCRIPTION_TERM_SIGNATURE_DOMAIN =
  "receiz.subscription.term.root-signature.v1" as const;

export type SubscriptionTermPayload = {
  schema: typeof SUBSCRIPTION_TERM_SCHEMA;
  domain: typeof SUBSCRIPTION_TERM_SIGNATURE_DOMAIN;
  issuerRootKid: string;
  principalUserId: string;
  plan: Exclude<Plan, "free">;
  stripeSubscriptionId: string;
  stripePriceId: string;
  startKaiMicroPulse: string;
  endKaiMicroPulse: string;
  startChronosIso?: string;
  endChronosIso?: string;
};

export type SubscriptionTermDraft = Omit<SubscriptionTermPayload, "issuerRootKid">;

export type SubscriptionTermRootSignature = {
  kid: string;
  alg: "Ed25519";
  sig: string;
};

export type SubscriptionTermProof = SubscriptionTermPayload & {
  rootSignature: SubscriptionTermRootSignature;
};

const INTEGER_RE = /^\d+$/;
const KID_RE = /^[a-z0-9._:-]{3,64}$/i;
const B64U_RE = /^[A-Za-z0-9_-]+$/;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const currentKaiMicroPulse = () => new KaiTimeSource({ ignoreOverride: true }).nowMicroPulses();
const verifiedSubscriptionTermProofObjects = new WeakSet<object>();
let cryptoVerificationObserverForTest: (() => void) | null = null;

export function __setSubscriptionTermCryptoVerificationObserverForTest(
  observer: (() => void) | null,
): void {
  cryptoVerificationObserverForTest = observer;
}

function paidPlan(value: unknown): SubscriptionTermPayload["plan"] | null {
  const plan = normalizePlan(value);
  return plan !== "free" && plan === value ? plan : null;
}

function microPulse(value: unknown): string | null {
  const normalized = text(value);
  return INTEGER_RE.test(normalized) ? BigInt(normalized).toString() : null;
}

function requiredIso(value: unknown): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function normalizeOptionalIso(
  record: Record<string, unknown>,
  key: "startChronosIso" | "endChronosIso",
): string | null | undefined {
  if (!(key in record)) return undefined;
  return requiredIso(record[key]);
}

function normalizeSubscriptionTermDraft(value: unknown): SubscriptionTermDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.schema !== SUBSCRIPTION_TERM_SCHEMA
    || record.domain !== SUBSCRIPTION_TERM_SIGNATURE_DOMAIN
  ) return null;
  const principalUserId = text(record.principalUserId);
  const plan = paidPlan(record.plan);
  const stripeSubscriptionId = text(record.stripeSubscriptionId);
  const stripePriceId = text(record.stripePriceId);
  const startKaiMicroPulse = microPulse(record.startKaiMicroPulse);
  const endKaiMicroPulse = microPulse(record.endKaiMicroPulse);
  const startChronosIso = normalizeOptionalIso(record, "startChronosIso");
  const endChronosIso = normalizeOptionalIso(record, "endChronosIso");
  if (
    !principalUserId || !plan || !stripeSubscriptionId || !stripePriceId
    || !startKaiMicroPulse || !endKaiMicroPulse
    || BigInt(endKaiMicroPulse) <= BigInt(startKaiMicroPulse)
    || startChronosIso === null || endChronosIso === null
  ) return null;
  return {
    schema: SUBSCRIPTION_TERM_SCHEMA,
    domain: SUBSCRIPTION_TERM_SIGNATURE_DOMAIN,
    principalUserId,
    plan,
    stripeSubscriptionId,
    stripePriceId,
    startKaiMicroPulse,
    endKaiMicroPulse,
    ...(startChronosIso ? { startChronosIso } : {}),
    ...(endChronosIso ? { endChronosIso } : {}),
  };
}

export function normalizeSubscriptionTermPayload(value: unknown): SubscriptionTermPayload | null {
  const draft = normalizeSubscriptionTermDraft(value);
  if (!draft || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const issuerRootKid = text((value as Record<string, unknown>).issuerRootKid);
  if (!KID_RE.test(issuerRootKid)) return null;
  return {
    ...draft,
    issuerRootKid,
  };
}

function normalizeRootSignature(value: unknown): SubscriptionTermRootSignature | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kid = text(record.kid);
  const sig = text(record.sig);
  if (
    !KID_RE.test(kid)
    || record.alg !== "Ed25519"
    || !B64U_RE.test(sig)
  ) return null;
  try {
    if (base64UrlDecode(sig).byteLength !== 64) return null;
  } catch {
    return null;
  }
  return { kid, alg: "Ed25519", sig };
}

export function buildSubscriptionTermSignedPayload(value: SubscriptionTermPayload): string {
  return jcsCanonicalize({
    schema: value.schema,
    domain: value.domain,
    issuerRootKid: value.issuerRootKid,
    principalUserId: value.principalUserId,
    plan: value.plan,
    stripeSubscriptionId: value.stripeSubscriptionId,
    stripePriceId: value.stripePriceId,
    startKaiMicroPulse: value.startKaiMicroPulse,
    endKaiMicroPulse: value.endKaiMicroPulse,
    ...(value.startChronosIso ? { startChronosIso: value.startChronosIso } : {}),
    ...(value.endChronosIso ? { endChronosIso: value.endChronosIso } : {}),
  });
}

export function normalizeSubscriptionTermProof(
  value: unknown,
  rootPublicKeys: ReadonlyMap<string, ReceizSignatureV4RootPublicKey> =
    pinnedReceizSignatureV4RootPublicKeysForClient(),
): SubscriptionTermProof | null {
  if (
    value
    && typeof value === "object"
    && !Array.isArray(value)
    && verifiedSubscriptionTermProofObjects.has(value)
  ) {
    return value as SubscriptionTermProof;
  }
  const payload = normalizeSubscriptionTermPayload(value);
  if (!payload || !value || typeof value !== "object" || Array.isArray(value)) return null;
  const rootSignature = normalizeRootSignature(
    (value as Record<string, unknown>).rootSignature,
  );
  if (!rootSignature) return null;
  if (payload.issuerRootKid !== rootSignature.kid) return null;
  const rootKey = rootPublicKeys.get(rootSignature.kid) ?? null;
  if (
    !rootKey
    || rootKey.status !== "active"
    || rootKey.alg !== rootSignature.alg
  ) return null;
  if (
    rootKey.activeFromPulse
    && BigInt(payload.startKaiMicroPulse) < BigInt(rootKey.activeFromPulse)
  ) return null;
  if (
    rootKey.retiredAtPulse
    && BigInt(payload.endKaiMicroPulse) > BigInt(rootKey.retiredAtPulse)
  ) return null;
  try {
    cryptoVerificationObserverForTest?.();
    const verified = ed25519.verify(
      base64UrlDecode(rootSignature.sig),
      new TextEncoder().encode(buildSubscriptionTermSignedPayload(payload)),
      base64UrlDecode(rootKey.publicKeyRawB64u),
    );
    if (!verified) return null;
    const frozenRootSignature = Object.freeze({ ...rootSignature });
    const proof = Object.freeze({
      ...payload,
      rootSignature: frozenRootSignature,
    });
    verifiedSubscriptionTermProofObjects.add(proof);
    return proof;
  } catch {
    return null;
  }
}

export function subscriptionTermDraftFromChronos(args: {
  principalUserId: string;
  plan: Exclude<Plan, "free">;
  stripeSubscriptionId: string;
  stripePriceId: string;
  start: string | Date;
  end: string | Date;
}): SubscriptionTermDraft {
  const start = args.start instanceof Date ? args.start : new Date(args.start);
  const end = args.end instanceof Date ? args.end : new Date(args.end);
  const draft = normalizeSubscriptionTermDraft({
    schema: SUBSCRIPTION_TERM_SCHEMA,
    domain: SUBSCRIPTION_TERM_SIGNATURE_DOMAIN,
    principalUserId: args.principalUserId,
    plan: args.plan,
    stripeSubscriptionId: args.stripeSubscriptionId,
    stripePriceId: args.stripePriceId,
    startKaiMicroPulse: microPulsesSinceGenesis(start).toString(),
    endKaiMicroPulse: microPulsesSinceGenesis(end).toString(),
    startChronosIso: start.toISOString(),
    endChronosIso: end.toISOString(),
  });
  if (!draft) throw new Error("subscription_term_invalid");
  return draft;
}

export function activePlanForSubscriptionTerm(args: {
  principalUserId: string;
  plan: Plan | null;
  term?: SubscriptionTermProof | null;
  nowKaiMicroPulse?: bigint;
  requireTermForPaid?: boolean;
  timeSource?: Pick<KaiTimeSource, "nowMicroPulses">;
}): Plan | null {
  if (args.plan == null) return null;
  const plan = normalizePlan(args.plan);
  if (plan === "free") return "free";
  const term = normalizeSubscriptionTermProof(args.term);
  if (!term) return args.requireTermForPaid === true ? "free" : plan;
  if (term.principalUserId !== args.principalUserId || term.plan !== plan) return "free";
  const now = args.nowKaiMicroPulse ?? args.timeSource?.nowMicroPulses() ?? currentKaiMicroPulse();
  return now >= BigInt(term.startKaiMicroPulse) && now < BigInt(term.endKaiMicroPulse) ? plan : "free";
}

export function continuityPlanForSubscriptionTerm(args: {
  principalUserId: string;
  plan: Plan | null;
  term?: SubscriptionTermProof | null;
  nowKaiMicroPulse?: bigint;
  requireTermForPaid?: boolean;
  timeSource?: Pick<KaiTimeSource, "nowMicroPulses">;
}): Plan | null {
  if (args.plan == null) return null;
  const plan = normalizePlan(args.plan);
  // Preserve v115 paid account projection exactly. The signed term may elevate
  // a weaker Free projection, but it can never subtract an already-paid plan.
  if (plan !== "free") return plan;
  const term = normalizeSubscriptionTermProof(args.term);
  if (!term || term.principalUserId !== args.principalUserId) return "free";
  const now =
    args.nowKaiMicroPulse ??
    args.timeSource?.nowMicroPulses() ??
    currentKaiMicroPulse();
  return now >= BigInt(term.startKaiMicroPulse) ? term.plan : "free";
}

export function subscriptionTermNeedsRefresh(args: {
  principalUserId: string;
  plan: Plan | null;
  term?: SubscriptionTermProof | null;
  nowKaiMicroPulse?: bigint;
  refreshWindowKaiMicroPulses?: bigint;
  timeSource?: Pick<KaiTimeSource, "nowMicroPulses">;
}): boolean {
  if (args.plan == null || normalizePlan(args.plan) === "free") return false;
  const plan = normalizePlan(args.plan);
  const term = normalizeSubscriptionTermProof(args.term);
  if (!term || term.principalUserId !== args.principalUserId || term.plan !== plan) return true;
  const now = args.nowKaiMicroPulse ?? args.timeSource?.nowMicroPulses() ?? currentKaiMicroPulse();
  const refreshWindow = args.refreshWindowKaiMicroPulses ?? N_DAY_MICRO;
  return now + refreshWindow >= BigInt(term.endKaiMicroPulse);
}

export function mergeSubscriptionTermProof(
  currentValue: unknown,
  nextValue: unknown,
  _nowKaiMicroPulse?: bigint,
): SubscriptionTermProof | null {
  const current = normalizeSubscriptionTermProof(currentValue);
  const next = normalizeSubscriptionTermProof(nextValue);
  if (!current) return next;
  if (!next || current.principalUserId !== next.principalUserId) return current;
  const currentStart = BigInt(current.startKaiMicroPulse);
  const currentEnd = BigInt(current.endKaiMicroPulse);
  const nextStart = BigInt(next.startKaiMicroPulse);
  const nextEnd = BigInt(next.endKaiMicroPulse);
  if (nextStart > currentStart) return next;
  if (nextStart < currentStart) return current;
  if (nextEnd > currentEnd) return next;
  if (nextEnd < currentEnd) return current;
  return next;
}
