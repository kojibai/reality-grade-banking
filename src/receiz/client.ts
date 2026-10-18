import bankPackage from '../../package.json';
let sdkPromise: Promise<typeof import('@receiz/sdk')> | undefined;
export function loadReceiz() { return sdkPromise ??= import('@receiz/sdk'); }
export const RECEIZ_VERSION = bankPackage.dependencies['@receiz/sdk'];
export async function publicClient() { const { createReceizClient } = await loadReceiz(); return createReceizClient({ baseUrl: 'https://receiz.com', fetchImpl: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(10000) }) }); }
