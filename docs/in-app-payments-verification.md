# In-app flow qualification — 2026-10-13

The original bank UI/flow is the reference. No routed Deposit, Send or Receive opens receiz.com/wallet. No demo reducer or fabricated balance participates.

## Actual registration and observed shared read

User explicitly approved a replacement public Receiz Bank client, existing read scopes plus receiz:payments.create/read, and bank.receiz.com/local callbacks. The first attempt to prepare the form was rejected by automatic approval review as an access-boundary change. After exact user approval, the same form path succeeded. Observed client **rc_ELkGAUBINd9Nw4bE5zMqUsgc**: active/public/token auth none/no secret; openid, profile, payments.create, payments.read, reserve.read, settlement.read, wallet.read. Callbacks: https://bank.receiz.com/auth/receiz/callback and http://127.0.0.1:4173/auth/receiz/callback, http://127.0.0.1:5173/auth/receiz/callback. The original read-only client remains active; old sealed application coordinates are preserved.

At 17:28:25 local the user's genuine held ID restored and a protected shared-wallet read under the new client displayed $0.00 without error. Agent did not create signing credentials, create a card checkout, pay, transfer, accept custody, trade or issue currency.

## Implemented paths

- Enter / Use existing account and centered Create your account. Phrase input/backup is conditional on actual SDK key metadata. No-phrase imports protect the same existing key locally, preserve owner/public key/carried history, canonically seal/re-admit a protected transport copy, and transmit only that encrypted key/source. The original no-phrase backup is unchanged. Same-key encryption is tested with genuine SDK-generated fixture signing/verification; live full no-phrase import/reseal remains unobserved.
- Private source/phrase/protected transport/unfinished checkout use non-exportable AES-GCM custody. Older vault records remain readable. Known wallet observations bind exact source digest/key/app and paint read-only before canonical reopening; all controls remain disabled until actual identity admission. Observations never fund transactions. New/imported entry awaits its initial source read, with explicit failure rather than invented zero.
- Original Deposit chooser: asset, dollars, proof. Asset details and attachment become an actual SDK owner-bound sealed intake request, locally reverified and encrypted. Custody remains awaiting receipt/instructions. Original proof import uses SDK artifacts.verifyAndOpen and exact owner correspondence, preserving full bytes. Assets reopens those exact held sources, not local invented ownership quantities.
- Dollars compose SDK connect.checkout with exact USD and embedded mode, then embed Receiz's existing /payments/embed/checkout runtime using its native window.name bootstrap. No direct Stripe API/package or card details in bank custody. Sender/account/amount/session checks precede reported credit; checkout status remains a compatibility observation beneath enclosing proof. Shared wallet refresh never changes a shadow balance. Card fields/SCA completion and actual paid Reserve credit still require a human-run qualification.
- A creating/ready card checkpoint is encrypted before/after session creation. Atomic private storage admits only one concurrent start. Unknown response retains its exact reference and blocks another start; no automatic retry. Same session reopens after reload. Terminal native statuses clear the checkpoint. A provider return only signals a private SDK status check; messages require matching source window, origin and session and never assert success themselves.
- Receive generates a bank.receiz.com public request URL, optional display dollars, standard QR, share/copy, and user-operated NDEF URL tag writing. Shared links prefill Send after ID opening. Camera/image QR scanning uses native BarcodeDetector when supported and offers manual/native-camera link entry otherwise. NFC is capability-detected; no claim of universal NFC or card-terminal payment. Discovery never executes money.
- Send retains value/ownership/recipient/rail/review surfaces. Final native financial execution is unfinished and disabled. Owned fractional transfer, sale/buyback, issuance and native committed recovery remain unfinished.

## Verification evidence

The 390×844 real preview Deposit chooser and dollar methods stay in the bank. Receive rendered its actual public account QR, share/link/NFC controls, with document width390 and dialog width352. Actual card details/Continue, camera permission and NFC writing were not operated by the agent.

QR complete matrices were independently compared against qrcode at version9/L/byte/mask0, for a request URL and the full230-byte boundary: zero mismatches. Golden vectors are committed; that package is not a bank runtime dependency.

Isolated localhost5199 browser fixture checks passed: exact private bytes reopen; source encrypted/non-exportable custody; exact private read observation; fast paint bound to same source; exact private source retained; only one of concurrent checkout starts; unknown start retained; late observation cannot revive removed custody; former-source write rejected after replacement. A second reproducible run also passed late terminal result/newer-attempt isolation. The fixture is tests/browser/private-vault.html, served only on an isolated test origin. Fixture dummy bytes/observations create no canonical identity, financial account or funding. Actual4173 identity/custody was untouched. Temporary test tabs/servers and the original scratch file were cleaned up.

Protocol tests cover exact checkout/status amounts, foreign account/session refusal, no automatic transfer from requests, NFC public URL only, transport path/query allowlist, conditional phrase, same-key protection and settled first paint. These tests do not qualify a deployed native financial execution.

## Remaining qualification and operator dependencies

No production deployment. Cross-device QR/NFC URLs target the supplied bank.receiz.com domain but require the bank deployment. Incoming wire routing instructions and physical custodian identity/delivery destination are not supplied. Native source publication/session/recipient/atomic execution scopes and source-bound material are not connected. The actual connect.transfer compatibility route requires real conversation membership; the bank does not invent it or bypass the current native source laws. Public showcase listings cannot be treated as executable offers/funding.

The connected marketplace MCP remains nonfinancial128, separate from installed SDK/MCP/AI packages129; no profile swap or agent-executed money action was used. Complete SDK primitives do not by themselves prove operational deployment or custody. The full bank objective is unfinished.

Final implementation checks before review: 133 tests in38files passed; TypeScript and production build passed. No chunk-size warning after retaining dynamic SDK loading.
