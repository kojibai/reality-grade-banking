export const androidDownloadPath = '/android/';
export const androidReleaseManifestPath = '/downloads/android-release.json';

export function parseAndroidRelease(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { schema, version, apkPath, sha256, bytes } = value;
  if (schema !== 'bankeiz.android-release.v1' || typeof version !== 'string' || !/^\d+\.\d+\.\d+$/u.test(version)
    || apkPath !== `/downloads/Bankeiz-${version}.apk`
    || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(sha256)
    || !Number.isSafeInteger(bytes) || bytes <= 0) return null;
  return { version, apkPath, sha256, bytes };
}
