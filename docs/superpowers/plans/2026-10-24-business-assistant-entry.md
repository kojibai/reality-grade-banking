# Business assistant entry

Authorized behavior: a Get Business click opens the retained identity, or creates a local Receiz ID when restore proves none exists, selects Your assistant, submits one opening question and presents the existing upgrade review through the response.

Primitive affected: Receiz ID continuity, private messaging, subscription payment review. Existing authority: useNativeAccount → restoreNativeIdentity/createNativeIdentity; MessagesPanel → retained access questions or native twin.ask; TwinUpgradePanel → existing upgradeTwin. No new identity, permission, billing, or session authority.

Source of truth: existing sealed identity and held account, existing messaging display and acknowledged Twin replies, verified billing access. No DB/session truth replaces these.

Risks: identity-risk, session-risk, money-risk and first-paint-risk are confined to the explicit /#account/messages/business intent. Ordinary Enter, import, PBI and public first paint remain frozen. Restore errors must not trigger creation. A message must not cross identity replacement or resend after hide/reopen. No account records are auto-selected.

Contracts: new hook tests cover restore/create ordering, reuse, restore error, once-only attempt, navigation cancellation and owner replacement. Messages tests cover forced assistant view, one local unpaid opening/offer, explicit permission reuse, paid once-only native request with existing recovery, and payment-review action. Existing entry, route, messaging and billing tests must remain green.

Sequence: tests first; implement explicit intent and hook; compose with App; reuse existing messaging submit path for the initial request; refine the local offer; run targeted tests + main frozen-entry gate + build; inspect synthetic desktop/mobile browser flow without live account/messages/payments; commit only this work.

User's final visual law: Get Business ends directly in Your assistant's existing payment review, scrolled to its bottom action. Opening question remains available behind Back. Do not show the monthly AI credits line in this review. The one-time scroll must not fight later scrolling, and no checkout request runs until Continue is clicked.
