import type { AndroidRelease } from '../src/content/android-download.mjs';
export const androidDownloadPage: Readonly<{
  slug: string; path: string; title: string; description: string; sections: readonly unknown[];
}>;
export function readPublicAndroidRelease(directory?: string): Promise<AndroidRelease | null>;
export function androidDownloadContent(release: AndroidRelease | null): string;
