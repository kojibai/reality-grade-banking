export const SCALE = 1_000_000n;
export const MAX_AMOUNT = 10n ** 24n;
export function parseAmount(value: string): string {
  const input = value.trim();
  if (!/^\d{1,18}(\.\d{1,6})?$/.test(input)) throw new Error('Enter a valid amount with up to 6 decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const amount = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (amount > MAX_AMOUNT) throw new Error('Amount is too large.');
  return amount.toString();
}
export function exactAmount(value: string, positive = false): bigint {
  if (!/^(0|[1-9]\d{0,24})$/.test(value)) throw new Error('Invalid exact amount.');
  const amount = BigInt(value);
  if (amount > MAX_AMOUNT) throw new Error('Amount exceeds the supported limit.');
  if (positive && amount === 0n) throw new Error('Enter an amount greater than zero.');
  return amount;
}
export function formatUnits(value: string, decimals = 6): string {
  const amount = BigInt(value), fraction = (amount % SCALE).toString().padStart(6, '0').slice(0, decimals).replace(/0+$/, '');
  return `${amount / SCALE}${fraction ? `.${fraction}` : ''}`;
}
export function formatMoney(cents: string): string {
  const value = BigInt(cents), absolute = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}$${new Intl.NumberFormat('en-US').format(absolute / 100n)}.${(absolute % 100n).toString().padStart(2, '0')}`;
}
export function demoUsdCents(amountPhiMicro: string): string { return ((BigInt(amountPhiMicro) + 5_000n) / 10_000n).toString(); }
export function operationId(prefix: string): string { return `${prefix}-${crypto.randomUUID()}`; }
