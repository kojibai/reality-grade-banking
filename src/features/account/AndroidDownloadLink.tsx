import { useEffect, useState } from 'react';
import { androidDownloadPath, androidReleaseManifestPath, parseAndroidRelease, type AndroidRelease } from '../../content/android-download.mjs';

/** Installation is optional. Android users can follow the guide even before a release is available. */
export function AndroidDownloadLink({ className }: {className?:string}) {
  const android = typeof navigator !== 'undefined' && /\bAndroid\b/iu.test(navigator.userAgent);
  const [release, setRelease] = useState<AndroidRelease | null>(null);
  useEffect(() => {
    if (!android) return;
    const controller = new AbortController();
    void fetch(androidReleaseManifestPath, { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const version = parseAndroidRelease(await response.json());
      if (version && !controller.signal.aborted) setRelease(version);
    }).catch(() => {});
    return () => controller.abort();
  }, [android]);
  if (!android) return null;
  return release
    ? <a className={className} href={release.apkPath} download>Download Bankeiz for Android</a>
    : <a className={className} href={androidDownloadPath}>Bankeiz for Android</a>;
}
