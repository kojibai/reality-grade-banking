import { KaiTimeSource } from "@/app/utils/kai_pulse";

/**
 * Proof creation samples the monotonic Kai frequency from genesis. Chronos
 * timestamps may accompany an object for display or transport, but they are
 * never accepted here as causal input.
 */
const liveProofKaiTimeSource = new KaiTimeSource({ ignoreOverride: true });
let lastIssuedKaiUpulse = -1n;

function parsedKaiUpulse(value: string | bigint | undefined): bigint | null {
  if (typeof value === "bigint") return value >= 0n ? value : null;
  if (typeof value !== "string" || !/^\d+$/u.test(value)) return null;
  const parsed = BigInt(value);
  return parsed >= 0n ? parsed : null;
}

export function nextLiveProofKaiUpulse(after?: string | bigint): string {
  const afterKai = parsedKaiUpulse(after);
  if (after !== undefined && afterKai === null) throw new TypeError("PROOF_KAI_UPULSE_INVALID");
  const sampled = liveProofKaiTimeSource.nowMicroPulses();
  const next = [sampled, lastIssuedKaiUpulse + 1n, afterKai === null ? 0n : afterKai + 1n]
    .reduce((highest, candidate) => candidate > highest ? candidate : highest, 0n);
  lastIssuedKaiUpulse = next;
  return next.toString();
}

export type LiveProofKaiCoordinate = Readonly<{
  schema: "receiz.kks-v1.proof-coordinate.v1";
  kksVersion: "KKSv1.0";
  kaiPulse: string;
  kaiUpulse: string;
  temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis";
  chronosRole: "descriptive-projection-only";
  createdAtAuthority: false;
  networkRequired: false;
}>;

export function nextLiveProofKaiCoordinate(after?: string | bigint): LiveProofKaiCoordinate {
  const kaiUpulse = nextLiveProofKaiUpulse(after);
  return Object.freeze({
    schema: "receiz.kks-v1.proof-coordinate.v1",
    kksVersion: "KKSv1.0",
    kaiPulse: (BigInt(kaiUpulse) / 1_000_000n).toString(),
    kaiUpulse,
    temporalAuthority: "kai-pulse-monotonic-frequency-from-genesis",
    chronosRole: "descriptive-projection-only",
    createdAtAuthority: false,
    networkRequired: false,
  });
}

export function proofKaiUpulseAtOffset(baseKaiUpulse: string, offset: number): string {
  if (!/^\d+$/u.test(baseKaiUpulse) || !Number.isSafeInteger(offset) || offset < 0) {
    throw new TypeError("PROOF_KAI_UPULSE_INVALID");
  }
  return (BigInt(baseKaiUpulse) + BigInt(offset)).toString();
}
