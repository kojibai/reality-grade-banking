import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeIntrinsicUnsigned, SIGIL_VALUATION_POLICY_CHECKSUM, type SigilMetadataLite } from '@receiz/sdk/valuation';
import { calculateIllustration, canonicalInteger, DEMO_SCENARIO, formatPhiMicro, formatUsdCents, illustrationRecord, parseEvaluationCoordinates, sampleIllustration } from '../src/value-explainer/model';
import { createDisplayBasis, inspectHeldProof, inspectReplayFile, quoteDisplayUsd } from '../src/value-explainer/proof';

afterEach(() => vi.unstubAllGlobals());

describe('v129 value explainer arithmetic and source boundary', () => {
  it('discounts the entered per-object payments through the installed SDK and retains them in the exported trace',()=>{
    const cashflows=[{atPulse:'1000000',amountPhi:'3.5'},{atPulse:'1034982',amountPhi:'20'}];
    const scenario={...DEMO_SCENARIO,evaluationPulse:'1017491',cashflows};
    const result=calculateIllustration(scenario);
    const expected=3.5+20/(1+17491/17491.270421);
    expect(result.metadata.ip?.expectedCashflowPhi).toEqual([{atPulse:1000000,amountPhi:3.5},{atPulse:1034982,amountPhi:20}]);
    expect(result.unsigned.inputs.pv_phi).toBeCloseTo(expected,12);
    expect(result.calculation.find(term=>term.id==='ip.phi.1.presentValue')?.operands).toEqual({amount:'20',discount:String(1/(1+17491/17491.270421))});
    const record=illustrationRecord(scenario);
    expect(record.scenario.cashflows).toEqual(cashflows);
    expect(record.authority).toBe('illustrative-metadata-only');
    expect(record.writesPerformed).toBe(0);
    const samples=sampleIllustration(scenario);
    expect(samples.samples[0].valuePhi).toBe(calculateIllustration({...scenario,evaluationPulse:scenario.originPulse}).unsigned.valuePhi);
    expect(samples.samples.at(-1)!.valuePhi).toBe(result.unsigned.valuePhi);
    expect(calculateIllustration({...scenario,evaluationPulse:'1034982'}).unsigned.inputs.pv_phi).toBe(23.5);
    expect(calculateIllustration({...scenario,cashflows:[]}).unsigned.inputs.pv_phi).toBe(0);
  });

  it('rejects malformed payments before accepting a cashflow illustration',()=>{
    for(const amountPhi of ['', '-1','0','01','1e3','NaN','Infinity','1.0000001','9007199254.740992']){
      expect(()=>calculateIllustration({...DEMO_SCENARIO,cashflows:[{atPulse:'1017491',amountPhi}]}),amountPhi).toThrow('Cashflow 1 amount');
    }
    for(const atPulse of ['01','1.2','9007199254740992','999999']){
      expect(()=>calculateIllustration({...DEMO_SCENARIO,cashflows:[{atPulse,amountPhi:'1'}]}),atPulse).toThrow('Cashflow 1');
    }
    expect(()=>calculateIllustration({...DEMO_SCENARIO,cashflows:Array.from({length:65},()=>({atPulse:'1017491',amountPhi:'1'}))})).toThrow('64');
    expect(calculateIllustration({...DEMO_SCENARIO,cashflows:[{atPulse:'1017491',amountPhi:'0.000001'}]}).unsigned.inputs.pv_phi).toBe(.000001);
  });

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
  it('values an actual verified original at the captured upload coordinate with a reproducible dollar basis',async()=>{
    const file=new File([readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url))],'public-original.png',{type:'image/png'});
    const result=await inspectHeldProof({file,evaluationKaiUPulse:'14710100000123',additionalCoordinates:'',portableHistory:false,deterministicUsd:true});
    expect(result.projection.status).toBe('available');if(result.projection.status!=='available')return;
    expect(result.projection.valuationKaiUPulse).toBe('14710100000123');expect(result.projection.displayUsdCents).toMatch(/^\d+$/);
    expect(result.projection.priceBasisDigest).toMatch(/^[a-f0-9]{64}$/);expect(result.replayVerification?.status).toBe('verified-replay');
    const basis=result.projection.inputs.usdBasis as {usdPerPhiMicrocents:string;priceBasis:{purpose:string;valuationKaiUPulse:string}};
    expect(basis.priceBasis).toMatchObject({purpose:'deterministic-intrinsic-display',valuationKaiUPulse:'14710100000123'});
    expect(result.projection.displayUsdCents).toBe(quoteDisplayUsd(result.projection.proofValuePhiMicro,basis.usdPerPhiMicrocents));
    expect(result.projection.writesPerformed).toBe(0);
  });
});
