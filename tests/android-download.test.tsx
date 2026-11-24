// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AndroidDownloadLink } from '../src/features/account/AndroidDownloadLink';
import { androidDownloadContent } from '../scripts/android-download-page.mjs';
import { publicPage } from '../scripts/public-page-metadata.mjs';
import { parseAndroidRelease } from '../src/content/android-download.mjs';

const release = {
  schema: 'bankeiz.android-release.v1', version: '8.0.0',
  apkPath: '/downloads/Bankeiz-8.0.0.apk', sha256: 'a'.repeat(64), bytes: 3_500_000,
};

let root: Root | undefined;
const element = document.createElement('div');
async function show() {
  document.body.append(element);
  root = createRoot(element);
  await act(async () => root!.render(<AndroidDownloadLink/>));
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  element.remove();
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it('offers the direct approved APK on Android and preserves the page as the fallback', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
  let reply!: (value: Response) => void;
  const response = new Promise<Response>(resolve => { reply = resolve; });
  vi.stubGlobal('fetch', vi.fn(() => response));
  await show();
  expect(element.querySelector('a')?.getAttribute('href')).toBe('/android/');
  await act(async () => reply(Response.json(release)));
  const link = element.querySelector('a')!;
  expect(link.getAttribute('href')).toBe(release.apkPath);
  expect(link.hasAttribute('download')).toBe(true);
});

it('keeps the APK prompt out of device guidance on other platforms', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await show();
  expect(element.querySelector('a')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it('publishes a canonical Android page and only links the signed release descriptor', () => {
  const verified = parseAndroidRelease(release);
  expect(publicPage('/android/')?.noindex).toBeUndefined();
  expect(androidDownloadContent(verified)).toContain('href="/downloads/Bankeiz-8.0.0.apk" download');
  expect(androidDownloadContent(null)).not.toContain('.apk"');
  expect(parseAndroidRelease({...release, apkPath: 'https://example.com/Bankeiz.apk'})).toBeNull();
});
