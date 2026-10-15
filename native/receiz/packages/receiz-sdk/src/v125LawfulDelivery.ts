/** Transport evidence only. The enclosing sealed source remains authority. */
export type ReceizLawfulDeliveryV125 = Readonly<{
  status: "pre-write-rejection" | "verified-completion" | "recoverable";
  sourceStorage: "not-entered" | "retained" | "unknown";
  domainAppend: "not-entered" | "completed" | "rejected" | "unknown";
  retry: "same-source-and-key" | "do-not-rederive";
  /** Acknowledged/uncertain upload requests, not proof admission or full custody. */
  stagedSource?: Readonly<{ retainedBlocks: number; uncertainBlocks: number }>;
}>;
export function parseReceizLawfulDeliveryV125(value: unknown): ReceizLawfulDeliveryV125 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (!["domainAppend,retry,sourceStorage,status", "domainAppend,retry,sourceStorage,stagedSource,status"].includes(Object.keys(v).sort().join(","))
    || !["pre-write-rejection", "verified-completion", "recoverable"].includes(String(v.status))
    || !["not-entered", "retained", "unknown"].includes(String(v.sourceStorage))
    || !["not-entered", "completed", "rejected", "unknown"].includes(String(v.domainAppend))
    || !["same-source-and-key", "do-not-rederive"].includes(String(v.retry))) return null;
  if (v.status === "pre-write-rejection" && (v.sourceStorage !== "not-entered" || v.domainAppend !== "not-entered")) return null;
  if (v.status === "verified-completion" && v.domainAppend !== "completed") return null;
  if (v.status === "recoverable" && v.domainAppend === "completed") return null;
  let stagedSource: ReceizLawfulDeliveryV125["stagedSource"];
  if (v.stagedSource !== undefined) {
    const staged = v.stagedSource as Record<string, unknown>;
    if (!staged || typeof staged !== "object" || Array.isArray(staged)
      || Object.keys(staged).sort().join(",") !== "retainedBlocks,uncertainBlocks"
      || ![staged.retainedBlocks, staged.uncertainBlocks].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0)
      || (Number(staged.retainedBlocks) > 0 && v.sourceStorage !== "retained")
      || (Number(staged.uncertainBlocks) > 0 && v.sourceStorage === "not-entered")) return null;
    stagedSource = Object.freeze({ retainedBlocks: Number(staged.retainedBlocks), uncertainBlocks: Number(staged.uncertainBlocks) });
  }
  return Object.freeze({ status: v.status, sourceStorage: v.sourceStorage, domainAppend: v.domainAppend, retry: v.retry,
    ...(stagedSource ? { stagedSource } : {}) }) as ReceizLawfulDeliveryV125;
}
export class ReceizLawfulDeliveryErrorV125 extends TypeError {
  constructor(message: string, readonly delivery: ReceizLawfulDeliveryV125) { super(message); this.name = "ReceizLawfulDeliveryErrorV125"; }
}
export function unknownReceizLawfulDeliveryV125(value = false): ReceizLawfulDeliveryV125 {
  return Object.freeze({ status: "recoverable", sourceStorage: value ? "not-entered" : "unknown", domainAppend: "unknown", retry: value ? "do-not-rederive" : "same-source-and-key" });
}
