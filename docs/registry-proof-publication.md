# Registry proof publication

The Registry uses the installed Receiz SDK’s public publication and lookup rails. It requires no separate Redis service, application database, server signing key or publication token. A person submits an institution’s public passing Original from its expanded record, authorizes publication with their own existing device-held Identity Record, and receives a scoped PASS only after native acceptance and public readback.

## Proof and institution association

The existing canonical conformance opener verifies the exact PNG, native holder continuity, carried source, complete passing transcript and reproduced artwork. Institution name, holder, scope, build, evidence digest and artifact digest must agree. A passing Public integration contract retains that exact scope.

Existing Originals bind a holder rather than an official corporate domain. The identical Original is therefore checked at this fixed address on the institution’s listed official HTTPS origin:

```text
https://<listed-official-origin>/.well-known/reality-grade-banking/conformance.png
```

This automatically associates the institution with that proof; it is not another conformance test or a manual approval queue. Bankeiz retains the known holder binding of its published Original and its separate reference evidence.

## Native publication and authorization

The application composes the installed `publicStore.signPublish` and `publicStore.publishSigned` SDK operations, with `appState.byNamespace` and `appState.byId` for public recovery. These are the existing public app-state rails documented for directories and other applications without a separate database.

Native projection schemas follow the hosted app-state contract: `receiz.app.bank.registry.original-part.v1` and `receiz.app.bank.registry.original-index.v1`. Transport addresses and namespaces remain independently versioned. Native schema or authorization refusals are reported as refusals; unavailable transport and unresolved acknowledgements remain unconfirmed.

Signing happens only after the explicit upload action. The SDK verifies and admits the already-held Identity Record, checks the admitted publisher and its public key, and signs the exact public transport. Private Identity Record bytes, private keys and phrases remain on the device. No identity is created, replaced or enrolled by publication. A missing publisher identity produces an authorization refusal rather than a false conformance failure. The publisher may differ from the credential holder: publishing a public fact does not transfer or reseal the Original’s ownership.

The optional **Check publisher** control admits the existing Identity Record read-only and displays its public Receiz ID. It does not sign, publish, enroll or create an identity. Once checked, that upload attempt requires the same publisher; a changed identity is refused before signing or transport.

The generic MCP `receiz_app_state_publish` adapter uses existing delegated Receiz authority. It does not replace the SDK’s device-held identity signing boundary. AI Skills identify the supported operations and required evidence; MCP, skill text, metadata and database projections are never conformance authority.

## Exact Original transport and history

An Original of up to 4 MiB is carried unchanged in content-addressed parts of at most 128 KiB before base64 encoding. Actual SDK envelope measurements establish that this stays inside the native feed’s 2 MiB limit, including the canonical signed challenge and duplicate feed representation. Up to 32 parts preserve the complete file.

Part identifiers bind institution, artifact SHA-256, publisher key and source order. Independent random transport coordinates for each part and index prevent another publisher from preoccupying predictable source identifiers. The coordinates stay fixed in the retained publication intent; verified Originals are deduplicated by their actual artifact hash. The native index is published last, after every part can be recovered, the complete source hash matches, and canonical proof and institution admission pass. A metadata-only projection, partial source, altered part, foreign namespace or invalid signature cannot provide PASS.

The server stores no independent publication database. It uses the existing SDK transport and reopens newly discovered complete Originals before projecting results. Previously admitted exact source and selected history are reused. Official publication selects an external institution’s current Original; timestamps never replace that association. Earlier independently verified certificates from the same established holder remain inspectable. An old retry cannot remove already-held history or replace the selected current proof.

## Interrupted publication and public rendering

The device retains only the exact public signed requests in a dedicated publication-intent CacheStorage entry before transport. An uncertain outcome is reported as unconfirmed. Explicit retry first checks the public record and reuses the same retained envelopes and deterministic identities; it does not silently create a new signature or replace the Original. Public download reconstructs and hashes the exact file.

Canonical HTML includes independently admitted native records, counts and evidence for non-JavaScript readers. The available header and hero stream before a bounded saved-publication read. Held accepted display and its public history survive offline reopening through the separate display cache. Neither page opening nor cached display acquires financial authority or changes account entry.

## API and checks

- `GET /api/bank/registry` reads accepted native publications.
- Raw PNG `POST /api/bank/registry/<institution-id>?prepare=1` verifies the Original and returns a publication plan, without publishing PASS.
- Signed JSON `POST /api/bank/registry/<institution-id>/parts` publishes a bounded public source part.
- Signed JSON `POST /api/bank/registry/<institution-id>` admits the complete Original, publishes its native index and confirms public recovery before returning the accepted entry.
- `/api/bank/registry/original/<institution-id>/<sha256>` serves the exact recovered Original.

Browser writes are same-origin. `node scripts/build-registry-publisher.mjs` builds the lazy device SDK module; `node scripts/check-registry-runtime.mjs` checks the emitted server in an isolated root with real Original verification and fixture native reads. The SDK signature and publication suites separately exercise genuine identity admission, signature verification, part/index ordering, conflicts, retained history, cold recovery and lost acknowledgements. Fixture results are not evidence of a live hosted publish. A live completion claim additionally requires the actual publisher’s native publish, public readback and another visitor’s rendered result.
