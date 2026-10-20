export type FirstPaintProofObjectImport = {
  schema?: string;
  payloadSha256?: string;
  profiles?: unknown;
  marketTransport?: unknown;
};

export function resolveFirstPaintProofObjectImport(value: unknown): FirstPaintProofObjectImport | null {
  let candidate = value;
  const seen = new Set<unknown>();

  for (let depth = 0; depth < 8; depth += 1) {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) return null;
    seen.add(candidate);
    const record = candidate as Record<string, unknown>;
    if (record.schema === "receiz.first_paint.proof_object.v1") {
      return record as FirstPaintProofObjectImport;
    }
    candidate = record.default;
  }

  return null;
}
