import type { ReceizOpenedArtifact } from '@receiz/sdk';
import {readComposerAssetContent} from './asset-composer';
import { validateAssetDefinition } from './asset-definition';
import { parseAmount } from '../core/money';
import { readDeliveryInstructions, type DeliveryInstructions } from './custody-delivery';
export interface AssetIntake { title: string; category: 'physical' | 'stock' | 'property'; quantity: string; estimatedValue: string; }
export interface HeldDeposit { assetDefinition?:import('./asset-definition').AssetDefinition; publication?:import('./asset-publication').AssetPublicationDelivery; executionDigest?:string; nativeAsset?:{assetId:string;quantityMicro:string;lockedQuantityMicro:string;supplyMicro:string;symbol:string;backingRail:'reserve'|'settlement'|'composite';backingComponents?:readonly import('./native-asset-backing').NativeAssetFundingComponent[];backingUsdCents:string;backingPhiMicro:string;status:'active'|'redeemed';issuedAtKaiUPulse:string;sourceKaiUPulse:string}; digest: string; filename: string; title: string; kind: 'intake' | 'proof'; status: 'awaiting-custody' | 'held-proof'; intake?: AssetIntake; delivery?: DeliveryInstructions; pulse: string | null; bytes: Uint8Array; }
export function validateAssetIntake(input: AssetIntake): AssetIntake {
  const title = input.title.trim(); if (!title || title.length > 80) throw new Error('Describe the asset you are depositing.');
  if (!['physical', 'stock', 'property'].includes(input.category)) throw new Error('Choose a supported asset type.');
  if (BigInt(parseAmount(input.quantity)) <= 0n) throw new Error('Enter a quantity greater than zero.');
  if (input.estimatedValue && !/^\d{1,18}(\.\d{1,2})?$/.test(input.estimatedValue)) throw new Error('Enter your estimate in dollars with up to two decimal places.');
  return { title, category: input.category, quantity: input.quantity, estimatedValue: input.estimatedValue };
}
// SDK-opened exact source records intent, never custody, funded Reserve or
// transferable physical ownership. The later custodian must supply its receipt.
export function projectHeldDeposit(opened: ReceizOpenedArtifact, bytes: Uint8Array, filename: string, owner: string): HeldDeposit {
  if (opened.sealedArtifact.continuity.ownerReceizId !== owner) throw new Error('This proof belongs to a different Receiz identity.');
  let definitionTitle: string | undefined,assetDefinition:import('./asset-definition').AssetDefinition|undefined;
  let intake: AssetIntake | undefined, delivery: DeliveryInstructions | undefined;
  try {
    const payload = JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));
    if(payload?.schema==='receiz.bank.asset-content.v2'){const content=readComposerAssetContent(payload,owner);definitionTitle=content.title;if(content.definition)assetDefinition=validateAssetDefinition(content.definition);}
    if (payload?.schema === 'receiz.bank.asset-definition.v1') {
      if (payload.createsSpendableValue !== false || payload.backingCommitted !== false || payload.issuerReceizId !== owner) throw new Error('Unsupported asset definition.');
      assetDefinition=validateAssetDefinition(payload.definition);definitionTitle=assetDefinition.name;
    }
    if (payload && typeof payload === 'object' && payload.schema === 'receiz.bank.asset-intake-request.v1') {
      if (payload.custody !== 'awaiting-receipt' || payload.createsSpendableValue !== false) throw new Error('Unsupported intake request.');
      intake = validateAssetIntake(payload.asset);
      if (intake.category === 'physical' && payload.delivery != null) delivery = readDeliveryInstructions(payload.delivery, payload.requestId);
    }
  } catch (error) { if (!(error instanceof SyntaxError)) throw error; }
  const pulse = opened.verification.bundle?.kaiPulseEternal;
  return { ...(assetDefinition?{assetDefinition}:{}),digest: opened.sealedArtifact.artifactSha256, filename, title: definitionTitle ?? intake?.title ?? opened.verifiedPayload.filename, kind: intake ? 'intake' : 'proof', status: intake ? 'awaiting-custody' : 'held-proof', intake, delivery, pulse: typeof pulse === 'string' ? pulse : null, bytes: new Uint8Array(bytes) };
}
