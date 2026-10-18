import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeIntrinsicUnsigned, SIGIL_VALUATION_POLICY_CHECKSUM, type SigilMetadataLite } from '@receiz/sdk/valuation';
import { calculateIllustration, canonicalInteger, DEMO_SCENARIO, formatPhiMicro, formatUsdCents, parseEvaluationCoordinates, sampleIllustration } from '../src/value-explainer/model';
import { createDisplayBasis, inspectHeldProof, inspectReplayFile, quoteDisplayUsd } from '../src/value-explainer/proof';

afterEach(() => vi.unstubAllGlobals());

describe('v129 value explainer arithmetic and source boundary', () => {
  it('preserves all published pre-v129 numeric fixtures and their exact serialization', () => {
    const fixture = JSON.parse(readFileSync(new URL('../node_modules/@receiz/sdk/fixtures/sigil-valuation-v129.json', import.meta.url), 'utf8')) as { fixtures: { id: string; meta: SigilMetadataLite; nowPulse: number; unsigned: unknown; stampPayload: string }[] };
    expect(SIGIL_VALUATION_POLICY_CHECKSUM).toBe('b05b2049');
    for (const sample of fixture.fixtures) {
      const result = computeIntrinsicUnsigned(sample.meta, sample.nowPulse);
      expect(result.unsigned, sample.id).toEqual(sample.unsigned);
      expect(result.stampPayload, sample.id).toBe(sample.stampPayload);
      expect(result.calculation.length).toBeGreaterThan(40);
      expect(result.calculation.every(term => term.sourceReferences.length && typeof term.result === 'string')).toBe(true);
    }
  });

  it('retains one fixed origin across samples and never reads a clock or network', () => {
    vi.stubGlobal('fetch', () => { throw Error('NETWORK_FORBIDDEN'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('CLOCK_FORBIDDEN'); });
    try {
      const interval = sampleIllustration(DEMO_SCENARIO);
      expect(interval.kind).toBe('recomputed-model-samples');
      expect(interval.samples).toHaveLength(65);
      expect(interval.samples[0].pulse).toBe(DEMO_SCENARIO.originPulse);
      expect(interval.samples.at(-1)!.pulse).toBe(DEMO_SCENARIO.evaluationPulse);
      for (const sample of [...interval.samples].reverse()) {
        const result = calculateIllustration({ ...DEMO_SCENARIO, evaluationPulse: sample.pulse });
        expect(result.metadata.kaiPulse).toBe(1_000_000);
        expect(result.unsigned.valuePhi).toBe(sample.valuePhi);
        expect(result.unsigned.inputs.rarityFloor).toBe(sample.floorPhi);
      }
    } finally { vi.restoreAllMocks(); }
  });

  it('does not silently replace invalid or missing coordinates with evaluation time', () => {
    for (const originPulse of ['', '01', '-1', '1.5', '9007199254740992']) expect(() => calculateIllustration({ ...DEMO_SCENARIO, originPulse })).toThrow();
    expect(() => calculateIllustration({ ...DEMO_SCENARIO, evaluationPulse: '999999' })).toThrow('at or after');
    expect(() => calculateIllustration({ ...DEMO_SCENARIO, seriesSize: '0' })).toThrow('at least 1');
    expect(() => parseEvaluationCoordinates('01', '')).toThrow('canonical');
    expect(() => parseEvaluationCoordinates('1', Array(256).fill('2').join(','))).toThrow('256');
    expect(parseEvaluationCoordinates('14003988000001', '14003988000002, 14003988000001')).toEqual(['14003988000001', '14003988000002']);
  });

  it('rounds dollars with the SDK integer rule even beyond the safe Number range', () => {
    expect(quoteDisplayUsd('1', '499999999999')).toBe('0');
    expect(quoteDisplayUsd('1', '500000000000')).toBe('1');
    expect(quoteDisplayUsd('1', '500000000001')).toBe('1');
    expect(quoteDisplayUsd('1500000', '1000000000')).toBe('1500');
    expect(quoteDisplayUsd('9007199254740993', '1000000000000')).toBe('9007199254740993');
    expect(quoteDisplayUsd('0', '1000000000')).toBe('0');
    expect(() => quoteDisplayUsd('1', '0')).toThrow('positive');
    expect(() => canonicalInteger('001', 'Amount')).toThrow('canonical');
    expect(formatUsdCents('9007199254740993')).toBe('$90,071,992,547,409.93');
    expect(formatPhiMicro('9007199254740993')).toBe('9,007,199,254.740993');
  });

  it('pins the educational dollar basis and changes its digest with its exact rate', async () => {
    const first = await createDisplayBasis('1000000000');
    const second = await createDisplayBasis('1000000001');
    expect(first.algorithm).toBe('receiz.display-usd.v122');
    expect(first.priceBasisDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(first.priceBasisDigest).not.toBe(second.priceBasisDigest);
    expect(await createDisplayBasis('1000000000')).toEqual(first);
  });

  it('rejects detached JSON as a replay through the real SDK verifier', async () => {
    const file = new File(['{"schema":"receiz.proof-value-replay.v129"}'], 'detached.json', { type: 'application/json' });
    const result = await inspectReplayFile(file);
    expect(result.status).toBe('invalid-replay');
    expect(result.writesPerformed).toBe(0);
    if (result.status === 'invalid-replay') expect(result.code).toBeTruthy();
  });

  it('rejects an unsealed file without manufacturing a proof-bound value', async () => {
    const file = new File(['{"sigilMetadata":{"pulse":1000000}}'], 'unsealed.json', { type: 'application/json' });
    await expect(inspectHeldProof({ file, evaluationKaiUPulse: '14003988000001', additionalCoordinates: '', portableHistory: false })).rejects.toThrow('Proof rejected:');
  });
});
