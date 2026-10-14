import type { ReceizOperationalCapabilityReportV124 } from '@receiz/sdk';
import { BANK_APPLICATION_ID, BANK_NATIVE_SCOPES } from './config.js';
export const BANK_NATIVE_OPERATIONS = ['subject-admission', 'namespace-resolution', 'durable-execution', 'verified-replay', 'multi-domain-transaction', 'public-recipient-resolution', 'source-publication'] as const;
export interface BankNativeReadiness {
  status: 'permissions-needed' | 'runtime-unavailable' | 'bank-domain-needed';
  missingScopes: string[]; unavailableOperations: { operation: string; reason: string | null }[];
  readyToTransact: false;
}
// Read-only presentation of the SDK-admitted operational report. Even an
// available report cannot admit a custodian, source, funds or bank command.
export function summarizeNativeBankReadiness(report: ReceizOperationalCapabilityReportV124): BankNativeReadiness {
  if (report.applicationId !== BANK_APPLICATION_ID) throw new Error('APPLICATION_MISMATCH');
  if (report.results.length !== BANK_NATIVE_OPERATIONS.length || BANK_NATIVE_OPERATIONS.some(operation => report.results.filter(item => item.operation === operation).length !== 1)) throw new Error('INCOMPLETE_QUALIFICATION');
  const scopes = report.results[0].actualGrantedScopes;
  if (report.results.some(item => item.actualGrantedScopes.length !== scopes.length || item.actualGrantedScopes.some(scope => !scopes.includes(scope)))) throw new Error('GRANT_SCOPE_MISMATCH');
  const missingScopes = BANK_NATIVE_SCOPES.filter(scope => !scopes.includes(scope));
  const unavailableOperations = report.results.filter(item => item.status !== 'available' || item.dependencyHealth !== 'healthy').map(item => ({ operation: item.operation, reason: item.reasonCode }));
  return { status: missingScopes.length ? 'permissions-needed' : unavailableOperations.length ? 'runtime-unavailable' : 'bank-domain-needed', missingScopes, unavailableOperations, readyToTransact: false };
}
