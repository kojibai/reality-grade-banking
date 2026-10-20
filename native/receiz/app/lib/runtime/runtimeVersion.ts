export function normalizeRuntimeVersionSegment(value: string | undefined): string {
  const normalized = (value || "").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "");
  return normalized.slice(0, 64);
}

export function composeRuntimeVersion(appVersion: string, buildFingerprint: string): string {
  const normalizedAppVersion = normalizeRuntimeVersionSegment(appVersion) || appVersion.trim();
  const normalizedBuildFingerprint = normalizeRuntimeVersionSegment(buildFingerprint);
  return normalizedBuildFingerprint ? `${normalizedAppVersion}.${normalizedBuildFingerprint}` : normalizedAppVersion;
}
