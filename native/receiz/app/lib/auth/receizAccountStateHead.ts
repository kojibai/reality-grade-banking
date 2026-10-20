export const RECEIZ_ACCOUNT_STATE_HEAD_SCHEMA = "receiz.account.state.head.v1" as const;

export type ReceizAccountStateHead = {
  schema: typeof RECEIZ_ACCOUNT_STATE_HEAD_SCHEMA;
  kaiPulse: string | null;
  kaiUpulse: string | null;
};

const KAI_PULSE_KEYS = new Set([
  "headKaiPulse",
  "head_kai_pulse",
  "kaiPulse",
  "kaiPulseEternal",
  "kai_pulse",
  "lastEntryKaiPulse",
  "lastSealedPulse",
  "last_entry_kai_pulse",
  "parent_pulse",
  "pulse",
  "sealedPulse",
]);

const KAI_UPULSE_KEYS = new Set([
  "headKaiUpulse",
  "kaiUpulse",
  "kai_upulse",
  "lastEntryKaiUpulse",
  "last_entry_kai_upulse",
  "upulse",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function kaiCoordinate(value: unknown): string | null {
  if (typeof value === "bigint" && value >= 0n) return value.toString();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^\d+$/.test(normalized) ? BigInt(normalized).toString() : null;
}

function farther(left: string | null, right: string | null): string | null {
  if (left === null) return right;
  if (right === null) return left;
  return BigInt(right) > BigInt(left) ? right : left;
}

export function deriveReceizAccountStateHead(snapshot: unknown): ReceizAccountStateHead {
  let kaiPulse: string | null = null;
  let kaiUpulse: string | null = null;
  const visited = new Set<object>();

  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "accountStateHead") continue;
      if (KAI_PULSE_KEYS.has(key)) kaiPulse = farther(kaiPulse, kaiCoordinate(child));
      if (KAI_UPULSE_KEYS.has(key)) kaiUpulse = farther(kaiUpulse, kaiCoordinate(child));
      visit(child);
    }
  };

  visit(snapshot);
  return { schema: RECEIZ_ACCOUNT_STATE_HEAD_SCHEMA, kaiPulse, kaiUpulse };
}

export function readReceizAccountStateHead(snapshot: unknown): ReceizAccountStateHead {
  const state = record(snapshot);
  const explicit = record(state?.accountStateHead);
  if (explicit?.schema === RECEIZ_ACCOUNT_STATE_HEAD_SCHEMA) {
    return {
      schema: RECEIZ_ACCOUNT_STATE_HEAD_SCHEMA,
      kaiPulse: kaiCoordinate(explicit.kaiPulse),
      kaiUpulse: kaiCoordinate(explicit.kaiUpulse),
    };
  }
  return deriveReceizAccountStateHead(snapshot);
}
