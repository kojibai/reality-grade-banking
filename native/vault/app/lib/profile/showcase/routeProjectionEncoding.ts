const PROFILE_ORIGINAL_RENDER_APPEND_TYPE =
  "receiz.profile-original-render.v1" as const;

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("PROFILE_ORIGINAL_ROUTE_PROJECTION_INVALID");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (!record(value)) {
    throw new TypeError("PROFILE_ORIGINAL_ROUTE_PROJECTION_INVALID");
  }
  return `{${Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}

/**
 * Route projection is deterministic display/index material beneath the sealed
 * Original. Keeping it as canonical JSON text prevents decimal display values
 * from entering the integer-only proof authority encoder.
 */
export function encodeProfileOriginalRouteProjection(
  projection: Readonly<Record<string, unknown>>,
): string {
  const encoded = canonicalJson(projection);
  const decoded = JSON.parse(encoded) as unknown;
  if (
    !record(decoded)
    || typeof decoded.id !== "string"
    || typeof decoded.slug !== "string"
    || typeof decoded.code !== "string"
  ) {
    throw new TypeError("PROFILE_ORIGINAL_ROUTE_PROJECTION_INVALID");
  }
  return encoded;
}

export function decodeProfileOriginalRouteProjectionAppend(
  append: unknown,
  renderedArtifactSha256: string,
): Record<string, unknown> | null {
  if (
    !record(append)
    || append.type !== PROFILE_ORIGINAL_RENDER_APPEND_TYPE
    || append.renderedArtifactSha256 !== renderedArtifactSha256
  ) return null;

  // Historical children carried the projection object directly. They remain
  // readable; new children carry canonical JSON so display decimals never
  // become proof-authority numbers.
  const bindSealedRecordMediaHash = (
    projection: Record<string, unknown>,
  ): Record<string, unknown> => {
    if (
      projection.media === null
      // Imported Originals retain their own sealed source projection. The
      // rendered bytes here encode a placement reference, not Original media.
      && !record(projection.importedSource)
      && typeof projection.recordMediaSha256Hex !== "string"
    ) {
      return {
        ...projection,
        recordMediaSha256Hex: renderedArtifactSha256,
      };
    }
    return projection;
  };

  if (record(append.projection)) {
    return bindSealedRecordMediaHash(append.projection);
  }
  if (typeof append.projectionJson !== "string") return null;
  try {
    const projection = JSON.parse(append.projectionJson) as unknown;
    if (!record(projection)) return null;
    if (encodeProfileOriginalRouteProjection(projection) !== append.projectionJson) {
      return null;
    }
    return bindSealedRecordMediaHash(projection);
  } catch {
    return null;
  }
}
