# Reality-grade banking documentation

## Deploy this folder on Vercel

Create a **separate** Vercel project from the same repository:

- Root Directory: `docs-app`
- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`
- Domain: `docs.bankeiz.com`
- Environment variables: none required for this static documentation build.

`vercel.json` supplies the build settings. The project is self-contained and uses Node built-ins only; it does not need the banking app's dependencies, credentials, APIs or parent files. `npm run build` works from this folder alone. `npm run preview` serves http://127.0.0.1:4321.

## One canonical source

`content.mjs` is the authored documentation source. The main repository re-exports it for tests and the `/docs/` mirror. The main build's mirror uses the same canonical URLs at docs.bankeiz.com. The subdomain is live. The main project's `vercel.json` now permanently redirects `bankeiz.com/docs` and `/docs/*` to the matching primary docs URLs; deploy the main Bankeiz project to activate those rules. The generated mirror remains available for local and offline use. The docs project itself has no cross-domain redirect, so article navigation stays on docs.bankeiz.com.

Revise documentation with the operation it describes. Search filters locally without requests. Source links point to the corresponding implementation. Generated dist, dependencies and local Vercel settings are excluded from corresponding-source archives.


## Manual structure and public formats

The manual contains 45 sourced articles in ten subject groups and six reading paths. All seventeen originally published article URLs remain available. `articles/*.mjs` holds the authored chapters; `content.mjs` assembles them, `renderer.mjs` renders semantic static HTML, and `markdown.mjs` renders the same content for export. `examples.mjs` is the single source for the downloadable SDK/MCP examples.

The build publishes a Markdown copy at every article's `index.md`, an `articles.json` public content index, `llms.txt`, `llms-full.txt`, `sitemap.xml`, and read-only local example files. Documentation JSON is public explanatory content, never identity, proof admission or financial authority. Search uses one in-document text index and the local 1.2 KB script; it makes no network requests and searches paragraph, table, step and example text. Reading does not load the Bank application or inspect an account.

The reviewed edition and pinned source revision are explicit in `articles/shared.mjs`. Every article must carry at least five substantive sections, current source links, useful onward routes and precise operation boundaries. Tables have captions/headers; code is escaped; local links and anchors are validated in both standalone and mirrored builds. Adding an article requires an existing subject group, a unique short slug, valid related topics, and source-backed statements. Never infer live financial/device qualification from a package install, schema or synthetic test.

From the Bank repository root, the local examples can be exercised against the pinned dependencies without identity or money. From an independent project, install the documented package versions first. The no-money checks create sandbox evidence only; they do not qualify a production receiver.
