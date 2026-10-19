import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { ledgerValueForRecord } from '../src/receiz/ledger-value';
import { parsePublicNetworkCache } from '../src/receiz/public-network-cache';

it('ships the exact recorded card values and carried transfer coordinates without substituting consideration', () => {
  const bytes = gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin'));
  expect(bytes.length).toBeLessThanOrEqual(32 * 1024 * 1024);
  const cache = parsePublicNetworkCache(JSON.parse(bytes.toString('utf8')));
  expect(cache.inspectionVersion).toBe(2);
  const transfers = cache.records.filter(row => row.source === 'actions' && row.kind === 'receiz.sports_arena.card_transfer');
  expect(transfers).toHaveLength(193);
  const valued = transfers.filter(row => row.valueOperands?.cardValueUsdCents !== undefined);
  expect(valued).toHaveLength(41);
  for (const row of valued) {
    expect(row.evidence.entryHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.valueOperands?.collectibleId).toBe(row.evidence.objectId);
    expect(row.valueOperands?.claimHash).toBe(row.evidence.claimHash);
    expect(ledgerValueForRecord(row)).toMatchObject({
      basis: 'card-snapshot', amountUsdCents: row.valueOperands!.cardValueUsdCents, pulse: row.pulse,
    });
  }
  const example = valued.find(row => row.sourceId === '1a4bae9c-53a4-4bd4-ae30-4b80f2999931')!;
  expect(example.evidence.entryHash).toBe('a9782a1b52188c5a5351273df0135a9fce03b016c72465463713cc60de6722aa');
  expect(ledgerValueForRecord(example)).toMatchObject({ amountUsdCents: '1951', pulse: '14022229' });
  const carried = cache.records.filter(row => row.source === 'graph' && row.kind === 'card-transfer');
  expect(carried).toHaveLength(59);
  for (const row of carried) {
    expect(row.valueOperands?.collectibleId).toBeTruthy();
    expect(row.valueOperands?.claimHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.pulse).toMatch(/^\d+$/);
    expect(row.time).toBeTruthy();
    if (row.kaiUpulse) expect(row.pulse).toBe(String(BigInt(row.kaiUpulse) / 1_000_000n));
    expect(ledgerValueForRecord(row)).toMatchObject({ basis: 'unavailable', amountUsdCents: null });
  }
});
