# Document and agreement page intent

15 November 2026. Qualitative search-language and implementation note for the two new public entrances. Google Search Console data is still processing; no measured keyword volumes, ranking forecasts, first-page guarantees or competitor-exclusivity claims informed the copy.

| Route | Reader intent | Specific content |
| --- | --- | --- |
| `/ai-documents/` | Create a useful document with AI; choose PDF, Word, Excel or PowerPoint | Private or relationship drafting; sections and tables; real file formats; review before sharing; the existing six-screen proposal-to-next-conversation sample and actual generated sample PDF |
| `/sign-agreements/` | Prepare an agreement, review all its terms and give an electronic signature | Full agreement in the conversation; complete PDF and terms; explicit consent; each party signs with their own Receiz ID; complete signed consent Original retained with its original agreement |

Both pages lead with the approved identity of the product: an AI counterpart, called a Twin, is an AI version of the owner with their history and context, able to speak and work on their behalf when the owner chooses. Document generation and signing are parts of that continuing relationship. The copy distinguishes retained history from the selected recent excerpts supplied for an individual draft.

## Primary-source language check

- Adobe’s [online PDF signing page](https://www.adobe.com/acrobat/online/sign-pdf.html) uses familiar reader language around signing a PDF, an electronic signature, reviewing a file and downloading or sharing the result. This supports a concrete agreement/PDF entrance instead of an abstract technical signing title.
- Docusign’s [eSignature product page](https://www.docusign.com/products/electronic-signature) connects electronic signatures with agreements and records. Its [product directory](https://www.docusign.com/en-gb/products) distinguishes agreement preparation, document generation, signing, identity verification and payments. The Bankeiz pages likewise describe these as separate user choices.

These are observations of official product language, not search-volume measurements or evidence that Bankeiz has the providers’ capabilities. The pages make no universal enforceability, KYC, biometric/PBI signing, exact voice-clone or delegated AI legal/financial-authority claim. No legal interpretation was needed or added. Each person approves their own agreement signature; a chat acceptance, payment receipt or identity enrollment is not presented as that consent.

## Source and delivery boundaries

- The supported document formats come from `src/receiz/business-document.ts`: PDF, DOCX, XLSX and PPTX with the reviewed authored text and tables. There is no promise to reproduce an arbitrary external document or calculate an invented financial workbook.
- The signing description follows `src/receiz/document-consent.ts`: exact original bytes, complete terms, explicit consent and the signer’s Receiz ID signature enclosed in a native Original. The public page uses an indexable three-step explanation; it does not invent a signed demonstration.
- `src/content/agreement-pages.mjs` owns page text and visible FAQ pairs. Metadata uses those same pairs. The existing metadata registry supplies canonical links, social metadata and sitemap membership.
- `scripts/agreement-pages.mjs` renders complete initial HTML with the existing Bank design. The document page reuses the actual six-screen proposal sample. The signing page needs no sample JavaScript to explain its steps. Every main call to action opens `/#account/messages`.
- Both new pages link to Business, proposals, client communication and each other. The existing proposal and client-communication pages link back to both new entrances. Existing social-image generation creates their distinct, digest-named sharing cards; no Google code or app preload is added.

Focused source/template and metadata tests, social-generation consistency checks and syntax checks are local evidence. Compiled-page mobile review, the final production build, GitHub CI and any deployment remain separate verification steps owned by the parent task.
