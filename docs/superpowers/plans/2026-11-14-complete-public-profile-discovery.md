# Automatic public-profile discovery

Public profiles already exist. Feed the existing public-profile list into Discover automatically, including email-created accounts with no Originals. Preserve existing profile pages, account entry, asset publication, SDK, MCP and AI skills.

The approved Receiz application endpoint returns current public profile descriptors and the existing public card projection in bounded UID-keyset pages. Bankeiz adds those cards to the existing shared catalog in the background. No manifest/Original fanout is needed for new public cards. Profile details continue through the existing profile reader.

The active Discover observer refreshes through the existing lifecycle, starts each pass at the first UID, and reuses unchanged held metadata and actual Source ETags. New public profiles therefore need no redeploy, generated profile page or manual refresh. Explicit privacy refusals, exact owner bindings, known PBI/artwork, existing Originals, pricing and history are retained.

The one-time full profile capture was verification only. It is not a production update step. Its shipped input and all profile-page computation/storage experiments were removed after scope clarification. No profile-page or asset-flow changes are part of this patch.

Validation covers multi-page zero-Original accounts, later additions before an old cursor, no manifest fanout for new cards, privacy, changed handles, concurrent shared updates, lossless existing-cache retention, bounded visible artwork, no duplicate membership downloads, frozen entry, production build and compiled-browser automatic additions/cold reopen. Local, committed, CI and deployment evidence remain separate.
