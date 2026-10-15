const PHI_MICRO_SCALE = 1_000_000n;

function decimalFromScaled(value: bigint, scale: bigint, decimals: number): string {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const integer = absolute / scale;
  const fraction = (absolute % scale).toString().padStart(decimals, "0");
  return `${sign}${integer.toString()}.${fraction}`;
}

export function formatPhiFromMicroClient(phiMicro: bigint): string {
  return decimalFromScaled(phiMicro, PHI_MICRO_SCALE, 6).replace(/\.?0+$/, "");
}

export function formatUsdFromCentsClient(usdCents: bigint): string {
  return decimalFromScaled(usdCents, 100n, 2);
}
