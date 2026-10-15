// DO NOT EDIT. Generated from frozen app/utils/kai_pulse.ts.
// Source SHA-256: 371aaa4c1221301de0e877492d65988b7256bd71aeebdcf1806c31c8bfe9943d

export const GENESIS_TS = 1715323541888 as const; // 2024-05-10T06:45:41.888Z
const INV_Tx1000_NUM = BigInt("190983005625052575897706582817180941139845410097118568932275689");
const INV_Tx1000_DEN = 10n ** 60n;
const abs = (x: bigint) => (x < 0n ? -x : x);

const mulDivRoundHalfEven = (x: bigint, num: bigint, den: bigint): bigint => {
  if (den <= 0n) throw new Error("Denominator must be positive.");
  const sgn = (x < 0n ? -1n : 1n) * (num < 0n ? -1n : 1n);
  const A = abs(x) * abs(num);
  const q = A / den;
  const r = A % den;
  const twice = r * 2n;

  let n = q;
  if (twice > den) n = q + 1n;
  else if (twice === den && (q & 1n) === 1n) n = q + 1n; // tie → nearest even

  return sgn * n;
};

export function microPulsesSinceGenesisEpochMsV124(msEpoch: bigint): bigint {
  const deltaMs = msEpoch - BigInt(GENESIS_TS);
  return mulDivRoundHalfEven(deltaMs, INV_Tx1000_NUM, INV_Tx1000_DEN);
}
