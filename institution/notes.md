# Accept, hold, transfer and deposit notes

This guide describes the existing native **Reserve Note** flow. A note image is a carrier for complete sealed sources. Its pixels and printed amount do not authorize value. Settlement Note artwork exists, but its distinct signed allocation/credit extension is [not implemented](../docs/settlement-note-contract.md).

## Receiver workflow

1. Open the receiver's verified Identity Seal and bind the correct application, account and origin. Qualify the supported hardware custody adapter. A software key is not a substitute for required device attestation.
2. Create the exact native receiving request on the receiving device. Keep its pending custody state durably under that identity; export only the public request for the holder.
3. The holder independently opens that request and the exact current funded note, reviews the receiver/amount, then approves the native qualified custody transfer. The note's physical underlying backing does not move as a consequence of an image copy.
4. The holder saves and sends the **updated original PNG** carrying the resulting complete sources. The previous image does not become current receiving custody.
5. The receiver reopens the updated exact PNG under canonical roots. Verify note/funding linkage, original denomination, current qualified receiving commitment, terminal status and retained pending request. Do not show an available balance from a read-only inspection.
6. To hold a whole note, preserve its native qualified custody and exact sources. To send it again, require another receiving request and qualified exact-head handoff. An institution's database cannot mint equivalent native custody.
7. To deposit into spendable Reserve, obtain the authenticated native redemption preview before irreversible consumption. Review the exact original dollar denomination and account. Consume the current note through the native terminal transition, submit the complete terminal/funding evidence, and recover the same once-only credit. Independently verify the admitted receipt before projecting success.
8. Retain the original funding, transfer, terminal and credit sources plus exact recovery intent. Resolve an unknown outcome before attempting anything new. A miss from an observation endpoint is not proof that funding or redemption never committed.

The Bank's selected rule is redemption of the **original funded dollar denomination**, with the corresponding fixed native Phi obligation accounted for by the qualified allocation/credit path. Do not silently reprice redemption using a later display rate. The signed native proof and its exact accounting semantics control, not prose or a printed dollar amount.

## Reference implementation

| Responsibility | Bank source |
| --- | --- |
| In-app creation, receiving, transfer and deposit sheets | [`OfflineNotes.tsx`](../src/features/notes/OfflineNotes.tsx) |
| Exact pending intent, source custody, native lifecycle composition | [`offline-notes.ts`](../src/receiz/offline-notes.ts) |
| Verified identity/native transport | [`native-identity.ts`](../src/receiz/native-identity.ts) |
| Bound attestation transport and ephemeral challenge tickets | [`note-attestation-transport.ts`](../src/receiz/note-attestation-transport.ts) |
| Original PNG save/share, cancellation and byte preservation | [`save-note-image.ts`](../src/features/notes/save-note-image.ts) |
| Matching presentation, never financial authority | [`note-design.ts`](../src/receiz/note-design.ts) |
| Independently inspect complete carried sources | [`receiver-verifier.entry.mjs`](receiver-verifier.entry.mjs) |

The Bank's embedded native runtime is checked in under `public/native/offline-notes.v129.mjs` with its hash manifest. Its host source is recorded by the rebuild workflow. Do not substitute locally invented allocation records, accept a service row as a sealed source, or reconstruct an opaque native handle from JSON.

## Production access is receiver-specific

The Receiz hosted offline-note composition admits the dedicated public Bankeiz client `rc_2d1wcGkAYfmCi5kGT3J89gkl` only at its registered `https://bankeiz.com` origin. The previous Bank client `rc_uV6aT6wZJCQDspB0_SJ1DcEm` keeps its own explicitly allowed, registered realms. It is **not a general public custody or redemption API**. Its private calls require the verified account grant, including wallet read and Reserve write, and current qualified custody.

A new institution must register its own application and receiving realm and obtain an explicitly authorized native composition. It must bind its own recipient accounts, custody, origin, consent, funding/backing policy and exact credit process. Do not impersonate the Bank's ID or weaken origin checks to make a test pass. Public artifact verification is independently usable; private production service permissions are separate.

Existing native Bank host routes cover custody attestation, funding allocation/recovery and redemption preview/terminal/recovery beneath `/api/connect/offline-notes/`. They are implementation references, not a promise of access for arbitrary registered clients. The existing [host release prerequisites](../docs/offline-notes-release.md) still apply.

## Transport and image requirements

Maximum original PNG: **8 MiB**. Maximum packed API wire: **4 MiB**. Maximum expanded clear proof transport: **32 MiB**. Preserve the existing bounded lossless packing and decompression rules. An image share or photo editor may strip proof chunks; deposit the original exported PNG, not a screenshot or recompressed copy.

The full engraving is 3240 × 1944 pixels at 600 DPI metadata, with a compact preview embedded separately in the native payload. The renderer does not sign, allocate, credit or change the note denomination. First-use artwork asset availability is separate from qualified offline financial operation.
