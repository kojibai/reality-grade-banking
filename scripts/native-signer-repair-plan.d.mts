export const NATIVE_SIGNER_CONTEXTS: readonly string[];
export interface NativeSignerKeyEntry extends Record<string, unknown> { kid?: string; alg?: string; privateKeyPkcs8B64u?: string; status?: string; }
export function prepareNativeSignerRepair(input: { sourcePrivateKey: string; expectedPublicKey: string; rootKid: string; keyring: NativeSignerKeyEntry[]; contexts: string[] }): { keyring: NativeSignerKeyEntry[]; contexts: string[] };
