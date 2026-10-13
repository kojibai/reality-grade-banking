import type { ReceizDomainDefinition } from '@receiz/sdk/compiler';
const names = ['bank.custody.receive', 'bank.ownership.transfer', 'bank.ownership.lock', 'bank.ownership.unlock', 'bank.ownership.sell', 'bank.custody.redeem', 'bank.currency.create', 'bank.currency.transfer', 'bank.currency.redeem'] as const;
// This is an SDK compiler input, not a registry fork, custody issuer, verified
// source or live registration. Actual bank operations need the admitted sources
// and native head/atomic adapter described in the implementation contract.
export const BANK_DOMAIN_DEFINITION: ReceizDomainDefinition = {
  schema: 'receiz.domain.v1', version: '127.0.0', domain: 'bank',
  aggregate: { name: 'BankProofDomain', idPrefix: 'bank-proof' }, authorityProfile: 'global-shared',
  stateSchema: { status: { type: 'string' }, assets: { type: 'object', source: 'sealed-custody-and-ownership-proof' }, currencies: { type: 'object', source: 'sealed-supply-and-backing-proof' }, nativeValueReferences: { type: 'array', source: 'admitted-reserve-or-settlement' } },
  stateMachine: { initial: 'active', states: ['active'], transitions: names.map(command => ({ command, from: 'active', to: 'active' })) },
  commands: names.map(name => ({ name, capability: name, events: [`${name}.accepted`], maximumEffects: { sourceAppends: 4 } })),
  events: names.map(name => ({ name: `${name}.accepted`, payloadSchema: { enclosingArtifactDigest: { type: 'string' }, priorHead: { type: 'string' }, acceptedHead: { type: 'string' }, operationPlanDigest: { type: 'string' }, kaiUPulse: { type: 'string' } } })),
  projections: [{ name: 'bank.assets', events: names.filter(name => !name.startsWith('bank.currency')).map(name => `${name}.accepted`) }, { name: 'bank.currencies', events: names.filter(name => name.startsWith('bank.currency')).map(name => `${name}.accepted`) }],
  laws: ['authority.proof-object-first', 'ownership.enclosing-artifact-first', 'ownership.cross-platform-proof-object-continuity', 'receiz.command-only-mutation', 'receiz.value.phi-two-rails.v122', 'receiz.runtime.proof-object-storage-authority.v124', 'receiz.time.live-kai-genesis-phi-bridge.v124', 'receiz.runtime.authenticated-request-bound-response.v124', 'receiz.execution.exactly-once-recovery.v124', 'receiz.execution.atomic-multi-domain-zero-write.v124'],
  capabilities: [...names], migrations: [],
  privacy: { classification: 'private-sources-public-consented-witnesses', sensitiveFields: ['identitySource', 'recoveryPhrase', 'shippingAddress', 'custodyEvidence', 'authoritySession', 'fundingSource'] },
  performance: { maxLawOperations: 10000, maxEventsPerCommand: 4, maxRecordsPerTransaction: 256 },
};
