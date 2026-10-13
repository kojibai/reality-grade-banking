import { expect, it } from 'vitest';
import { summarizeNativeBankReadiness } from '../src/receiz/bank-native-readiness';
import type { ReceizOperationalCapabilityReportV124 } from '@receiz/sdk';
const operations = ['subject-admission', 'namespace-resolution', 'durable-execution', 'verified-replay', 'multi-domain-transaction', 'public-recipient-resolution', 'source-publication'];
function report(scopes: string[]): ReceizOperationalCapabilityReportV124 { return {
  schema: 'receiz.operational-capability-report.v124', applicationId: 'rc_ELkGAUBINd9Nw4bE5zMqUsgc', requestedOperations: operations, qualifiedAtKaiUPulse: 1,
  reportDigest: 'a'.repeat(64), runtimeReceiptDigest: 'b'.repeat(64), authority: { reportIsProofAuthority: false, reportIsOperationalAuthority: false, strongerTruth: 'receiz-identity-artifact' },
  results: operations.map(operation => ({ operation, status: 'available', actualGrantedScopes: scopes, serviceVersion: '124.0.0', registryVersion: '127.0.0', reducerVersion: '120.0.0', publicDependencyHeads: {}, dependencyHealth: 'healthy', reasonCode: null, retry: { strategy: 'none', retryAfterKaiUPulse: null }, evidence: { runtime: 'ready', transportSignature: 'available', registry: 'compatible', reducer: 'compatible', publicHeads: 'current', distributedLimiter: 'not-required' } })),
}; }
it('does not call the bank ready merely because the generic runtime is available with read/card scopes', () => {
  const result = summarizeNativeBankReadiness(report(['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read', 'receiz:payments.create', 'receiz:payments.read']));
  expect(result.status).toBe('permissions-needed'); expect(result.missingScopes).toContain('receiz:reserve.write'); expect(result.missingScopes).toContain('receiz:domains.write');
});
it('a complete generic report still requires the bank domain sources and adapter, not a success boolean', () => {
  const result = summarizeNativeBankReadiness(report(['receiz:wallet.read', 'receiz:settlement.read', 'receiz:reserve.read', 'receiz:payments.create', 'receiz:payments.read', 'receiz:subjects.read', 'receiz:subjects.write', 'receiz:domains.read', 'receiz:domains.write', 'receiz:settlement.write', 'receiz:reserve.write', 'receiz:record', 'receiz:seal']));
  expect(result.status).toBe('bank-domain-needed'); expect(result.readyToTransact).toBe(false);
});
it('refuses a foreign application or an incomplete operation report', () => {
  expect(() => summarizeNativeBankReadiness({ ...report([]), applicationId: 'rc_foreign' })).toThrow('APPLICATION_MISMATCH');
  expect(() => summarizeNativeBankReadiness({ ...report([]), results: [] })).toThrow('INCOMPLETE_QUALIFICATION');
});
