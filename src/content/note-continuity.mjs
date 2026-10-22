// Public explanation only. These release facts never qualify a device,
// authorize a transfer or replace current SDK proof admission.
export const noteContinuity = Object.freeze({
  connectedExecutionStatus: 'qualification-required',
  connectedAvailability: 'Account-destination receipt and connected redemption are implemented using existing v129 proofs. A recipient can verify and retain a completed Note offline without custody enrollment; account credit is confirmed on connection. Connected creation uses the selected Receiz account writer without custody enrollment. Its recipient-bound handover can be received offline; exclusive consumption and account credit are confirmed once on connection. Device and deployment assessments identify the exact operating environment, verified operations and supporting evidence.',
  platformRequest: 'Please bring this browser and its device integration into conformance with the Receiz Note continuity standard for offline Note creation and consumption. Expose protected, non-exportable custody with irreversible consumption of the exact predecessor, bound to the recipient, whole value and successor. Provide independently verifiable attestation and consumption evidence; restored state must not authorize a second spend, and interrupted execution must resolve the same original intent. Preserve origin/RP binding and user authorization. The full standard and device diagnostic are at https://bankeiz.com/conformance/#note-continuity .',
  platformContacts: [
    {title:'Safari and iPhone / iPad',team:'Apple’s Safari / WebKit and platform security teams',url:'https://webkit.org/reporting-bugs/',label:'WebKit reporting guidance'},
    {title:'Chrome and Chromium-based browsers',team:'The browser’s platform security team and Chromium Web Authentication maintainers',url:'https://www.chromium.org/for-testers/bug-reporting-guidelines/',label:'Chromium reporting guidance'},
    {title:'Firefox',team:'Mozilla’s Firefox / Gecko Web Authentication team',url:'https://bugzilla.mozilla.org/',label:'Mozilla Bugzilla'},
  ],
  paths: [
    {id:'local',title:'Protected local consumption',body:'Qualified custody retires the previous Note head and binds its successor to the exact recipient and value. That protection permits continuous offline transfers without periodic server confirmation, within the implementation’s prepared capacity and trust policy.'},
    {id:'connected',title:'Receive offline. Reconcile before spending.',body:'An account-destination Note carries the complete funding source and signed recipient-bound handover. Qualified custody also carries irreversible local consumption evidence; connected-profile handovers remain pending exclusive consumption until reconciliation. Its recipient verifies and retains it offline without a custody authenticator. Receiz confirms the account credit once on connection, before an account payment or new Note uses the received balance. The original remains available throughout.'},
  ],
  requirements: [
    {id:'NOTE-01',title:'Complete original',body:'Verify the exact enclosing original before admitting its payload, history, funding or custody. Preserve the original source and every unknown namespace.'},
    {id:'NOTE-02',title:'Distinct states',body:'Retained bytes, verified receipt, confirmed account credit and permission to spend are distinct. A display label or cached record cannot advance them.'},
    {id:'NOTE-03',title:'Recipient-bound claim',body:'A completed incoming transfer binds the receiver, Note, exact predecessor, whole value, funding and consumption evidence. Missing or conflicting evidence stays pending or is refused.'},
    {id:'NOTE-04',title:'One predecessor, one successor',body:'Consume the exact current predecessor once. The identical accepted operation resolves the same result; a changed recipient, value or successor cannot reuse it.'},
    {id:'NOTE-05',title:'Qualified local consumption',body:'Continuous offline sending requires independently qualified custody that prevents restored, cloned or competing state from authorizing another successor. A device name or API advertisement is insufficient.'},
    {id:'NOTE-06',title:'Reconcile before spending',body:'A locally received account deposit reconciles its exact terminal through Receiz before an account payment or new Note uses its value. A connection event or previous successful operation cannot authorize an arbitrary offline spend.'},
    {id:'NOTE-07',title:'Conserved value',body:'Allocation, issuance, transfer, redemption and account credit conserve the signed funding and exact amount. A combined Settlement Reserve Note carries both original components through every transition. Value cannot be spendable in the account and Note simultaneously. Reserve denomination and Settlement Phi retain their distinct units.'},
    {id:'NOTE-08',title:'Kai causal order',body:'KaiSigil-bound Kai micro-pulse and verified predecessor history govern causal order. Server timestamps cannot replace them. Ordering candidates alone cannot establish consumption or reveal a withheld branch.'},
    {id:'NOTE-09',title:'Custody migration',body:'Changing consumption paths requires a verified transition that retires the former authority. Connected and local custody cannot both spend the same head. Hardware installation or a diagnostic result is not migration.'},
    {id:'NOTE-10',title:'Exact-intent recovery',body:'Retain the original intent and recovery material before execution. A lost response is unknown, not failed. Resolve the same operation before retrying; never restore a consumed predecessor.'},
    {id:'NOTE-11',title:'Once-only deposit',body:'Consume the Note and credit the exact receiving account atomically, once. Another import, device, filename or stale copy cannot create a second credit.'},
    {id:'NOTE-12',title:'Scoped qualification',body:'Assess the exact build, custody implementation, trust policy, device/API path, realm and recovery behavior. Synthetic providers and browser diagnostics do not establish production qualification.'},
    {id:'NOTE-13',title:'Immediate local use',body:'Display retained verified truth immediately. Do not introduce capability polling, page-load credential ceremonies or a network round trip merely to show a held Note. Only the chosen action enters its required path.'},
    {id:'NOTE-14',title:'Verified completion',body:'Reopen the complete accepted successor and required evidence before reporting success. A report-only receipt, HTTP response, server row or artifact digest cannot replace that source.'},
  ],
  states: [
    {title:'Received',body:'Complete recipient-bound source verified and retained locally. Visible as Received Notes, separate from available account credit.'},
    {title:'Confirming',body:'The exact terminal is being reconciled or its outcome is unresolved. Preserve it and recover the same operation.'},
    {title:'Deposited',body:'The native credit and private account opening verify against the exact terminal. The account can use its confirmed value through its supported execution path.'},
  ],
  formats: [
    {title:'Receiving request',body:'A bounded signed destination from the existing Identity Record. Account UUID, key, carried-state digest and nonce are bound together. The host independently checks native account membership.'},
    {title:'Completed Note',body:'The complete funding source and signed recipient-bound handover are packed losslessly into the original PNG. A qualified terminal carries local consumption evidence; a connected-profile handover requires native once-only consumption on connection. Forwarding a copy cannot change its recipient.'},
    {title:'Deposit receipt',body:'The complete native credit, original terminal and private account opening remain available for independent verification. An inspection never submits a credit or grants spending authority.'},
  ],
  receivingFields: [
    {title:'schema',body:'receiz.bank.note-account-receiving-request.v1 — application destination envelope, not a custody profile.'},
    {title:'receiverUserId',body:'The native account UUID, signed as destination intent. An existing account state must match; a fresh SDK device identity uses the already known native account destination.'},
    {title:'receiverKeyId',body:'The exact Identity Record key identifier, as 64 lowercase hexadecimal characters.'},
    {title:'receiverAlgorithm',body:'Ed25519 or P-256, using the existing identity signature verifier.'},
    {title:'receiverPublicKeyRawB64u',body:'The public key, encoded as unpadded base64url. No private key or recovery material is exported.'},
    {title:'receiverUsername',body:'Display metadata, or null. A handle alone does not authorize native credit.'},
    {title:'identityPortableStateDigest',body:'The digest of the carried signed identity state. The host independently verifies the actual account/key binding at credit.'},
    {title:'nonce',body:'A fresh UUID identifying this receiving request.'},
    {title:'requestDigest',body:'The existing identity authority digest over the exact canonical basis fields and schema domain.'},
    {title:'signatureB64Url',body:'The Identity Record signature over the base64url UTF-8 schema:requestDigest challenge.'},
  ],
  reconciliation: [
    {title:'Reopen the exact original',body:'Admit its complete terminal, funding closure, receiver account and key through v129. Retained checkpoint labels grant no financial authority.'},
    {title:'Submit once; recover the same result',body:'A fresh retained Note uses one native redemption submission. Its submission marker is saved first. An interrupted or legacy attempt recovers the original result; only definite absence permits resubmitting the same terminal. Every original signed artifact remains intact.'},
    {title:'Verify the returned credit',body:'Reopen the complete native credit and private cash snapshot against the original terminal, receiver, rail and exact amounts. HTTP success or a balance row is insufficient.'},
    {title:'Retain before confirming',body:'Save the full receipt and opening before committing confirmed local state. Publish each durable completion even if another deposit later fails. Unresolved originals and their encryption key stay protected.'},
  ],
  limits: [
    {title:'16 KiB receiving request',body:'Exact canonical field set and signature verification. Missing, unknown or changed fields are refused.'},
    {title:'8 MiB image · 4 MiB host request',body:'The PNG, native packed wire (6 MiB) and host JSON request have distinct bounds. Oversized submission preserves the original. Artwork cannot replace the carried proof.'},
    {title:'Bounded complete sources',body:'Qualified source and receipt reopening allows 32 MiB; connected funding and handover sources allow 16 MiB, with complete receipt openings retained separately. Proof history and unknown namespaces are never trimmed to fit.'},
    {title:'64 retained deposit entries',body:'The current encrypted queue refuses additional entries at capacity and preserves existing originals. Export complete proofs; an Identity Record alone is not their backup.'},
  ],
  assessment: [
    {title:'Source and recovery checks',body:'Local tests reopen complete synthetic originals, refuse altered proofs and wrong recipients, preserve offline receipt across reopen, and retain exact intent after a lost response.'},
    {title:'Native writer',body:'An isolated v129 writer check credits a recipient with no receiver custody slot once, including concurrent identical submissions. Accounts, roots and authenticators are synthetic; no production money is involved.'},
    {title:'Physical and deployed scope',body:'Real protected-device custody, deployed financial conservation and interrupted-operation recovery remain unassessed. A reference test or diagnostic does not qualify those capabilities.'},
  ],
  integrators: [
    {title:'Device and secure-component manufacturers',body:'Expose non-exportable custody and irreversible, independently verifiable head consumption bound to the exact receiver and value.'},
    {title:'Operating-system and runtime vendors',body:'Preserve protected state, isolation, attestation and recovery across crashes and restoration. Supply an accessible bridge to that operation.'},
    {title:'Browser vendors',body:'Expose the protected operation to the web with origin, RP and authorization bindings intact. Writable storage, derivation keys and cooperative locks alone do not establish irreversible consumption.'},
    {title:'Receiz and application integrators',body:'Admit the actual custody profile and exact-byte evidence through supported SDK operations. Qualify connected atomic execution, offline receipt, both custody paths, migration and once-only deposit.'},
  ],
});

export const noteContinuityGuideSections = [
  ['One amount. Complete continuity.', 'Enter an amount; your account uses Reserve first and Settlement only for the remainder. A single source stays a Reserve Note or Settlement Note. When both contribute, one Settlement Reserve Note retains the exact split. Reserve dollars stay fixed; Settlement preserves its exact Phi. The original proof carries the funding sources, recipient-bound handover and once-only deposit receipt.'],
  ['Using Notes offline', 'Create, receive, send and deposit through one interface. A completed account-destination Note can be verified and saved offline without receiver custody enrollment. Its value is shown as Received Notes; the exact deposit reconciles on connection before an account payment or a new Note uses that balance. Creating new spend authority offline requires conforming protected custody and already prepared resources. A copy cannot change the recipient or create another credit.'],
  ['Device integration and availability', 'Conformance applies to the exact implementation, build, trust policy and recovery behavior. A device or browser path must demonstrate the standard, rather than rely on its name or advertised features. The opt-in device check is a nonfinancial diagnostic. The Conformance workspace publishes implementation responsibilities, original-proof formats, assessment boundaries and a request for the responsible platform team. Account receipt and connected creation are implemented in the v129 host composition. Physical-device and deployed financial qualification remain release requirements.'],
];
