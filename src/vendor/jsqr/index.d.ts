export default function decode(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts: 'attemptBoth' | 'dontInvert' }): { data: string; binaryData: number[] } | null;
