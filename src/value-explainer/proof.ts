import { createReceizArtifactAdmissionEngine, digestReceizCanonicalV122, quoteReceizDisplayUsdV122, verifyReceizArtifact } from '@receiz/sdk';
import {
  exportReceizProofValueReplayV129,
  projectReceizProofValueV129,
  sampleReceizProofValueV129,
  verifyReceizProofValueReplayV129,
  type ReceizProofValueSourceV129,
  type ReceizProofValueUsdBasisV129,
} from '@receiz/sdk/valuation';
import { canonicalInteger, MAX_INPUT_BYTES, parseEvaluationCoordinates, VALUE_POLICY } from './model';
import {computeIntrinsicUnsigned,type ReceizProofValueProjectionV129,type SigilMetadataLite}from'@receiz/sdk/valuation';
import {DEFAULT_ISSUANCE_POLICY,quotePhiForUsd}from'../receiz/canonical-market-issuance';

/** A local deterministic display quote bound to this exact admitted projection.
 * It is neither a completed sale nor authority to redeem or spend the object. */
export async function createDeterministicDisplayBasis(projection:ReceizProofValueProjectionV129):Promise<ReceizProofValueUsdBasisV129>{
 const pulse=Number(projection.valuationKaiPulse),metadata=projection.inputs.metadata as SigilMetadataLite;
 if(!Number.isSafeInteger(pulse)||pulse<0||!metadata)throw Error('The original does not carry a supported valuation basis.');
 const computed=computeIntrinsicUnsigned(metadata,pulse);
 if(String(Math.round(computed.unsigned.valuePhi*1e6))!==projection.proofValuePhiMicro)throw Error('The proof value does not match its admitted inputs.');
 const quoteInputs={usd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0};
 const quote=quotePhiForUsd({...quoteInputs,meta:metadata,nowPulse:pulse},DEFAULT_ISSUANCE_POLICY,computed),fixed=quote.usdPerPhi.toFixed(8);
 if(!/^\d+\.\d{8}$/.test(fixed)||!Number.isFinite(quote.usdPerPhi)||quote.usdPerPhi<=0)throw Error('The deterministic dollar basis is unavailable.');
 const rate=BigInt(fixed.replace('.','')).toString();canonicalInteger(rate,'Display rate',true);
 const priceBasis={algorithm:'receiz.display-usd.v122' as const,version:'1' as const,usdPerPhiMicrocents:rate,purpose:'deterministic-intrinsic-display',valuationKaiUPulse:projection.valuationKaiUPulse,proofDigest:projection.proofDigest,valuationPolicy:VALUE_POLICY,issuancePolicy:DEFAULT_ISSUANCE_POLICY,quoteInputs};
 return {algorithm:priceBasis.algorithm,version:priceBasis.version,usdPerPhiMicrocents:rate,priceBasis,priceBasisDigest:await digestReceizCanonicalV122(priceBasis)};
}

/** An explicitly selected educational rate. The digest binds it, not a market. */
export async function createDisplayBasis(rate: string): Promise<ReceizProofValueUsdBasisV129> {
  canonicalInteger(rate, 'Display rate', true);
  const priceBasis = Object.freeze({ algorithm: 'receiz.display-usd.v122' as const, version: '1' as const, usdPerPhiMicrocents: rate, purpose: 'user-selected-educational-display' });
  return { algorithm: priceBasis.algorithm, version: priceBasis.version, usdPerPhiMicrocents: rate, priceBasis, priceBasisDigest: await digestReceizCanonicalV122(priceBasis) };
}

export function quoteDisplayUsd(phiMicro: string, rate: string): string {
  canonicalInteger(phiMicro, 'Phi micro-units');
  canonicalInteger(rate, 'Display rate', true);
  return phiMicro === '0' ? '0' : quoteReceizDisplayUsdV122(phiMicro, rate);
}

export async function inspectHeldProof(input: Readonly<{ file: File; evaluationKaiUPulse: string; additionalCoordinates: string; portableHistory: boolean; usdPerPhiMicrocents?: string; deterministicUsd?:boolean }>) {
  if (input.file.size > MAX_INPUT_BYTES) throw new Error('Public proof exceeds the 64 MiB reader limit.');
  const coordinates = parseEvaluationCoordinates(input.evaluationKaiUPulse, input.additionalCoordinates);
  const verification = await verifyReceizArtifact(input.file);
  if (verification.status !== 'verified-artifact') {
    const detail = verification.status === 'denied' ? verification.code : verification.status === 'unsupported' ? verification.reason : verification.errors.map(error => error.code).join(', ');
    throw new Error(`Proof rejected: ${verification.status}${detail ? ` · ${detail}` : ''}`);
  }
  let source: ReceizProofValueSourceV129 = verification;
  if (input.portableHistory) {
    const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: 'portable-state' });
    if (admission.profile !== 'portable-state' || (admission.verdict !== 'bearer-recovery' && admission.verdict !== 'foreign-owner')) throw new Error('Portable history was not admitted.');
    source = admission;
  }
  if(input.deterministicUsd&&input.usdPerPhiMicrocents)throw Error('Choose one dollar display basis.');
  let basis = {
    source,
    expectedProofDigest: verification.artifactDigest.value,
    policy: VALUE_POLICY,
    ...(input.usdPerPhiMicrocents ? { usdBasis: await createDisplayBasis(input.usdPerPhiMicrocents) } : {}),
  };
  let projection = await projectReceizProofValueV129({ ...basis, valuationKaiUPulse: input.evaluationKaiUPulse });
  if (projection.status === 'unavailable') return { projection, chart: null, replay: null, replayVerification: null };
  if(input.deterministicUsd){basis={...basis,usdBasis:await createDeterministicDisplayBasis(projection)};projection=await projectReceizProofValueV129({...basis,valuationKaiUPulse:input.evaluationKaiUPulse});if(projection.status==='unavailable')return{projection,chart:null,replay:null,replayVerification:null};}
  const chart = await sampleReceizProofValueV129({ ...basis, valuationKaiUPulses: coordinates });
  const replay = await exportReceizProofValueReplayV129({ ...basis, valuationKaiUPulses: coordinates });
  const replayVerification = await verifyReceizProofValueReplayV129(replay);
  if (replayVerification.status !== 'verified-replay') throw new Error(`Replay rejected: ${replayVerification.code}`);
  return { projection, chart, replay, replayVerification };
}

export async function inspectReplayFile(file: File) {
  if (file.size > MAX_INPUT_BYTES) throw new Error('Replay exceeds the 64 MiB reader limit.');
  const replay: unknown = JSON.parse(await file.text());
  return verifyReceizProofValueReplayV129(replay);
}
