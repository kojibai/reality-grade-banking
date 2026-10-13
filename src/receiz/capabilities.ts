import type { Rail } from '../core/types';
export interface DestinationCapability { id: string; name: string; rails: readonly Rail[]; proofContinuity: boolean; configured: boolean; source: 'demo' | 'qualified'; }
export interface DestinationAssessment { status: 'supported' | 'unsupported' | 'unconfigured'; reason: string; }
export function assessDestination(destination: DestinationCapability, rail: Rail): DestinationAssessment {
  if (rail === 'settlement' && (!destination.proofContinuity || !destination.rails.includes(rail))) return { status: 'unsupported', reason: "This institution doesn't yet support proof-backed Settlement. Your verified value stays in your account." };
  if (!destination.rails.includes(rail)) return { status: 'unsupported', reason: 'This destination does not support the selected value rail.' };
  if (!destination.configured) return { status: 'unconfigured', reason: 'Connect and qualify this receiving route before transferring value.' };
  return { status: 'supported', reason: 'This receiving route carries the selected proof and continuity.' };
}
export const demoDestinations: DestinationCapability[] = [{ id: 'receiz', name: 'Receiz account', rails: ['reserve', 'settlement'], proofContinuity: true, configured: true, source: 'demo' }, { id: 'external', name: 'External institution', rails: ['reserve'], proofContinuity: false, configured: false, source: 'demo' }];
