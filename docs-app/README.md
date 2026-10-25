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

`content.mjs` is the authored documentation source. The main repository re-exports it for tests and the `/docs/` mirror. The main build's mirror uses the same canonical URLs at docs.bankeiz.com. After the separate domain is live, configure matching permanent redirects from bankeiz.com/docs/ and its article paths to the primary docs URLs. Keep the mirror until the domain is confirmed working; do not redirect users to an unavailable domain.

Revise documentation with the operation it describes. Search filters locally without requests. Source links point to the corresponding implementation. Generated dist, dependencies and local Vercel settings are excluded from corresponding-source archives.
