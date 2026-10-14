import { parseAmount } from '../core/money';
export interface AssetDefinition { name: string; symbol: string; units: string; description: string; linkedProofDigest: string | null; }
export function validateAssetDefinition(input: AssetDefinition): AssetDefinition {
  const name = input.name.trim(), symbol = input.symbol.trim().toUpperCase(), description = input.description.trim();
  if (!name || name.length > 80) throw new Error('Give your asset a name, up to 80 characters.');
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(symbol)) throw new Error('Choose a short code of 2–8 letters or numbers, starting with a letter.');
  if (BigInt(parseAmount(input.units)) <= 0n) throw new Error('Enter units greater than zero.');
  if (description.length > 2000) throw new Error('Keep the description within 2,000 characters.');
  if (input.linkedProofDigest !== null && !/^[a-f0-9]{64}$/.test(input.linkedProofDigest)) throw new Error('Choose an original proof held by this account.');
  return { name, symbol, units: input.units.trim(), description, linkedProofDigest: input.linkedProofDigest };
}
