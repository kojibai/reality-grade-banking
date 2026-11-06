# Registry proof publication

The Registry accepts a public passing conformance Original from an institution's expanded record. An accepted submission updates its shared record automatically for the Original's exact assessed scope. There is no manual approval queue, new account, private Identity Record upload or financial action.

## What is verified

The server reuses the existing sealed conformance opener and installed SDK. It verifies the canonical PNG seal, native holder continuity, carried source, complete passing test transcript and reproduced certificate artwork. The institution name and exact implementation build must match the published assessment. A passing public integration contract remains that scope; it does not become a claim of production receiving qualification.

Existing Originals bind their holder but do not independently bind a corporate name or website. To establish that association automatically, the institution publishes the **identical Original** at this fixed address on its listed official HTTPS origin:

```text
https://<listed-official-origin>/.well-known/reality-grade-banking/conformance.png
```

The server chooses that origin from the curated directory, refuses redirects, and compares the complete Original's SHA-256. This convention establishes the institution's publication of that exact proof. It is not an additional conformance test. Bankeiz retains the known holder binding already used for its published Original. Anyone may submit an institution's already-public qualifying Original; its private identity never needs to leave the institution.

Only a fully verified, institution-associated Original reaches the accepted publication store. The Original and record are saved before the HTTP response reports success. Invalid evidence, unavailable official publication or a storage failure does not change a FAIL to PASS.

## Durable production configuration

The server requires a Redis HTTPS REST endpoint compatible with the Upstash command API and `EVAL`. Set these **server-only** environment variables:

```text
REGISTRY_REDIS_REST_URL=https://<redis-rest-host>
REGISTRY_REDIS_REST_TOKEN=<server-write-token>
```

Do not use `VITE_` prefixes or expose the token in public documents. Use a dedicated persistent database with sufficient request capacity for a 4 MiB Original encoded as base64, no data eviction, and appropriate backups. The server never sets an expiration on accepted records or Originals. Deployment and store provisioning are separate from local implementation; an unconfigured deployment cannot publish new accepted records.

The adapter sends a single Lua `EVAL` command to append the Original and its public record atomically. Keys use the `{bank.registry.v1}` cluster hash tag. A distinct accepted proof increments the institution revision and retains its preceding record in history. Repeating an already-accepted hash returns the current state without changing the first acceptance time, duplicating history or promoting an old proof over a newer one. Original download verifies the saved bytes against the requested SHA-256.

The REST envelope and Lua semantics follow the official [Upstash REST API](https://upstash.com/docs/redis/features/restapi), [Upstash EVAL reference](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval) and [Redis scripting documentation](https://redis.io/docs/latest/develop/interact/programmability/eval-intro/).

With explicit `NODE_ENV=development` or `NODE_ENV=test` only, the adapter writes one atomic snapshot per institution beneath `.registry-data/`. A snapshot contains its record, complete history and exact Originals. Reopening the local server reads those saved records. This directory is ignored by Git and is never selected with an unspecified environment, in production or on Vercel. It is not a production storage fallback.

## Public projection and recovery

The canonical Registry response streams the existing header and hero immediately, then renders accepted scoped records, counts and history as ordinary HTML for people and crawlers without JavaScript. It reads only saved, already-admitted display metadata, never Source freshness, private identity or proof verification during page opening. A stalled saved-metadata read has a two-second bound and displays the existing snapshot with an explicit notice. Static build and offline documents remain available.

The public Registry reader applies accepted revisions in the background. Successful uploads update the durable accepted record before changing the visible entry, exact scope, counts and search filters. Earlier accepted evidence remains inspectable. Selected public metadata is retained in a dedicated display-only CacheStorage entry so offline reopening can preserve a previously accepted result. Cache or background responses cannot replace a higher selected revision or discard its accepted history. Cached display supplies no admission or financial authority.

Definitive verification refusals preserve the public record. A lost acknowledgement or timeout leaves publication uncertain: the interface checks the public record and allows retrying the same Original. It does not assert that a possibly completed save never happened. The append is keyed by institution and exact artifact hash, so retrying is safe. Never substitute a browser-only PASS, runtime map or serverless temporary file for accepted public persistence.

The cookie-free API exposes `GET /api/bank/registry`, raw PNG `POST /api/bank/registry/<institution-id>`, and immutable exact Original downloads at `/api/bank/registry/original/<institution-id>/<sha256>`. Browser writes require the page's own origin. The production function, Vite handler and compiled runtime check use the same implementation. Run `node scripts/check-registry-runtime.mjs` to exercise the emitted function with the real published Bankeiz Original in an isolated local store; it performs no external publication.

The Registry's records describe conformance evidence. They supply no payment authorization, account credit, ownership transfer or financial authority.
