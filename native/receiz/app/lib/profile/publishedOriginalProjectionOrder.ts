type CanonicalProfileOriginalIdentity = Readonly<{
  id: string;
  pulse: string | null;
}>;

type NormalizedKaiPulse = Readonly<{
  whole: string;
  fraction: string;
}>;

function normalizeKaiPulse(value: string | null): NormalizedKaiPulse | null {
  const raw = (value ?? "").trim();
  if (!/^\d+(?:\.\d+)?$/u.test(raw)) return null;
  const [wholeRaw = "0", fractionRaw = ""] = raw.split(".");
  return {
    whole: wholeRaw.replace(/^0+(?=\d)/u, ""),
    fraction: fractionRaw.replace(/0+$/u, ""),
  };
}

function compareNormalizedKaiPulse(left: NormalizedKaiPulse, right: NormalizedKaiPulse): number {
  if (left.whole.length !== right.whole.length) return left.whole.length < right.whole.length ? -1 : 1;
  const whole = left.whole.localeCompare(right.whole);
  if (whole !== 0) return whole;
  const width = Math.max(left.fraction.length, right.fraction.length);
  return left.fraction.padEnd(width, "0").localeCompare(right.fraction.padEnd(width, "0"));
}

export function compareKaiPulseCoordinates(left: string | null, right: string | null): number | null {
  const leftKai = normalizeKaiPulse(left);
  const rightKai = normalizeKaiPulse(right);
  return leftKai && rightKai ? compareNormalizedKaiPulse(leftKai, rightKai) : null;
}

/**
 * Proof-object presentation follows the deterministic Kai pulse sealed into
 * the object. `createdAt` is display metadata and is deliberately absent.
 */
export function compareCanonicalProfileOriginalOrder(
  left: CanonicalProfileOriginalIdentity,
  right: CanonicalProfileOriginalIdentity,
): number {
  const leftKai = normalizeKaiPulse(left.pulse);
  const rightKai = normalizeKaiPulse(right.pulse);
  if (leftKai && rightKai) {
    const byKai = compareNormalizedKaiPulse(rightKai, leftKai);
    if (byKai !== 0) return byKai;
  } else if (leftKai || rightKai) {
    return leftKai ? -1 : 1;
  }
  return right.id.localeCompare(left.id);
}

export function mergePublicOriginalInCanonicalOrder<
  T extends CanonicalProfileOriginalIdentity,
>(current: readonly T[], incoming: T): T[] {
  return [
    incoming,
    ...current.filter((original) => original.id !== incoming.id),
  ].sort(compareCanonicalProfileOriginalOrder);
}
