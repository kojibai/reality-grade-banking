let sdkPromise: Promise<typeof import('@receiz/sdk')> | undefined;
export function loadReceiz() { return sdkPromise ??= import('@receiz/sdk'); }
export const RECEIZ_VERSION = '129.0.0';
export async function publicClient() { const { createReceizClient } = await loadReceiz(); return createReceizClient({ baseUrl: 'https://receiz.com' }); }
