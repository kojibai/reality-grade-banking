import { encodeSharePayload } from "../../utils/shareBundleCodec.js";

export const RECEIZ_WALLET_LEDGER_RECEIPT_CHUNK_QUERY_PARAM = "walletLedgerReceipt";
export const RECEIZ_WALLET_LEDGER_RECEIPT_CHUNK_KEY = "receiz.wallet_ledger_receipt";

export type WalletLedgerLinkReceizMoment = {
  ts?: string | null;
  slug?: string | null;
  code?: string | null;
  pulse?: string | null;
  ms?: string | null;
  anchorId?: string | null;
};

export type WalletLedgerLinkEvent = {
  id: string;
  kind: string;
  createdAt: string;
  pulse: number;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents?: string;
  receiz?: WalletLedgerLinkReceizMoment | null;
  proofBundle: {
    artifactDigest?: string;
    proofCapsule: unknown;
    capsuleHash: string;
    bundleHash: string;
    verifierUrl: string;
    verifier: "local";
    verificationVersion: "wallet-ledger-v1";
    verifiedAtPulse: number;
    proofHints: unknown;
  };
  valueReceipt?: unknown;
  [key: string]: unknown;
};

function receiptSlugFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "00000000_0000";
  const y = String(d.getUTCFullYear());
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${day}_${hh}${mm}`;
}

function receiptSlugFromTs(ts: string): string {
  return ts.replace(/-/g, "").replace(/:/g, "").replace(/ /g, "_");
}

function receiptCodeFromEventId(eventId: string): string {
  const cleaned = eventId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 8) return cleaned.slice(-16);
  return `TXN${cleaned.padStart(5, "0")}`.slice(0, 16);
}

export function resolveWalletLedgerReceizMeta(event: WalletLedgerLinkEvent): {
  ts: string;
  slug: string;
  code: string;
  pulse: string;
  ms: string;
  anchorId?: string;
} | null {
  const ts = (event.receiz?.ts ?? "").trim();
  const slug = (event.receiz?.slug ?? "").trim();
  const code = (event.receiz?.code ?? "").trim().toUpperCase();
  const pulse = (event.receiz?.pulse ?? "").trim();
  const ms = (event.receiz?.ms ?? "").trim();
  const anchorId = (event.receiz?.anchorId ?? "").trim().toLowerCase();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(ts)) return null;
  if (!/^\d{8}_\d{4}$/.test(slug)) return null;
  if (!/^[A-Z0-9]{8,32}$/.test(code)) return null;
  if (!/^\d{1,64}$/.test(pulse)) return null;
  if (!/^\d{1,20}$/.test(ms)) return null;
  if (slug !== receiptSlugFromTs(ts)) return null;
  return /^[0-9a-f]{8}$/.test(anchorId) ? { ts, slug, code, pulse, ms, anchorId } : { ts, slug, code, pulse, ms };
}

function baseReceiptPath(event: WalletLedgerLinkEvent, route: "v" | "t"): string {
  const receiz = resolveWalletLedgerReceizMeta(event);
  const slug = receiz?.slug ?? receiptSlugFromIso(event.createdAt);
  const code = receiz?.code ?? receiptCodeFromEventId(event.id);
  const pulse = receiz?.pulse ?? String(Math.max(0, Math.trunc(event.pulse)));
  return `/${route}/${slug}/${code}/${pulse}`;
}

export function walletLedgerEventOpensProof(event: WalletLedgerLinkEvent): boolean {
  if (event.kind === "signal_card_transfer" || event.kind === "sports_card_transfer") return true;
  if (event.kind !== "wallet_ledger_entry") return false;
  return (
    event.ledgerEntryKind === "signal_pack_purchase" ||
    event.ledgerEntryKind === "sports_pack_purchase" ||
    event.ledgerEntryKind === "signal_card_reward_seal"
  );
}

function copyEventExtras(event: WalletLedgerLinkEvent): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  const keys = [
    "transferId",
    "conversationId",
    "messageId",
    "sender",
    "recipient",
    "actor",
    "noteId",
    "noteTokenSuffix",
    "reserveCreditKind",
    "ledgerEntryKind",
    "direction",
    "sport",
    "collectibleId",
    "claimHash",
    "cardName",
    "cardOpenPath",
    "note",
  ];
  for (const key of keys) {
    const value = event[key];
    if (typeof value !== "undefined") extras[key] = value;
  }
  return extras;
}

export function buildWalletLedgerReceiptPayload(event: WalletLedgerLinkEvent): Record<string, unknown> {
  return {
    ...(event.proofBundle.artifactDigest ? {artifactDigest:event.proofBundle.artifactDigest} : {}),
    proofCapsule: event.proofBundle.proofCapsule,
    capsuleHash: event.proofBundle.capsuleHash,
    bundleHash: event.proofBundle.bundleHash,
    verifierUrl: event.proofBundle.verifierUrl,
    verifier: event.proofBundle.verifier,
    verificationVersion: event.proofBundle.verificationVersion,
    verifiedAtPulse: event.proofBundle.verifiedAtPulse,
    proofHints: event.proofBundle.proofHints,
    event: {
      id: event.id,
      kind: event.kind,
      createdAt: event.createdAt,
      pulse: event.pulse,
      amountPhiMicro: event.amountPhiMicro,
      amountUsdCents: event.amountUsdCents,
      usdPerPhiMicrocents: event.usdPerPhiMicrocents,
      valueReceipt: event.valueReceipt,
      receiz: event.receiz,
      ...(event.rail !== undefined ? {rail:event.rail} : {}),
      ...(event.metadata !== undefined ? {metadata:event.metadata} : {}),
    },
    ...copyEventExtras(event),
  };
}

export function buildWalletLedgerVHref(event: WalletLedgerLinkEvent): string {
  const receiz = resolveWalletLedgerReceizMeta(event);
  const params = new URLSearchParams({ p: encodeSharePayload(buildWalletLedgerReceiptPayload(event)) });
  if (receiz?.ms) params.set("ms", receiz.ms);
  if (receiz?.anchorId) params.set("a", receiz.anchorId);
  return `${baseReceiptPath(event, "v")}?${params.toString()}`;
}

export function buildWalletLedgerTransactionHref(event: WalletLedgerLinkEvent): string {
  if (walletLedgerEventOpensProof(event)) return buildWalletLedgerVHref(event);
  const receiz = resolveWalletLedgerReceizMeta(event);
  const params = new URLSearchParams({ p: encodeSharePayload(buildWalletLedgerReceiptPayload(event)) });
  if (receiz?.ms) params.set("ms", receiz.ms);
  if (receiz?.anchorId) params.set("a", receiz.anchorId);
  return `${baseReceiptPath(event, "t")}?${params.toString()}`;
}

export function fallbackWalletLedgerReceiptDownloadName(event: WalletLedgerLinkEvent): string {
  const receiz = resolveWalletLedgerReceizMeta(event);
  const slug = receiz?.slug ?? receiptSlugFromIso(event.createdAt);
  const code = receiz?.code ?? receiptCodeFromEventId(event.id);
  return `receiz_${slug}_${code}_record.png`;
}

export function buildWalletLedgerReceiptDownloadProof(event: WalletLedgerLinkEvent): Record<string, unknown> {
  return {
    kind: "receiz.wallet_ledger_receipt",
    version: 1,
    payload: buildWalletLedgerReceiptPayload(event),
  };
}

export function buildWalletLedgerReceiptDownloadHref(
  event: WalletLedgerLinkEvent,
  options: { claim?: string | null; presentation?: "transaction-register" | "public-proof" } = {},
): string {
  const receiz = resolveWalletLedgerReceizMeta(event);
  const ms =
    receiz?.ms ??
    (() => {
      const parsed = Date.parse(event.createdAt);
      return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : "0";
    })();
  const params = new URLSearchParams({ ms });
  params.set("name", fallbackWalletLedgerReceiptDownloadName(event).replace(/_record\.png$/, "_moment.png"));
  params.set("slug", receiz?.slug ?? receiptSlugFromIso(event.createdAt));
  params.set("code", receiz?.code ?? receiptCodeFromEventId(event.id));
  params.set("pulse", receiz?.pulse ?? String(Math.max(0, Math.trunc(event.pulse))));
  if (options.presentation === "public-proof") params.set("presentation", "public-proof");
  if (receiz?.ts) params.set("ts", receiz.ts);
  if (receiz?.code) params.set("c", receiz.code);
  if (receiz?.pulse) params.set("p", receiz.pulse);
  if (receiz?.anchorId) params.set("a", receiz.anchorId);
  if (options.claim) params.set("claim", options.claim);
  params.set(RECEIZ_WALLET_LEDGER_RECEIPT_CHUNK_QUERY_PARAM, encodeSharePayload(buildWalletLedgerReceiptDownloadProof(event)));
  return `/api/transactions/moment-card?${params.toString()}`;
}

export function buildWalletLedgerReceiptDownloadHrefFromPayload(args: {
  payload: Record<string, unknown>;
  slug: string;
  code: string;
  pulse: string;
  ms?: string | null;
  anchorId?: string | null;
  ts?: string | null;
  presentation?: "transaction-register" | "public-proof";
}): string {
  const params = new URLSearchParams({
    ms: args.ms && /^\d{1,20}$/.test(args.ms) ? args.ms : "0",
  });
  params.set("name", `receiz_${args.slug}_${args.code}_moment.png`);
  params.set("slug", args.slug);
  params.set("code", args.code);
  params.set("pulse", args.pulse);
  if (args.presentation === "public-proof") params.set("presentation", "public-proof");
  if (args.ts) params.set("ts", args.ts);
  params.set("c", args.code);
  params.set("p", args.pulse);
  if (args.anchorId && /^[0-9a-f]{8}$/i.test(args.anchorId)) params.set("a", args.anchorId.toLowerCase());
  params.set(
    RECEIZ_WALLET_LEDGER_RECEIPT_CHUNK_QUERY_PARAM,
    encodeSharePayload({
      kind: "receiz.wallet_ledger_receipt",
      version: 1,
      payload: args.payload,
    }),
  );
  return `/api/transactions/moment-card?${params.toString()}`;
}
