import {BUSINESS_DOCUMENT_MIMES, readBusinessDocumentDraft, readBusinessDocumentMetadata} from './business-document';
import {hasProofCaptureCarrier, openCanonicalProofFile} from './proof-capture';

export type BusinessContextRecord = Readonly<{id: string; title: string; text: string}>;
export type BusinessContextFile = Readonly<{filename: string; mime: string; size: number; sha256: string; canonical: boolean; payloadSha256?: string}>;
export type BusinessContextSelection = Readonly<{records: readonly BusinessContextRecord[]; files: readonly BusinessContextFile[]; refs: readonly {id: string; title: string; digest: string; excerptDigest: string}[]; hasEarlier: boolean}>;
const utf8 = new TextEncoder(), MAX_FILE = 25 * 1024 * 1024;
export const businessContextHash = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))].map(value => value.toString(16).padStart(2, '0')).join('');
const identityMaterial = /receiz\.(?:key\.v\d|device\.identity\.v\d|account\.state\.v\d|identity\.login_proof\.v\d|sdk\.identity_account_projection\.v\d|identity_record\.keyfile\.v\d)|--(?:END-)?RECEIZ-IDENTITY-RECORD-KEYFILE-V\d--/i;
function refuseCredentials(): never {throw Error('Private identity credentials or PBI cannot be sent as document context. Choose the business text only.');}
/** Context is data, but owner approval never authorizes exporting device custody.
 * Decode JSON keys before comparison so suffixes, separators and escaped keys
 * cannot hide the SDK's actual private-key fields. Public financial data stays
 * available: amounts, account numbers and IBANs are not credential keys. */
export function assertBusinessContextText(value: string, depth = 0) {
  if (identityMaterial.test(value) || /-----BEGIN[\w ]*PRIVATE KEY-----/i.test(value)) refuseCredentials();
  const strings = [...value.matchAll(/"(?:\\.|[^"\\])*"/g)]; let jwk = false, privateJwk = false;
  for (const match of strings) {
    let decoded: string; try {decoded = JSON.parse(match[0]) as string;} catch {continue;}
    if (identityMaterial.test(decoded)) refuseCredentials();
    const after = value.slice((match.index ?? 0) + match[0].length);
    if (/^\s*:/.test(after)) {
      const key = decoded.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (/privatekey|secretkey|phrase|wrappingkey|credential|secrettoken|accesstoken|refreshtoken/.test(key) || key === 'pbi' || key.startsWith('pbiauthorship')) refuseCredentials();
      if (key === 'kty' && /^\s*:\s*"(?:OKP|EC|RSA)"/i.test(after)) jwk = true;
      if (key === 'd') privateJwk = true;
    }
    // A quoted JSON document must pass the same boundary as raw JSON.
    if (depth < 3 && /["{}]/.test(decoded)) assertBusinessContextText(decoded, depth + 1);
  }
  if (jwk && privateJwk) refuseCredentials();
}
function draftText(raw: string) {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || !('draft' in parsed)) throw Error('The selected document metadata is not readable business content.');
  const draft = readBusinessDocumentDraft(parsed.draft);
  return [draft.title, draft.summary, ...draft.sections.flatMap(section => [section.heading, section.body]), ...draft.tables.flatMap(table => [table.title, table.columns.join(' | '), ...table.rows.map(row => row.join(' | '))])].join('\n');
}
function proofCarrier(bytes: Uint8Array) {
  if (hasProofCaptureCarrier(bytes)) return true;
  // Carrier routing only. Actual validity always comes from the SDK open.
  const body = new TextDecoder('latin1').decode(bytes);
  return /RECEIZ_SEAL_UPDATE|\/ReceizProof\b|--RECEIZ-TRAILER|receiz\.bundle\.v\d|"proofbundle"\s*:|receiz\.proof_bundle|data-receiz-proof-bundle/i.test(body);
}
async function officeParts(bytes: Uint8Array) {
  const {Unzip, UnzipInflate} = await import('fflate'), parts = new Map<string, Uint8Array>(), seen = new Set<string>(); let count = 0, declared = 0, inflated = 0;
  const unzip = new Unzip(file => {
    if (++count > 2048 || file.name.length > 512 || /(?:^|\/)\.\.(?:\/|$)|\\|^\//.test(file.name) || seen.has(file.name.toLowerCase())) throw Error('The selected Office file is not a safe, complete package.');
    seen.add(file.name.toLowerCase()); if (/receiz|proof[_-]?bundle/i.test(file.name)) throw Error('An unverified proof carrier cannot be read as a plain Office file.');
    if ((file.originalSize ?? 0) > 8 * 1024 * 1024 || (declared += file.originalSize ?? 0) > 32 * 1024 * 1024) throw Error('The selected Office package is too large to read as context.');
    if (!/^(?:word\/document\.xml|ppt\/slides\/slide\d+\.xml|xl\/sharedStrings\.xml|xl\/worksheets\/sheet\d+\.xml|bankeiz\/document\.json)$/.test(file.name)) return;
    const selected: Uint8Array[] = []; let size = 0;
    file.ondata = (error, data, final) => {if (error) throw error; size += data.length; inflated += data.length; if (size > 2 * 1024 * 1024 || inflated > 8 * 1024 * 1024) {file.terminate(); throw Error('The selected Office text is too large to read safely.');} selected.push(data); if (final) {const output = new Uint8Array(size); let at = 0; for (const part of selected) {output.set(part, at); at += part.length;} parts.set(file.name, output);}};
    file.start();
  });
  unzip.register(UnzipInflate);
  for (let at = 0; at < bytes.length; at += 256) unzip.push(bytes.subarray(at, at + 256), at + 256 >= bytes.length);
  return parts;
}
const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', {fatal: true}).decode(bytes);
function xml(bytes: Uint8Array) {
  if (typeof DOMParser === 'undefined') throw Error('This environment cannot read Office XML text.');
  const value = decode(bytes); if (/<!DOCTYPE|<!ENTITY/i.test(value)) throw Error('External XML entities are not allowed in document context.');
  const document = new DOMParser().parseFromString(value, 'application/xml'); if (document.getElementsByTagName('parsererror').length) throw Error('The selected Office text is malformed.'); return document;
}
const local = (node: Document | Element, tag: string) => [...node.getElementsByTagName('*')].filter(element => (element.localName || element.tagName).split(':').pop() === tag);
const content = (node: Document | Element) => local(node, 't').map(value => value.textContent ?? '').join('');
async function officeText(bytes: Uint8Array, mime: string) {
  const parts = await officeParts(bytes);
  if (parts.has('bankeiz/document.json')) return draftText(await readBusinessDocumentMetadata(bytes, mime));
  if (mime === BUSINESS_DOCUMENT_MIMES.docx) {const value = parts.get('word/document.xml'); if (!value) throw Error('The Word document has no readable document part.'); return local(xml(value), 'p').map(content).join('\n');}
  if (mime === BUSINESS_DOCUMENT_MIMES.pptx) return [...parts].filter(([name]) => /^ppt\/slides\//.test(name)).sort(([a], [b]) => a.localeCompare(b, 'en', {numeric: true})).map(([, value], index) => `Slide ${index + 1}\n${local(xml(value), 'p').map(content).join('\n')}`).join('\n');
  const shared = parts.get('xl/sharedStrings.xml'), strings = shared ? local(xml(shared), 'si').map(content) : [];
  return [...parts].filter(([name]) => /^xl\/worksheets\//.test(name)).sort(([a], [b]) => a.localeCompare(b, 'en', {numeric: true})).map(([, value], index) => `Sheet ${index + 1}\n${local(xml(value), 'row').map(row => local(row, 'c').map(cell => {const raw = local(cell, 'v')[0]?.textContent ?? ''; return cell.getAttribute('t') === 's' ? strings[Number(raw)] ?? '' : cell.getAttribute('t') === 'inlineStr' ? content(cell) : raw;}).join(' | ')).join('\n')}`).join('\n');
}
async function pdfText(bytes: Uint8Array) {
  // An advertised metadata attachment may not fall back to visible PDF text
  // when its exact reviewed metadata fails the bounded metadata reader.
  const {PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString} = await import('pdf-lib'), pdf = await PDFDocument.load(bytes, {updateMetadata: false});
  const names = pdf.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict), seen = new Set<object>(); let nodes = 0, metadata = false;
  const visit = (node: import('pdf-lib').PDFDict, depth: number) => {if (seen.has(node) || depth > 8 || ++nodes > 64) throw Error('The PDF attachment catalog is invalid.'); seen.add(node); const pairs = node.lookupMaybe(PDFName.of('Names'), PDFArray); if (pairs) {if (pairs.size() > 128 || pairs.size() % 2) throw Error('The PDF attachment catalog is invalid.'); for (let i = 0; i < pairs.size(); i += 2) {const key = pdf.context.lookup(pairs.get(i)); if ((key instanceof PDFString || key instanceof PDFHexString) && key.decodeText() === 'bankeiz-document.json') metadata = true;}} const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray); if (kids) {if (kids.size() > 64) throw Error('The PDF attachment catalog is too large.'); for (let i = 0; i < kids.size(); i++) visit(pdf.context.lookup(kids.get(i), PDFDict), depth + 1);}};
  if (names) visit(names, 0); if (metadata) return draftText(await readBusinessDocumentMetadata(bytes, BUSINESS_DOCUMENT_MIMES.pdf));
  const {getDocument, GlobalWorkerOptions} = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (typeof window !== 'undefined') GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const task = getDocument({data: bytes.slice(), useSystemFonts: true, enableXfa: false}); let result = '';
  try {const source = await task.promise; for (let page = 1; page <= Math.min(source.numPages, 8) && result.length < 8000; page++) {const items = (await (await source.getPage(page)).getTextContent()).items; result += `Page ${page} of ${source.numPages}\n${items.filter(item => 'str' in item).map(item => item.str).join(' ')}\n`;} return result;} finally {await task.destroy();}
}
async function fileText(file: File, assertCurrent: () => void) {
  if (!(file instanceof File) || !file.size || file.size > MAX_FILE) throw Error('Choose a nonempty document smaller than 25 MB for context.');
  const bytes = new Uint8Array(await file.arrayBuffer()); assertCurrent(); const sha256 = await businessContextHash(bytes); assertCurrent();
  // Identity PNG key chunks and identity trailers are private even when the
  // enclosing Original is genuine. Refuse them before attempting extraction.
  if (identityMaterial.test(new TextDecoder('latin1').decode(bytes))) refuseCredentials();
  let selected: Uint8Array = bytes, name = file.name, mime = file.type, canonical = false, payloadSha256: string | undefined;
  let opened: Awaited<ReturnType<typeof openCanonicalProofFile>> | undefined;
  try {opened = await openCanonicalProofFile(file);} catch (cause) {assertCurrent(); if (proofCarrier(bytes)) throw cause;}
  if (opened) {assertCurrent(); if (identityMaterial.test(new TextDecoder('latin1').decode(opened.verifiedPayload.bytes))) refuseCredentials(); selected = opened.verifiedPayload.bytes; name = opened.verifiedPayload.filename; mime = opened.verifiedPayload.mimeType; canonical = true; payloadSha256 = opened.verifiedPayload.sha256;}
  let value: string;
  if (mime === BUSINESS_DOCUMENT_MIMES.pdf || /^%PDF-/.test(new TextDecoder().decode(selected.subarray(0, 5)))) value = await pdfText(selected);
  else if ([BUSINESS_DOCUMENT_MIMES.docx, BUSINESS_DOCUMENT_MIMES.xlsx, BUSINESS_DOCUMENT_MIMES.pptx].includes(mime)) value = await officeText(selected, mime);
  else if (/^(?:text\/(?:plain|markdown|csv)|application\/json)$/.test(mime) || /\.(?:txt|md|csv|json)$/i.test(name)) {if (selected.length > 2 * 1024 * 1024) throw Error('Choose a text file smaller than 2 MB for document context.'); value = decode(selected);}
  else throw Error('Choose PDF, DOCX, XLSX, PPTX or plain text for readable document context.');
  assertCurrent(); assertBusinessContextText(value);
  const reference: BusinessContextFile = {filename: file.name, mime: file.type || 'application/octet-stream', size: file.size, sha256, canonical, ...(payloadSha256 ? {payloadSha256} : {})};
  const prefix = `Selected ${canonical ? 'SDK-verified Original payload' : 'file'} excerpt. Full file SHA-256: ${sha256}. This excerpt does not represent a complete file or full history.\n`;
  return {record: {id: `file:${sha256}`, title: file.name.slice(0, 160), text: prefix + value}, reference};
}
/** Only owner-approved excerpts and full-file fingerprints leave this scope;
 * no enclosing proof bundles, PBI, key material or file bytes reach the Twin. */
export async function buildBusinessDocumentContext(input: {context: readonly BusinessContextRecord[]; files?: readonly File[]; required?: BusinessContextRecord; assertCurrent(): void}): Promise<BusinessContextSelection> {
  if (!Array.isArray(input.context) || input.context.length > 300 || (input.files?.length ?? 0) > 6) throw Error('Choose at most six files and a bounded set of document excerpts.');
  const full: BusinessContextRecord[] = [], fileRefs: BusinessContextFile[] = []; let hasEarlier = false;
  for (const row of input.context) {if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 160 || typeof row.title !== 'string' || typeof row.text !== 'string') throw Error('The selected document context is invalid.'); assertBusinessContextText(row.title + '\n' + row.text); if (row.text.trim()) full.push({id: row.id, title: row.title.slice(0, 160) || 'Selected excerpt', text: row.text});}
  const files = [...input.files ?? []];
  if (input.required && (!input.required.id || input.required.id.length > 160 || !input.required.title || input.required.title.length > 160 || !input.required.text.trim() || input.required.text.length > 2400)) throw Error('Keep the complete document request within 2400 characters.');
  if (input.required) assertBusinessContextText(input.required.text);
  const keep = Math.max(0, 12 - files.length - (input.required ? 1 : 0)), selected = keep ? full.slice(-keep) : []; if (selected.length < full.length) hasEarlier = true;
  for (const file of files) {input.assertCurrent(); const source = await fileText(file, input.assertCurrent); input.assertCurrent(); selected.push(source.record); fileRefs.push(source.reference);}
  const records: BusinessContextRecord[] = [], refs: {id: string; title: string; digest: string; excerptDigest: string}[] = []; let remaining = 16000; const ids = new Set<string>();
  if (input.required) {const row = {...input.required}, digest = await businessContextHash(utf8.encode(row.text)); records.push(row); refs.push({id: row.id, title: row.title, digest, excerptDigest: digest}); ids.add(row.id); remaining -= row.id.length + row.title.length + row.text.length; input.assertCurrent();}
  for (const [index, row] of selected.entries()) {
    if (ids.has(row.id)) throw Error('Select each document context record only once.'); ids.add(row.id);
    const budget = Math.min(2400, Math.max(1, Math.floor(remaining / (selected.length - index)) - row.id.length - row.title.length));
    const excerpt = row.text.slice(0, budget); if (excerpt.length < row.text.length) hasEarlier = true;
    const record = {id: row.id, title: row.title, text: excerpt}; records.push(record); remaining -= record.id.length + record.title.length + record.text.length;
    refs.push({id: row.id, title: row.title, digest: await businessContextHash(utf8.encode(row.text)), excerptDigest: await businessContextHash(utf8.encode(excerpt))}); input.assertCurrent();
  }
  return {records, files: fileRefs, refs, hasEarlier};
}
