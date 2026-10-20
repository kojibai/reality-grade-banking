// Public explanation only. These release facts never qualify a device,
// authorize a transfer or replace current SDK proof admission.
export const noteContinuity = Object.freeze({
  connectedExecutionStatus: 'integration-required',
  connectedAvailability: 'Connected Note consumption is not enabled in the current integration. It must be implemented and independently qualified before a device without qualified local custody can send a Note through that path.',
  accessoryStatus: 'coming-soon',
  accessoryTitle: 'Extended device support',
  accessoryDescription: 'A Bankeiz accessory is planned. Coming soon. Availability, compatible devices and qualification evidence will be published before purchase is offered. Existing Notes will require a verified custody transition; connecting an accessory alone will not change their spend authority.',
  paths: [
    {id:'local',title:'Protected local consumption',body:'Qualified custody retires the previous Note head and binds its successor to the exact recipient and value. That protection permits continuous offline transfers without periodic server confirmation, within the implementation’s prepared capacity and trust policy.'},
    {id:'connected',title:'Connected consumption',body:'A device without qualified local custody can hold and verify a completed incoming Note offline. Its next send requires a connected Receiz operation that consumes the exact previous head once. Connectivity is needed for that transfer, rather than as a permanent device unlock.'},
  ],
  requirements: [
    {id:'NOTE-01',title:'Complete original',body:'Verify the exact enclosing original before admitting its payload, history, funding or custody. Preserve the original source and every unknown namespace.'},
    {id:'NOTE-02',title:'Distinct states',body:'Retained bytes, verified receipt, confirmed ownership and permission to send are distinct. A display label or cached record cannot advance them.'},
    {id:'NOTE-03',title:'Recipient-bound claim',body:'A completed incoming transfer binds the receiver, Note, exact predecessor, whole value, funding and consumption evidence. Missing or conflicting evidence stays pending or is refused.'},
    {id:'NOTE-04',title:'One predecessor, one successor',body:'Consume the exact current predecessor once. The identical accepted operation resolves the same result; a changed recipient, value or successor cannot reuse it.'},
    {id:'NOTE-05',title:'Qualified local consumption',body:'Continuous offline sending requires independently qualified custody that prevents restored, cloned or competing state from authorizing another successor. A device name or API advertisement is insufficient.'},
    {id:'NOTE-06',title:'Exact connected send',body:'Other custody requires an atomic connected Receiz operation for each exact outgoing transfer. A previous connection does not unlock arbitrary later offline sends.'},
    {id:'NOTE-07',title:'Conserved value',body:'Allocation, issuance, transfer, redemption and account credit conserve the signed rail and exact amount. Value cannot be spendable in the account and Note simultaneously. Reserve denomination and Settlement Phi retain their distinct units.'},
    {id:'NOTE-08',title:'Kai causal order',body:'KaiSigil-bound Kai micro-pulse and verified predecessor history govern causal order. Server timestamps cannot replace them. Ordering candidates alone cannot establish consumption or reveal a withheld branch.'},
    {id:'NOTE-09',title:'Custody migration',body:'Changing consumption paths requires a verified transition that retires the former authority. Connected and local custody cannot both spend the same head. Hardware installation or a diagnostic result is not migration.'},
    {id:'NOTE-10',title:'Exact-intent recovery',body:'Retain the original intent and recovery material before execution. A lost response is unknown, not failed. Resolve the same operation before retrying; never restore a consumed predecessor.'},
    {id:'NOTE-11',title:'Once-only deposit',body:'Consume the Note and credit the exact receiving account atomically, once. Another import, device, filename or stale copy cannot create a second credit.'},
    {id:'NOTE-12',title:'Scoped qualification',body:'Assess the exact build, custody implementation, trust policy, device/API path, realm and recovery behavior. Synthetic providers and browser diagnostics do not establish production qualification.'},
    {id:'NOTE-13',title:'Immediate local use',body:'Display retained verified truth immediately. Do not introduce capability polling, page-load credential ceremonies or a network round trip merely to show a held Note. Only the chosen action enters its required path.'},
    {id:'NOTE-14',title:'Verified completion',body:'Reopen the complete accepted successor and required evidence before reporting success. A report-only receipt, HTTP response, server row or artifact digest cannot replace that source.'},
  ],
  integrators: [
    {title:'Device and secure-component manufacturers',body:'Expose non-exportable custody and irreversible, independently verifiable head consumption bound to the exact receiver and value.'},
    {title:'Operating-system and runtime vendors',body:'Preserve protected state, isolation, attestation and recovery across crashes and restoration. Supply an accessible bridge to that operation.'},
    {title:'Browser vendors',body:'Expose the protected operation to the web with origin, RP and authorization bindings intact. Writable storage, derivation keys and cooperative locks alone do not establish irreversible consumption.'},
    {title:'Receiz and application integrators',body:'Admit the actual custody profile and exact-byte evidence through supported SDK operations. Qualify connected atomic execution, offline receipt, both custody paths, migration and once-only deposit.'},
  ],
});

export const noteContinuityGuideSections = [
  ['Using Notes offline', 'The continuity standard keeps one Note experience: create, receive, send and deposit. A completed incoming transfer can be held and verified offline when its original includes the required recipient and exclusive-consumption evidence. Qualified local custody can confirm the next send offline. Other devices require a connected consumption operation for that exact next transfer. A pending handoff is retained without being counted as spendable value.'],
  ['Device integration and availability', 'Conformance depends on verified capabilities, rather than a device name. Protection may be exposed through a device, operating system or browser integration, but the actual implementation must pass its full custody assessment. The public device check is a nonfinancial diagnostic, not a qualification certificate. Connected Note consumption is not yet enabled in this integration. A future accessory is coming soon; no purchase or compatible-device promise is offered before qualification.'],
];
