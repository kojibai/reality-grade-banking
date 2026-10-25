// Task-oriented documentation; no account reads or private source material.
export const docsOrigin='https://docs.bankeiz.com';
export const docsArticles=[
  {
    "slug": "getting-started",
    "title": "Begin with your own source",
    "summary": "Open the existing account path, preserve your private original and complete one useful operation.",
    "group": "Start",
    "sections": [
      [
        "The architecture",
        "The proof-native economy is the economic system. Reality-grade banking is the standard for interacting with it. Receiz is the reality-grade infrastructure, exposed through SDK, MCP and AI Skills. Bankeiz is an open implementation."
      ],
      [
        "Open the account",
        "Enter the bank using its existing identity path. An empty supported device can establish local identity; an existing Identity Record, Identity Seal, Receiz Key or supported PBI recovery continues the established identity. Never replace an unreadable existing original with a new account."
      ],
      [
        "Preserve custody",
        "Save your supported private identity original and any required phrase somewhere you control. Keep originals for Notes and operations you depend on. Resolve protected Notes and unfinished attempts before retiring a device or clearing storage."
      ],
      [
        "Perform one useful action",
        "Inspect a public proof, open Receive or select a supported payment. Review the exact financial operation before approval. After execution, inspect its confirmed receipt and original reference."
      ]
    ],
    "sources": [
      [
        "Account entry and supported source boundaries",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/current-function-boundaries.md"
      ],
      [
        "Identity, native assets and account proofs",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/native-assets-and-account-proofs-v129.md"
      ]
    ],
    "related": [
      "identity",
      "funding",
      "payments"
    ],
    "code": null
  },
  {
    "slug": "infrastructure",
    "title": "Economy, banking and infrastructure",
    "summary": "One explicit relationship: the economy, its banking standard and the primitives that implement it.",
    "group": "Start",
    "sections": [
      [
        "Proof-native economy",
        "A participating claim carries the required source, rights and evidence. Ownership, exact supported value and causal predecessors remain connected. A display or self-description does not establish the proof it claims to show."
      ],
      [
        "Reality-grade banking",
        "The standard composes holding, inspection, receiving and deliberate movement while preserving the source authority. Independent implementations use their own interfaces and authorized access without changing what the original proves."
      ],
      [
        "Reality-grade infrastructure",
        "Receiz implements identity, sealing, verification, ownership, Settlement, Notes and continuity. The SDK composes application operations; MCP exposes supported tools; AI Skills supply the corresponding workflows. They share primitive contracts rather than creating separate authorities."
      ],
      [
        "Source first",
        "Verify the enclosing stronger artifact before projecting an embedded subpayload. Application data, a database row or a model answer may present supported truth; it cannot replace the original authority."
      ]
    ],
    "sources": [
      [
        "Architecture and current capabilities",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/README.md"
      ],
      [
        "Receiving standard",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/receiving-standard.md"
      ],
      [
        "Published infrastructure installation",
        "https://receiz.com/developers/install"
      ]
    ],
    "related": [
      "sdk",
      "mcp",
      "ai-skills"
    ],
    "code": null
  },
  {
    "slug": "identity",
    "title": "Identity and account access",
    "summary": "Keep identity proof, application access and financial approval distinct.",
    "group": "Account",
    "sections": [
      [
        "Private original",
        "Receiz ID establishes identity continuity. The supported Identity Record, Identity Seal or Receiz Key carries its own admission and recovery material. A username is a receiving or recognition coordinate, not private authority."
      ],
      [
        "Opening access",
        "The current Bankeiz consent names its read scope and the protected proof supplied to the connected service. Signing material remains on the device. A granted read scope does not authorize transfers, purchases or sales."
      ],
      [
        "Recovery and account continuity",
        "Use the original supported recovery path. The admitted original projects supported state; a server response cannot replace stronger retained identity proof. Protected offline Note custody remains a separate device-bound responsibility."
      ],
      [
        "Separate integrations",
        "Compatible apps admit supported identity and history with their own access rules. A shared identity or an agent’s request does not make every private application accessible."
      ]
    ],
    "sources": [
      [
        "Exact consent and scope constants",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/config.ts"
      ],
      [
        "Account source boundaries",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/current-function-boundaries.md"
      ]
    ],
    "related": [
      "recovery",
      "vaults",
      "agents"
    ],
    "code": null
  },
  {
    "slug": "funding",
    "title": "Fund the next operation",
    "summary": "Distinguish provider payment, admitted funding and confirmed account credit.",
    "group": "Account",
    "sections": [
      [
        "Choose the source",
        "Open Deposit in the account. Card funding, original Notes, retained proof objects and physical intake use distinct paths. Selecting a source or uploading an image does not itself create funds or ownership."
      ],
      [
        "Card funding",
        "Choose an amount and review the secure checkout. The flow retains the exact session and unfinished operation. Status must match the original session, amount, currency and receiving account before credit is accepted."
      ],
      [
        "Original Note deposit",
        "Open the original supported Note. The reader verifies its carried proof and recipient binding. Retaining a completed account-destination Note offline is distinct from connected once-only credit; confirm the latter before spending from the account."
      ],
      [
        "Resume, do not duplicate",
        "A lost response leaves an uncertain operation. Reopen its saved reference to check the existing result. Do not infer failure from a timeout or create a second funding attempt to replace an unknown one."
      ]
    ],
    "sources": [
      [
        "Card session and exact-credit validation",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/card-deposit.ts"
      ],
      [
        "Note account deposit contract",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/note-account-deposit-v129.md"
      ]
    ],
    "related": [
      "payments",
      "notes",
      "recovery"
    ],
    "code": null
  },
  {
    "slug": "payments",
    "title": "Approve a payment and retain its receipt",
    "summary": "Resolve the actual recipient, review the amount and keep the financial result connected.",
    "group": "Payments",
    "sections": [
      [
        "Resolve the recipient",
        "Use a supported username, payment request, link or QR. Inspect the actual receiving account and selected amount. A request opens a decision; it is not spending authority."
      ],
      [
        "Review the operation",
        "The existing transfer path binds the requested recipient and amount. Account access and financial approval remain separate. Supported ordinary funding uses Reserve first and Settlement for the remainder while preserving its composition."
      ],
      [
        "Confirm the result",
        "Inspect the actual recorded financial response and receipt. A displayed total or completed interaction does not independently prove success. Keep the reference and its original source relationships."
      ],
      [
        "Recover the exact attempt",
        "If the result remains unknown, use its existing nonce/reference and the same account. A retry must recover that attempt rather than silently issue a new payment."
      ]
    ],
    "sources": [
      [
        "Native payment composition",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/native-payment.ts"
      ],
      [
        "Execution and exact recovery contract",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/bank-execution-recovery-contract.md"
      ]
    ],
    "related": [
      "receiving",
      "records",
      "recovery"
    ],
    "code": null
  },
  {
    "slug": "receiving",
    "title": "Receive by link, button or QR",
    "summary": "Use the supported hosted checkout and confirm the recipient and exact credit.",
    "group": "Payments",
    "sections": [
      [
        "Create the receiving coordinate",
        "Open Receive. Copy the supported payment link, website button or in-person QR. An amount may prefill the request; an editable request is distinct from a trusted immutable merchant order."
      ],
      [
        "Payer review",
        "The hosted page supports its current Card, Balance and Note methods. The payer reviews the actual account, amount and needed funding before authorizing. A link or scan does not bypass approval."
      ],
      [
        "Confirmed result",
        "Provider card completion, account credit and recipient payment are distinct. The hosted flow continues only from its supported confirmation and retains the original attempt for exact recovery."
      ],
      [
        "Fulfillment",
        "A custom merchant integration must verify its trusted order, recipient, amount and recorded result before delivery. The published typed example is the implementation reference; a page return alone is not fulfillment authority."
      ]
    ],
    "sources": [
      [
        "Complete merchant payment reference",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/accept-payments.md"
      ],
      [
        "Typed merchant example",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/examples/merchant-checkout.ts"
      ],
      [
        "Hosted orchestration",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/hosted-checkout.ts"
      ]
    ],
    "related": [
      "integrations",
      "payments",
      "records"
    ],
    "code": null
  },
  {
    "slug": "vaults",
    "title": "Vault authority and deliberate sharing",
    "summary": "Keep private access separate from the proof you choose to show.",
    "group": "Account",
    "sections": [
      [
        "Source and custody",
        "A Vault object preserves the relevant identity, ownership, payload and history. Use the original and its supported verification rather than substituting a title, display or server row."
      ],
      [
        "Protection",
        "Private authority and optional passkey-based protection have their actual encryption and custody rules. Protect the original, its required phrase and the unlocked device. A compromised unlocked environment remains a distinct boundary."
      ],
      [
        "Sharing",
        "Use a deliberately public proof for evidence. Inspect what the disclosure contains. A private original can carry authority and must not be published merely to show someone the account or asset."
      ],
      [
        "Restore responsibly",
        "Identity recovery does not clone protected offline Note custody. Resolve held Notes and unfinished attempts before changing devices or clearing local state."
      ]
    ],
    "sources": [
      [
        "Vault architecture and source boundary",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/current-function-boundaries.md"
      ],
      [
        "Security and operator responsibilities",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/SECURITY.md"
      ]
    ],
    "related": [
      "identity",
      "notes",
      "recovery"
    ],
    "code": null
  },
  {
    "slug": "notes",
    "title": "Original Notes and funding continuity",
    "summary": "Carry the original, preserve its composition and distinguish custody from account credit.",
    "group": "Payments",
    "sections": [
      [
        "Three funded forms",
        "Reserve, Settlement and Settlement Reserve Notes preserve their actual funding composition. A combined Note keeps the exact source split. Denomination artwork or a copied picture does not create an issued Note."
      ],
      [
        "Connected use",
        "Ordinary connected creation uses the current supported issuance path and exact financial authorization. It does not require pretending the browser has qualified protected offline custody."
      ],
      [
        "Recipient and claim",
        "The receiving path verifies the original and recipient binding. A completed account-destination Note may be received and retained offline. Connection reconciles and confirms once-only account credit before account spending."
      ],
      [
        "Protected offline continuity",
        "Continuous offline creation and onward transfer have their distinct protected authority and irreversible-state requirements. Exporting a file, a local lock or a timestamp cannot replace the actual custody proof."
      ]
    ],
    "sources": [
      [
        "Connected Notes",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/connected-notes-v129.md"
      ],
      [
        "Continuity standard",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/note-continuity-standard.md"
      ],
      [
        "Offline qualification",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/offline-notes-release.md"
      ]
    ],
    "related": [
      "funding",
      "vaults",
      "recovery"
    ],
    "code": null
  },
  {
    "slug": "records",
    "title": "Inspect receipts, ownership and history",
    "summary": "Read the source and scope behind the record instead of inferring new authority from a display.",
    "group": "Proof",
    "sections": [
      [
        "Original receipt",
        "Inspect the event participants, amount, temporal coordinate and supporting predecessor relationships. Retain the original when you need to inspect the evidence beyond a current screen."
      ],
      [
        "Source of funds",
        "Original recorded allocations and calculated pooled FIFO attribution are distinct. Where the interface calculates oldest-available-first attribution, the calculation explains the admitted basis without rewriting what the original transfer recorded."
      ],
      [
        "Ownership",
        "Current ownership and supported transitions require their own authority. A previous owner’s historical proof remains history; it does not authorize a new transfer."
      ],
      [
        "Public disclosure",
        "A deliberately shared account proof or public Ledger view has a defined disclosure scope. It does not automatically expose a complete private archive or establish a new spending permission."
      ]
    ],
    "sources": [
      [
        "Receipt and source contract",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/native-assets-and-account-proofs-v129.md"
      ],
      [
        "Public account proof disclosure",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/crystal-public-account-proof-contract.md"
      ],
      [
        "Ledger source contract",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/public-ledger-source-contract.md"
      ]
    ],
    "related": [
      "market-records",
      "vaults",
      "identity"
    ],
    "code": null
  },
  {
    "slug": "recovery",
    "title": "Recover the established operation",
    "summary": "Unknown is a precise financial state. Keep its reference until the recorded result resolves it.",
    "group": "Account",
    "sections": [
      [
        "Before any reset",
        "Keep your identity original, pending references and held Notes. Clearing site storage or removing a device can destroy local recovery or custody material. Resolve financial attempts under their existing contracts first."
      ],
      [
        "Payment or deposit",
        "Reopen the retained attempt with the same identity. Check the exact native result and recipient/amount bindings. Do not automatically generate a replacement transfer, card session or deposit."
      ],
      [
        "Market trade",
        "The saved market attempt retains account, asset, side and client nonce. A lookup returns its recorded or terminal result. A mismatched record cannot release the unknown checkpoint."
      ],
      [
        "Ask for support",
        "Use info@receiz.com with an operation reference, approximate time and the minimum disclosed details required. Never send signing keys, private Identity Records, phrases or full card details."
      ]
    ],
    "sources": [
      [
        "Financial recovery contract",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/bank-execution-recovery-contract.md"
      ],
      [
        "Market attempt retention and lookup",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/market-trade.ts"
      ]
    ],
    "related": [
      "identity",
      "funding",
      "market-records"
    ],
    "code": null
  },
  {
    "slug": "agents",
    "title": "Agents with real identity and continuity",
    "summary": "Use the owner agent and compose additional agents under the existing proof and permission boundaries.",
    "group": "Infrastructure",
    "sections": [
      [
        "Own agent",
        "Bankeiz opens the existing owner agent in the account. It reasons from supported conversation history, configured memories and selected records. The public BJ Twin is a real native conversation with its configured contact and calendar tools."
      ],
      [
        "Additional identities",
        "The infrastructure supports distinct agent proof identities, owner bindings and carried histories through compatible developer tools. The subject protocol is not restricted to one identity. Unlimited identities does not mean unlimited hosted computation or storage."
      ],
      [
        "Across applications",
        "Compatible applications verify and admit the supported identity and history. Tool access remains explicitly authorized in each environment. Private information is not universally accessible merely because the agent has continuity."
      ],
      [
        "Action authority",
        "The model may reason, answer and propose. A payment, publication or other consequential operation still uses its actual supported authorization and execution contract. Agent output does not create owner authority."
      ]
    ],
    "sources": [
      [
        "Existing owner Twin integration",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/native-twin.ts"
      ],
      [
        "Native conversation bridge",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/server/cooperative-conversation.mjs"
      ],
      [
        "Published agent infrastructure",
        "https://receiz.com/developers/install"
      ]
    ],
    "related": [
      "sdk",
      "mcp",
      "ai-skills"
    ],
    "code": null
  },
  {
    "slug": "integrations",
    "title": "Integrate the receiving standard",
    "summary": "Begin with one supported operation and preserve its exact authority and evidence.",
    "group": "Infrastructure",
    "sections": [
      [
        "Choose the role",
        "A receiver, issuer, custodian, verifier and application operator have distinct responsibilities. Define the source, exact units, receiving identity and result before implementing an operation."
      ],
      [
        "Use the supported composition",
        "Reuse the versioned SDK, MCP and AI Skills. Do not build a second ledger, issuer, verifier or authority layer when the existing primitive carries that boundary."
      ],
      [
        "Payments first",
        "The merchant reference covers hosted and embedded payment routes, trusted orders and confirmation. Retain each session against its order so a closed tab does not create duplicate funding."
      ],
      [
        "Qualify the result",
        "Run the applicable conformance checks, expected refusals and recovery cases. Fixture tests and a successful build do not independently qualify live funds, an external host or protected physical custody. Publish the assessed capability and evidence scope."
      ]
    ],
    "sources": [
      [
        "Receiving kit",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/README.md"
      ],
      [
        "Standard",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/receiving-standard.md"
      ],
      [
        "Merchant composition",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/accept-payments.md"
      ],
      [
        "Qualification requirements",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/qualification.md"
      ]
    ],
    "related": [
      "sdk",
      "mcp",
      "receiving"
    ],
    "code": null
  },
  {
    "slug": "sdk",
    "title": "Compose with the Receiz SDK",
    "summary": "Use the pinned application primitives, exact source admission and documented interfaces.",
    "group": "Infrastructure",
    "sections": [
      [
        "Install the coordinated version",
        "This Bankeiz implementation pins @receiz/sdk 129.0.0 with the coordinated MCP and AI Skills packages. A package version establishes source compatibility, not proof that an arbitrary host has deployed every capability."
      ],
      [
        "Verify before projecting",
        "Admit the enclosing artifact through its supported verifier and identity context. Parse embedded projections beneath that admitted source. A self-hashable subpayload is not a substitute for the enclosing stronger proof."
      ],
      [
        "Compose one operation",
        "Use the applicable existing account, payment, Note, ownership or subject API and its scoped consent. The merchant example and schema reference show exact inputs and supported lifecycle."
      ],
      [
        "Retain and recover",
        "Keep the original prepared operation and its reference. Bind responses to the intended identity, asset, amount and predecessor. Unknown outcomes retain their exact recovery path."
      ]
    ],
    "sources": [
      [
        "SDK formats and schemas",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/public-sdk-schemas.md"
      ],
      [
        "Typed payment example",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/institution/examples/merchant-checkout.ts"
      ],
      [
        "Infrastructure setup",
        "https://receiz.com/developers/install"
      ]
    ],
    "related": [
      "mcp",
      "ai-skills",
      "integrations"
    ],
    "code": "npm install @receiz/sdk@129.0.0"
  },
  {
    "slug": "mcp",
    "title": "Expose supported operations through MCP",
    "summary": "Give compatible clients the implemented tools without making the client a new authority.",
    "group": "Infrastructure",
    "sections": [
      [
        "Install the coordinated tooling",
        "Use the @receiz/mcp-server version coordinated with the SDK. The package exposes its receiz-mcp command. Configure the documented source and identity custody for the actual host."
      ],
      [
        "Inspect the tool inventory",
        "Read the current installation reference and tool schemas. Different operations have different source, permission and confirmation requirements. A generic client connection is not blanket access to private account state."
      ],
      [
        "Keep execution bounded",
        "Reads use their supported scopes. Consequential writes require their exact source and authorization. The client or model cannot substitute an invented signature, boolean confirmation or alternate ledger."
      ],
      [
        "Verify the actual host",
        "Exercise an intended operation and its refusal/recovery paths against the selected runtime. A local package install alone does not prove remote deployment or hosted tool availability."
      ]
    ],
    "sources": [
      [
        "MCP installation and tools",
        "https://receiz.com/developers/mcp"
      ],
      [
        "Integration and assessment",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/conformance/integration-and-assessment.md"
      ]
    ],
    "related": [
      "sdk",
      "ai-skills",
      "agents"
    ],
    "code": "npm install @receiz/mcp-server@129.0.0"
  },
  {
    "slug": "ai-skills",
    "title": "Work from the native AI Skills",
    "summary": "Use workflows grounded in the same identity, source and exact-operation contracts.",
    "group": "Infrastructure",
    "sections": [
      [
        "Use the coordinated package",
        "The implementation pins @receiz/ai-skills with the matching SDK and MCP release. Skills describe how to compose supported primitives and their evidence boundaries."
      ],
      [
        "Begin with the task",
        "Select the applicable identity, proof, receiving, ownership, subject or payment workflow. Supply the actual source and required identity proof rather than only a display or a guessed identifier."
      ],
      [
        "Keep model and authority distinct",
        "An AI answer can explain or propose. The native verifier, owner authority and exact execution predicates determine whether an operation is admitted and recorded."
      ],
      [
        "Carry the result",
        "Keep original sources, receipts and operation references. Continue from supported history; do not start over by silently replacing a previously admitted identity or financial attempt."
      ]
    ],
    "sources": [
      [
        "Coordinated installation",
        "https://receiz.com/developers/install"
      ],
      [
        "Open implementation",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/README.md"
      ]
    ],
    "related": [
      "sdk",
      "mcp",
      "agents"
    ],
    "code": "npm install @receiz/ai-skills@129.0.0"
  },
  {
    "slug": "market-trading",
    "title": "Buy or sell a supported position",
    "summary": "Inspect the original, understand the advisory quote and retain the actual executed result.",
    "group": "Market",
    "sections": [
      [
        "Before the review",
        "Inspect the asset’s original, offered rights and supported share units. Authorship, current ownership, copyright, physical custody and funded backing require their own evidence."
      ],
      [
        "Prepare the trade",
        "Buy ownership uses the supported purchase amount. Take cash uses a supported amount or share quantity within the held position. The native quote binds the selected request but is advisory rather than an executed price lock."
      ],
      [
        "Approve and execute",
        "The exact review binds the account, asset, side and request. The current market operation records the actual quantity and financial result. Card funding, if used, has its separate consent and credit path."
      ],
      [
        "Unknown result",
        "Keep the original nonce and saved request. Recover the same attempt before a new trade. A completed illustration or changed screen is not evidence of execution."
      ]
    ],
    "sources": [
      [
        "Quote, exact confirmation and trade execution",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/market-trade.ts"
      ],
      [
        "Current supported market boundaries",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/docs/current-function-boundaries.md"
      ]
    ],
    "related": [
      "market-records",
      "funding",
      "records"
    ],
    "code": null
  },
  {
    "slug": "market-records",
    "title": "Read a position and recover its trade",
    "summary": "Separate a portfolio observation from ownership authority and recover the same original attempt.",
    "group": "Market",
    "sections": [
      [
        "Position fields",
        "The current view presents held shares, cost basis, supported current value and recorded trade dates. Trades can carry execution price, fees, financial result and realized profit/loss when supplied."
      ],
      [
        "Price and performance",
        "Current public price and last recorded Market price have distinct source roles. Unrealized return compares current holding value with remaining cost basis. Purchases and sales also move the chart’s total."
      ],
      [
        "Exact recovery",
        "A retained trade is looked up under the same account and client nonce. Recorded results must match the market item, side, quantity and original attempt. Foreign or mismatched data cannot close an unknown operation."
      ],
      [
        "Authority behind the view",
        "Portfolio data is a market observation for display. It is not a new ownership admission, balance or execution authority. Original ownership and financial evidence keep their own contracts."
      ]
    ],
    "sources": [
      [
        "Portfolio observation model",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/market-portfolio.ts"
      ],
      [
        "Investment presentation",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/features/assets/OpenInvestment.tsx"
      ],
      [
        "Trade lookup and validation",
        "https://github.com/kojibai/reality-grade-banking/blob/6c5d582/src/receiz/market-trade.ts"
      ]
    ],
    "related": [
      "market-trading",
      "recovery",
      "records"
    ],
    "code": null
  }
];
