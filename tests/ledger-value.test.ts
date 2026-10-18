import { expect, it } from 'vitest';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import { ledgerValueForRecord } from '../src/receiz/ledger-value';
import { projectPersonalHistory } from '../src/receiz/personal-history';
import { readFileSync } from 'node:fs';
import { parseMarketCapSource } from '../src/receiz/market-projection/source';
import { indexLedgerValues } from '../src/receiz/ledger-value';

it('does not relabel a public transfer payment as the card value or invent a missing value', () => {
  const rows = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'paid', actionKind: 'receiz.sports_arena.card_transfer', pulse: 120, amountUsdCents: '2500' }, { id: 'missing', actionKind: 'receiz.sports_arena.card_transfer', pulse: 121 }] }).records;
  expect(ledgerValueForRecord(rows.find(row => row.sourceId === 'paid')!)).toMatchObject({ basis: 'payment', amountUsdCents: '2500' });
  expect(ledgerValueForRecord(rows.find(row => row.sourceId === 'missing')!)).toMatchObject({ basis: 'unavailable', amountUsdCents: null });
});
it('shows the exact carried card snapshot with separate consideration and refuses legacy zero fallback', () => {
  const rows = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'card', kind: 'sports_card_transfer', pulse: 120, amountUsdCents: '98765', considerationUsdCents: '100', valueReceipt: { phiUsdCents: '98765', fundingRule: 'sports_card_transfer_card_value_snapshot' } }, { id: 'legacy', kind: 'sports_card_transfer', pulse: 121, amountUsdCents: '0', valueReceipt: { phiUsdCents: '0', fundingRule: 'sports_card_transfer_card_value_snapshot' } }] }).records;
  expect(ledgerValueForRecord(rows.find(row => row.sourceId === 'card')!)).toEqual({ basis: 'card-snapshot', amountUsdCents: '98765', pulse: '120', considerationUsdCents: '100' });
  expect(ledgerValueForRecord(rows.find(row => row.sourceId === 'legacy')!)).toMatchObject({ basis: 'unavailable', amountUsdCents: null });
});
it('preserves a carried action card snapshot through the admitted personal history projection', () => {
  const projection = { authority: 'verified-identity-portable-state', portableStateVerified: true, owner: { uid: 'owner' }, verifiedState: { account: { userId: 'owner' }, wallet: { chatTransfers: [{ id: 'carried', sender_user_id: 'owner', recipient_user_id: 'friend', kai_pulse: '120', amount_usd_cents: '100', transferValueUsdCents: '9900' }] } } };
  const row = projectPersonalHistory(projection as never, 'owner').records[0];
  expect(ledgerValueForRecord(row)).toMatchObject({ basis: 'card-snapshot', amountUsdCents: '9900', considerationUsdCents: '100' });
});
it('retains a graph source quote without treating its current sort coordinate as an event coordinate', () => {
  const record = parsePublicNetworkPage('graph', { ok: true, ledgerRows: [{ id: 'market-asset-proof', ledgerKind: 'market-asset', label: 'Proof', sortKaiPulse: 500, pulse: 'Rate $12 / Phi', marketAssetChart: { live: 2.5, usdPerPhi: 12 } }] }).records[0];
  expect(record.pulse).toBeNull();
  expect(ledgerValueForRecord(record)).toMatchObject({ basis: 'source-value', amountUsdCents: '3000', pulse: '500' });
});
it('refuses a card snapshot when the carried pulse and micro-pulse disagree', () => {
  const record = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'mismatch', kind: 'sports_card_transfer', pulse: 120, kaiUpulse: '121000000', cardValueUsdCents: '9900' }] }).records[0];
  expect(ledgerValueForRecord(record)).toMatchObject({ basis: 'unavailable', amountUsdCents: null });
});
it('refuses to use a current sports quote as an historical transfer value', () => {
  const source = parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
  const card = source.valueRows.find(row => row.source === 'sports-economy-card')!;
  const record = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'old-card', kind: 'sports_card_transfer', pulse: 12000000, claimHash: card.seed, collectibleId: card.id }] }).records[0];
  expect(ledgerValueForRecord(record, indexLedgerValues(source))).toMatchObject({ basis: 'unavailable', amountUsdCents: null });
});
it('replays canonical v129 sigil operands at the proof quote and exact transfer pulse', () => {
  const source = parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json', import.meta.url), 'utf8')));
  const index = indexLedgerValues(source), item = source.valueRows[0].marketItem!;
  const proof = parsePublicNetworkPage('proofs', { ok: true, transport: { publicOriginals: [{ id: item.id, receizId: source.valueRows[0].seed, title: 'Public proof', pulse: '11131738', valueUsd: 12077.03 }] } }).records[0];
  const value = ledgerValueForRecord(proof, index);
  // Golden values independently replayed with the unchanged v129 Receiz host valuation + issuance modules.
  expect(value).toMatchObject({ basis: 'intrinsic-model', amountUsdCents: '1477588', pulse: '14647306', comparison: { pulse: '14647305', amountUsdCents: '1492982' } });
  expect(value.comparison!.percent).toBeCloseTo(-1.031092, 5);
  const transfer = parsePublicNetworkPage('actions', { ok: true, actions: [{ id: 'transfer', actionKind: 'proof_transfer', pulse: 12000000, assetId: source.valueRows[0].seed, amountUsdCents: '100' }] }).records[0];
  expect(ledgerValueForRecord(transfer, index)).toEqual({ basis: 'intrinsic-model', amountUsdCents: '1160227', pulse: '12000000', considerationUsdCents: '100' });
});
it('matches the canonical host dollar rounding without quantizing Phi before its dollar display',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8')));
 const row=source.valueRows.find(value=>value.id==='market:profile:nubiel:afd3d835-4765-40a7-b2c9-f0b38ee29e4b')!;
 expect(row).toBeDefined();
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'rounding-boundary',actionKind:'proof_transfer',pulse:14647212,assetId:row.seed}]}).records[0];
 expect(ledgerValueForRecord(record,indexLedgerValues(source))).toMatchObject({basis:'intrinsic-model',amountUsdCents:'1605028',pulse:'14647212'});
});
it('refuses contradictory recognized proof identifiers rather than valuing the first match',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8'))),index=indexLedgerValues(source);
 const first=source.valueRows.find(value=>value.id==='market:profile:nubiel:afd3d835-4765-40a7-b2c9-f0b38ee29e4b')!,other=source.valueRows.find(value=>value.seed==='c676e337-0343-4793-bc75-f77bfead2a0a')!;
 expect(other).toBeDefined();
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'conflict',actionKind:'proof_transfer',pulse:14647306,marketItemId:first.marketItem!.id,assetId:other.seed}]}).records[0];
 expect(ledgerValueForRecord(record,index)).toMatchObject({basis:'unavailable',amountUsdCents:null});
 const ambiguous={...index,rows:new Map(index.rows)};ambiguous.rows.set(first.marketItem!.id,null);
 expect(ledgerValueForRecord(record,ambiguous)).toMatchObject({basis:'unavailable',amountUsdCents:null});
});
