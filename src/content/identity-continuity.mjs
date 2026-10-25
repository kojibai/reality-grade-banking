// Public explanation of the implemented identity primitive. No account execution.
export const identityContinuityPage={slug:'identity-continuity',path:'/id/',identityContinuity:true,title:'Your identity shouldn’t start over every time you open an app',description:'Open Bankeiz with your established Receiz identity. Understand passkey authentication, verified account recovery, supported history and each application’s own permissions.',lines:['A different app.','The same you.'],intro:'One identity. Multiple applications. Verified continuity.',sections:[]};
export const identityLayers=[
 ['Receiz ID','The identity stays yours.','A persistent Receiz identity and its verified account bindings connect supported records to their original authority. A username helps people recognize you; the admitted identity proof establishes the binding.'],
 ['Passkey and presence','You prove it’s you.','The established WebAuthn ceremony requests user verification through a supported device: Face ID, Touch ID, a device PIN or another supported authenticator. PBI does not bypass WebAuthn origin or RP restrictions.'],
 ['Canonical Receiz realm','One explicit passkey realm.','The canonical production RP ID is receiz.com. Receiz’s Related Origins implementation explicitly authorizes bankeiz.com and www.bankeiz.com through WebAuthn Related Origin Requests, where the browser supports them.'],
 ['Portable proof and recovery','Restore from admitted originals.','Identity Records, Identity Seals and Receiz Keys carry the supported recovery and verified account state. The verifier admits the stronger original first; an application projects only the state its supported contracts understand.'],
 ['Application sessions','A different application keeps its own rules.','Receiz and Bankeiz establish their own authorized application access. Proof admission, session issuance and action consent remain separate operations. Recognizing an identity does not grant every permission.'],
 ['Proof-native continuity','The source stays connected.','Supported identity, ownership, custody and history stay attached to their verified sources. Later synchronization can add verified records; it cannot replace stronger admitted proof with a weaker session or display.'],
];
export const identitySourceCards=[
 ['Canonical passkey realm','The production RP ID, allowed-origin resolution and RP hash checks.','app/lib/auth/passkey.ts','receiz'],
 ['Explicit related origins','The exact Bankeiz origins admitted beneath the existing Receiz realm.','app/lib/auth/relatedOrigins.ts','receiz'],
 ['Create the challenge','The native challenge and established passkey request contract.','app/api/auth/passkey/begin/route.ts','receiz'],
 ['Verify and complete','The verification and session completion path after accepted proof.','app/api/auth/passkey/finish/route.ts','receiz'],
 ['Bind the same account','The identity/account binding, recovery and projection invariants.','docs/pbi-recovery-receiz-id-binding.md','receiz'],
 ['Continuity, documented','The implemented proof, session, projection, binding and sync boundaries.','docs/receiz-identity-continuity-one-pager.md','receiz'],
 ['Bankeiz identity admission','Original artifact verification, canonical identity admission and supported account projection.','src/receiz/native-identity.ts','reality-grade-banking'],
 ['Bankeiz PBI account recovery','Reuse of existing PBI proof and account binding within Bankeiz.','src/receiz/pbi-account.ts','reality-grade-banking'],
];
export const continuityUses=[
 ['01','Banking','The same identity. A connected account.','Bankeiz admits an existing Receiz identity and supported account state. Payments, Settlement and financial operations retain their own review and authority.','Implemented reference: Bankeiz','/learn/receiz-id/'],
 ['02','Gaming','An original can outlive one experience.','Receiz and Wildz carry proof-native ownership and supported asset history. Another game must explicitly integrate the same verification and admission contracts.','Implemented foundation; third-party games integrate explicitly','https://receiz.com/sports'],
 ['03','Commerce','Keep the evidence after the purchase.','Original proof objects carry supported provenance, ownership and transaction evidence beyond one merchant’s display. A new merchant still defines its accepted instruments and permissions.','Implemented proof and receiving contracts','/learn/proof-objects/'],
 ['04','Cooperatives','One participant. Distinct relationships.','Independent organizations can recognize the same identity while keeping memberships, permissions and commercial agreements separate. Each organization’s integration must be qualified.','Implemented identity; organization-specific integration required','/coops/'],
 ['05','AI agents','One agent. Your context. A connected next step.','Continue with the same agent, Receiz identity and supported conversation context across compatible applications and authorized tools. Pick up with the person, the conversation and the next step connected, without repeating setup. Consequential actions still require bounded human authorization.','Implemented agent and identity primitives; compatible-app integration and tool permissions required','/agent/'],
 ['06','Recovery','A lost session is not a lost identity.','Admit an Identity Record, Identity Seal or Receiz Key to restore its supported account state. Keep original files private. Identity recovery does not clone protected offline Note custody.','Implemented recovery and proof admission','/learn/signing-key/'],
];
