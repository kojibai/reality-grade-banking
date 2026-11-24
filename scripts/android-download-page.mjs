import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { androidDownloadPath, androidReleaseManifestPath, parseAndroidRelease } from '../src/content/android-download.mjs';
import { learnHeader } from './learn-template.mjs';
import { siteFooterHtml } from './site-footer.mjs';

export const androidDownloadPage = {
  slug: 'android', path: androidDownloadPath,
  title: 'Download Bankeiz for Android',
  description: 'Get the official Bankeiz Android APK directly from Bankeiz. Learn how to install it and check whether your phone supports Offline Cash.',
  sections: [],
};

export async function readPublicAndroidRelease(directory = 'public') {
  let manifest;
  try { manifest = await readFile(resolve(directory, '.' + androidReleaseManifestPath), 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  const release = parseAndroidRelease(JSON.parse(manifest));
  if (!release) throw Error('ANDROID_RELEASE_MANIFEST_INVALID');
  const apk = await readFile(resolve(directory, '.' + release.apkPath));
  if (apk.byteLength !== release.bytes || createHash('sha256').update(apk).digest('hex') !== release.sha256)
    throw Error('ANDROID_RELEASE_APK_MISMATCH');
  return release;
}

export function androidDownloadContent(release) {
  const action = release
    ? `<div class="hero-actions"><a class="learn-button button-cobalt" href="${release.apkPath}" download>Download APK</a></div><p>Version ${release.version} · ${(release.bytes / (1024 * 1024)).toFixed(1)} MB</p>`
    : '<p>Direct downloads will be available here when the Android release is ready.</p>';
  const install = release ? `<section id="install"><h2>Install Bankeiz</h2>
    <ol><li>Download and open the APK on your Android phone.</li><li>If Android asks, allow your browser to install this app, then finish installation.</li><li>Open Bankeiz and sign in with your existing Receiz ID. To check your phone, open your balance and choose Offline Cash.</li></ol>
    <details class="learning-depth"><summary>Download checksum</summary><p>SHA-256 <code style="overflow-wrap:anywhere">${release.sha256}</code></p></details></section>` : '';
  return `${learnHeader()}<main id="main" class="learn-shell article-main">
    <header class="article-heading" id="download"><h1>${androidDownloadPage.title}</h1>
    <p>Install the official Android app directly from Bankeiz.</p>${action}</header>
    <div class="article-layout"><aside class="article-toc"><nav aria-label="On this page"><span>On this page</span>
    ${release ? '<a href="#install">Install Bankeiz</a>' : ''}<a href="#offline-cash">Offline Cash on Android</a>
    <a href="#nearby">Pay nearby with your balance</a></nav></aside>
    <article class="article-content">${install}
    <section id="offline-cash"><h2>Offline Cash on Android</h2>
    <p>On supported phones, Bankeiz can use built-in secure hardware for Offline Cash. Your phone checks for that capability during setup. Offline Cash can be sent to another compatible device and spent again while both people are offline.</p></section>
    <section id="nearby"><h2>Pay nearby with your balance</h2>
    <p>You can also share a nearby payment from your regular balance. The recipient can save the payment offline and connect when they’re ready to spend it.</p>
    <p><a href="/learn/offline-banking/">Read the offline banking guide</a></p>
    <p><a href="/conformance/#device-evidence">Check browser and device support</a></p></section>
    </article></div></main>${siteFooterHtml(androidDownloadPath)}`;
}
