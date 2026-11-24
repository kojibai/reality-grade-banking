export const androidDownloadPath: '/android/';
export const androidReleaseManifestPath: '/downloads/android-release.json';
export type AndroidRelease = Readonly<{version:string;apkPath:string;sha256:string;bytes:number}>;
export function parseAndroidRelease(value:unknown):AndroidRelease|null;
