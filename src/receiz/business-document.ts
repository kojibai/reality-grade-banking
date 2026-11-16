export type BusinessDocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx';
export type BusinessDocumentDraft = {
  kind: 'document' | 'agreement';
  title: string;
  summary: string;
  sections: readonly {heading: string; body: string}[];
  tables: readonly {title: string; columns: readonly string[]; rows: readonly (readonly string[])[]}[];
};
export type BusinessDocumentInput = {draft: BusinessDocumentDraft; format?: BusinessDocumentFormat; issuerName: string; issuerDetails?: string; clientName?: string; clientDetails?: string; metadata?: string; createdAt: string};
export const BUSINESS_DOCUMENT_MIMES: Readonly<Record<BusinessDocumentFormat, string>> = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const METADATA_MAX = 64 * 1024, PAYLOAD_MAX = 25 * 1024 * 1024, PART = 'bankeiz/document.json', PDF_PART = 'bankeiz-document.json';
const encoder = new TextEncoder(), decoder = () => new TextDecoder('utf-8', {fatal: true});
const invalid = (): never => {throw Error('BUSINESS_DOCUMENT_INVALID');};
const plain = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v)));
function object(v: unknown, keys: readonly string[]): asserts v is Record<string, unknown> {
  if (!plain(v) || Object.getOwnPropertySymbols(v).length || Object.getOwnPropertyNames(v).sort().join('|') !== [...keys].sort().join('|') || Object.values(Object.getOwnPropertyDescriptors(v)).some(p => !p.enumerable || !('value' in p))) invalid();
}
function array(v: unknown, max: number): asserts v is unknown[] {
  if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype || v.length > max || Object.getOwnPropertySymbols(v).length || Object.getOwnPropertyNames(v).length !== v.length + 1 || Object.keys(v).length !== v.length || Object.keys(v).some((key, i) => key !== String(i)) || Object.values(Object.getOwnPropertyDescriptors(v)).some(p => !('value' in p))) invalid();
}
function text(v: unknown, max: number): asserts v is string {
  if (typeof v !== 'string' || v.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(v) || /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v)) invalid();
}
/** Authored text only: no signature, financial result, grant or proof authority. */
export function readBusinessDocumentDraft(raw: unknown): BusinessDocumentDraft {
  object(raw, ['kind', 'title', 'summary', 'sections', 'tables']);
  if (raw.kind !== 'document' && raw.kind !== 'agreement') invalid();
  text(raw.title, 160); text(raw.summary, 2000); array(raw.sections, 20); array(raw.tables, 4);
  let count = raw.title.length + raw.summary.length;
  for (const section of raw.sections) {object(section, ['heading', 'body']); text(section.heading, 160); text(section.body, 6000); count += section.heading.length + section.body.length;}
  for (const table of raw.tables) {
    object(table, ['title', 'columns', 'rows']); text(table.title, 160); array(table.columns, 12); array(table.rows, 100); if (!table.columns.length) invalid(); count += table.title.length;
    for (const column of table.columns) {text(column, 1000); count += column.length;}
    for (const row of table.rows) {array(row, 12); if (row.length !== table.columns.length) invalid(); for (const cell of row) {text(cell, 1000); count += cell.length;}}
  }
  if (count > 24000 || encoder.encode(JSON.stringify(raw)).length > 32 * 1024) invalid();
  return structuredClone(raw) as BusinessDocumentDraft;
}
function metadataText(value: unknown) {
  if (typeof value !== 'string' || !value.length || encoder.encode(value).length > METADATA_MAX) throw Error('BUSINESS_DOCUMENT_METADATA_INVALID');
  try {JSON.parse(value);} catch {throw Error('BUSINESS_DOCUMENT_METADATA_INVALID');} return value;
}
type RenderInput = BusinessDocumentInput & {draft: BusinessDocumentDraft; format: BusinessDocumentFormat};
/** Format dependencies are loaded only for the requested portable payload. The caller applies the existing native seal. */
export async function renderBusinessDocument(input: BusinessDocumentInput): Promise<File> {
  const draft = readBusinessDocumentDraft(input.draft), format = input.format ?? 'pdf';
  if (!Object.hasOwn(BUSINESS_DOCUMENT_MIMES, format)) invalid(); text(input.issuerName, 160); if (input.clientName !== undefined) text(input.clientName, 160);
  if (input.issuerDetails !== undefined) text(input.issuerDetails, 1200); if (input.clientDetails !== undefined) text(input.clientDetails, 1200);
  if (typeof input.createdAt !== 'string' || !Number.isFinite(Date.parse(input.createdAt))) invalid();
  if (input.metadata !== undefined) metadataText(input.metadata);
  const value: RenderInput = {...input, draft, format};
  let bytes = format === 'pdf' ? await renderPdf(value) : format === 'docx' ? await renderDocx(value) : format === 'xlsx' ? await renderXlsx(value) : await renderPptx(value);
  if (format !== 'pdf') bytes = await finalizeOffice(bytes, value);
  if (bytes.length > PAYLOAD_MAX) throw Error('BUSINESS_DOCUMENT_TOO_LARGE');
  const name = draft.title.normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 100) || draft.kind;
  return new File([new Uint8Array(bytes)], `${name}.${format}`, {type: BUSINESS_DOCUMENT_MIMES[format]});
}

type Measure = (text: string) => number;
function wrap(value: string, width: number, measure: Measure): string[] {
  const lines: string[] = [], graphemes = new Intl.Segmenter('en', {granularity: 'grapheme'});
  for (const paragraph of value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/(\s+)/u)) {
      if (measure(line + word) <= width) {line += word; continue;}
      if (line.trim()) lines.push(line.trimEnd()); line = ''; if (!word.trim()) continue;
      for (const {segment} of graphemes.segment(word)) {if (line && measure(line + segment) > width) {lines.push(line); line = '';} line += segment;}
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
const dateLabel = (value: string) => new Date(value).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
const parties = (input: RenderInput) => [`Issued by: ${input.issuerName}`, ...(input.issuerDetails !== undefined ? [input.issuerDetails] : []), ...(input.clientName !== undefined ? [`Prepared for: ${input.clientName}`] : []), ...(input.clientDetails !== undefined ? [input.clientDetails] : []), `Created: ${dateLabel(input.createdAt)}`];
const palette = {navy: '172B45', blue: '244DCB', green: '18856A', paper: 'FCFBF8', muted: '5D6B7C', line: 'E9EAF0'};
// Office readers supply their own font fallback. Arial keeps the portable
// editable formats sans-serif even when Bankeiz's Inter is not installed.
const officeFont = 'Arial';
// Repeated headers compact whitespace; the exact supplied name remains in the
// parties content. Measuring conservatively bounds Office font fallback too.
const issuerHeader = (input: RenderInput) => input.issuerName.replace(/\s+/gu, ' ').trim() || 'Document';
const officeMeasure = (size: number) => (value: string) => [...value].reduce((sum, character) => sum + (/\p{M}/u.test(character) ? 0 : /\s/.test(character) ? size * 0.4 : size * 1.1), 0);

async function renderPdf(input: RenderInput): Promise<Uint8Array> {
  const [{PDFDocument, rgb}, {default: fontkit}, {businessDocumentFontUrls}] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit'), import('./business-document-fonts')]);
  const fonts = await Promise.all(businessDocumentFontUrls.map(async url => {const response = await fetch(url); if (!response.ok) throw Error('The document fonts could not be loaded.'); return new Uint8Array(await response.arrayBuffer());}));
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts[0], {subset: true, features: {liga: false}}), bold = await doc.embedFont(fonts[1], {subset: true, features: {liga: false}});
  const boldSet = new Set(bold.getCharacterSet()), supported = new Set(regular.getCharacterSet().filter(code => boldSet.has(code)));
  for (const value of [input.draft.title, input.draft.summary, input.issuerName, input.issuerDetails ?? '', input.clientName ?? '', input.clientDetails ?? '', ...input.draft.sections.flatMap(section => [section.heading, section.body]), ...input.draft.tables.flatMap(table => [table.title, ...table.columns, ...table.rows.flat()])]) for (const character of value) if (!'\n\r\t'.includes(character) && !supported.has(character.codePointAt(0)!)) throw Error(`The PDF font does not support U+${character.codePointAt(0)!.toString(16).toUpperCase()}. Choose an Office format to preserve this text or supply a PDF with a supporting font.`);
  const color = (hex: string) => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
  const created = new Date(input.createdAt); doc.setTitle(input.draft.title); doc.setAuthor(input.issuerName); doc.setCreator('Bankeiz'); doc.setProducer('Bankeiz'); doc.setCreationDate(created); doc.setModificationDate(created);
  let page = doc.addPage([612, 792]), y = 0, width = 612, height = 792;
  const pages: typeof page[] = [];
  const draw = (value: string, x: number, baseline: number, size = 10, heavy = false, tone = palette.navy) => {if (value) page.drawText(value, {x, y: baseline, size, font: heavy ? bold : regular, color: color(tone)});};
  function newPage(landscape = false) {
    if (pages.length) page = doc.addPage(landscape ? [792, 612] : [612, 792]);
    else if (landscape) page.setSize(792, 612);
    width = page.getWidth(); height = page.getHeight(); pages.push(page);
    page.drawRectangle({x: 0, y: 0, width, height, color: color(palette.paper)});
    const label = input.draft.kind === 'agreement' ? 'Agreement' : 'Document', labelWidth = bold.widthOfTextAtSize(label, 10), headerLines = wrap(issuerHeader(input), width - 100 - labelWidth, line => bold.widthOfTextAtSize(line, 20));
    headerLines.forEach((line, index) => draw(line, 42, height - 55 - index * 25, 20, true)); draw(label, width - 42 - labelWidth, height - 51, 10, true, palette.blue);
    const divider = height - 72 - (headerLines.length - 1) * 25;
    page.drawLine({start: {x: 42, y: divider}, end: {x: width - 42, y: divider}, color: color(palette.line), thickness: 0.7}); y = divider - 26;
  }
  function ensure(space: number) {if (y - space < 65) {newPage(width > height); return true;} return false;}
  function paragraph(value: string, size = 10, heavy = false, tone = palette.navy) {
    const font = heavy ? bold : regular, leading = size * 1.5;
    for (const line of wrap(value, width - 84, line => font.widthOfTextAtSize(line, size))) {ensure(leading); draw(line, 42, y, size, heavy, tone); y -= leading;}
  }
  function heading(value: string) {ensure(40); y -= 10; paragraph(value, 12, true, palette.blue); y -= 5;}
  newPage(); paragraph(input.draft.title, 24, true); y -= 10;
  parties(input).forEach(line => paragraph(line, 9, false, palette.muted)); y -= 12; paragraph(input.draft.summary);
  for (const section of input.draft.sections) {heading(section.heading); paragraph(section.body);}
  for (const table of input.draft.tables) {
    const landscape = table.columns.length > 4;
    if (landscape !== (width > height) || y < 170) newPage(landscape);
    heading(table.title);
    const columnWidth = (width - 84) / table.columns.length, size = table.columns.length > 6 ? 8 : 9, leading = size * 1.5;
    const renderRows = (rows: readonly (readonly string[])[], header: boolean) => {
      for (const row of rows) {
        const cells = row.map(cell => wrap(cell, columnWidth - 12, line => (header ? bold : regular).widthOfTextAtSize(line, size)));
        const length = Math.max(...cells.map(lines => lines.length));
        for (let index = 0; index < length; index++) {ensure(leading); cells.forEach((lines, column) => draw(lines[index] ?? '', 42 + column * columnWidth + 4, y, size, header, header ? palette.blue : palette.navy)); y -= leading;}
        page.drawLine({start: {x: 42, y: y + 3}, end: {x: width - 42, y: y + 3}, thickness: 0.5, color: color(palette.line)}); y -= 8;
      }
    };
    renderRows([table.columns], true); renderRows(table.rows, false);
  }
  pages.forEach((current, index) => {page = current; const w = page.getWidth(); draw('Bankeiz', 42, 32, 8, false, palette.muted); const label = `Page ${index + 1} of ${pages.length}`; draw(label, w - 42 - regular.widthOfTextAtSize(label, 8), 32, 8, false, palette.muted);});
  if (input.metadata !== undefined) await doc.attach(encoder.encode(input.metadata), PDF_PART, {mimeType: 'application/json', description: 'Exact reviewed document terms', creationDate: created, modificationDate: created});
  return doc.save({useObjectStreams: false});
}

async function renderDocx(input: RenderInput): Promise<Uint8Array> {
  const d = await import('docx');
  const paragraph = (value: string, heading = false) => new d.Paragraph({children: value.replace(/\r\n?/g, '\n').split('\n').flatMap((line, i) => [new d.TextRun({text: line, ...(i ? {break: 1} : {}), font: officeFont, color: heading ? palette.blue : palette.navy, size: heading ? 26 : 22, bold: heading})]), spacing: {after: heading ? 160 : 120, before: heading ? 240 : 0}, keepNext: heading, keepLines: false});
  const contents: import('docx').FileChild[] = [new d.Paragraph({children: [new d.TextRun({text: input.draft.title, font: officeFont, bold: true, size: 44, color: palette.navy})], spacing: {after: 260}}), ...parties(input).map(line => paragraph(line)), paragraph(input.draft.summary), ...input.draft.sections.flatMap(section => [paragraph(section.heading, true), paragraph(section.body)])];
  const headerLines = wrap(issuerHeader(input), 527, officeMeasure(13));
  const header = new d.Header({children: [new d.Paragraph({children: headerLines.map((line, index) => new d.TextRun({text: line, ...(index ? {break: 1} : {}), font: officeFont, bold: true, color: palette.navy, size: 26})), spacing: {before: 0, after: 0, line: 360, lineRule: d.LineRuleType.EXACT}})]});
  const footer = new d.Footer({children: [new d.Paragraph({children: [new d.TextRun({text: `Bankeiz · ${input.draft.kind === 'agreement' ? 'Agreement' : 'Document'} · `, font: officeFont, size: 18, color: palette.muted}), new d.TextRun({children: [d.PageNumber.CURRENT], font: officeFont, size: 18, color: palette.muted})], alignment: d.AlignmentType.RIGHT})]});
  const properties = {page: {size: {width: 12240, height: 15840}, margin: {top: Math.max(1000, (headerLines.length * 18 + 48) * 20), header: 720, right: 850, bottom: 1000, left: 850}}};
  const sections: import('docx').ISectionOptions[] = [{headers: {default: header}, footers: {default: footer}, properties, children: contents}];
  let portraitContents: import('docx').FileChild[] | null = contents;
  for (const table of input.draft.tables) {
    const wide = table.columns.length > 4;
    const row = (cells: readonly string[], isHeader: boolean) => new d.TableRow({tableHeader: isHeader, cantSplit: false, children: cells.map(cell => new d.TableCell({children: [paragraph(cell)], shading: isHeader ? {fill: 'F0F4FF'} : undefined, margins: {top: 100, bottom: 100, left: 100, right: 100}}))});
    const children = [paragraph(table.title, true), new d.Table({width: {size: 100, type: d.WidthType.PERCENTAGE}, layout: d.TableLayoutType.FIXED, columnWidths: table.columns.map(() => Math.floor((wide ? 14140 : 10540) / table.columns.length)), rows: [row(table.columns, true), ...table.rows.map(cells => row(cells, false))]})];
    if (!wide && portraitContents) portraitContents.push(...children);
    else {sections.push({headers: {default: header}, footers: {default: footer}, properties: {...properties, page: {...properties.page, size: wide ? {width: 15840, height: 12240, orientation: d.PageOrientation.LANDSCAPE} : properties.page.size}}, children}); portraitContents = wide ? null : children;}
  }
  const doc = new d.Document({title: input.draft.title, creator: input.issuerName, lastModifiedBy: input.issuerName, description: input.draft.summary, styles: {default: {document: {run: {font: officeFont, size: 22, color: palette.navy}, paragraph: {spacing: {line: 290}}}}}, sections});
  return new Uint8Array(await d.Packer.toArrayBuffer(doc));
}

async function renderXlsx(input: RenderInput): Promise<Uint8Array> {
  const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); workbook.creator = input.issuerName; workbook.created = new Date(input.createdAt); workbook.modified = new Date(input.createdAt);
  const headerFooter = {oddFooter: '&L&8Bankeiz&R&8Page &P of &N'};
  const sheet = workbook.addWorksheet('Document', {pageSetup: {paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0}, headerFooter, views: [{showGridLines: false}]});
  sheet.columns = Array.from({length: 8}, () => ({width: 13})); let at = 1;
  const content = (value: string, heading = false, title = false) => {
    const lines = title ? wrap(value, 528, officeMeasure(22)) : wrap(value, 90, text => [...text].length), leading = title ? 32 : 16;
    for (let i = 0; i < lines.length; i += 12) {const text = lines.slice(i, i + 12).join('\n'), row = sheet.getRow(at); sheet.mergeCells(at, 1, at, 8); row.getCell(1).value = text; row.getCell(1).font = {name: officeFont, size: title ? 22 : heading ? 13 : 11, color: {argb: heading ? palette.blue : palette.navy}, bold: heading || title}; row.getCell(1).alignment = {wrapText: true, vertical: 'top'}; row.height = Math.max(title ? 36 : 22, lines.slice(i, i + 12).length * leading + 8); at++;}
    at++;
  };
  content(issuerHeader(input), false, true); content(input.draft.title, false, true); parties(input).forEach(line => content(line)); content(input.draft.summary);
  input.draft.sections.forEach(section => {content(section.heading, true); content(section.body);}); sheet.pageSetup.printArea = `A1:H${at}`;
  input.draft.tables.forEach((table, index) => {
    const tab = workbook.addWorksheet(`Table ${index + 1}`, {views: [{state: 'frozen', ySplit: 3, showGridLines: false}], headerFooter, pageSetup: {orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0}});
    tab.getCell('A1').value = table.title; tab.getCell('A1').font = {name: officeFont, size: 16, bold: true, color: {argb: palette.navy}};
    tab.columns = table.columns.map((label, column) => ({width: Math.min(60, Math.max(18, label.length + 3, ...table.rows.map(row => Math.min(60, [...row[column]].length + 3))))}));
    const regularHeaders = table.columns.every(column => Boolean(column.trim())) && new Set(table.columns.map(column => column.toLowerCase())).size === table.columns.length;
    if (!regularHeaders) table.columns.forEach((label, column) => {tab.getCell(3, column + 1).value = label;});
    if (table.rows.length) tab.addTable({name: `BusinessTable${index + 1}`, ref: regularHeaders ? 'A3' : 'A4', headerRow: regularHeaders, totalsRow: false, style: {theme: 'TableStyleMedium2', showRowStripes: true}, columns: table.columns.map((name, column) => ({name: regularHeaders ? name : `Column ${column + 1}`, filterButton: regularHeaders})), rows: table.rows.map(row => [...row])});
    else table.columns.forEach((label, column) => {tab.getCell(3, column + 1).value = label;});
    tab.eachRow(row => {row.height = Math.min(409, Math.max(24, ...table.columns.map((_, column) => Math.ceil(String(row.getCell(column + 1).value ?? '').length / ((tab.getColumn(column + 1).width ?? 18) * 0.65)) * 15 + 12))); row.eachCell(cell => {cell.font = {name: officeFont, size: 11, color: {argb: palette.navy}}; cell.alignment = {vertical: 'top', wrapText: true};});});
  });
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

async function renderPptx(input: RenderInput): Promise<Uint8Array> {
  const {default: PptxGenJS} = await import('pptxgenjs'), deck = new PptxGenJS(); deck.layout = 'LAYOUT_WIDE'; deck.author = input.issuerName; deck.subject = input.draft.summary; deck.title = input.draft.title; deck.company = input.issuerName; deck.theme = {headFontFace: officeFont, bodyFontFace: officeFont};
  const h = 7.5; let slideCount = 0;
  // Deliberately conservative (one em per visible character) so Office font
  // fallback and long Unicode strings cannot force text beyond these boxes.
  const measured = officeMeasure;
  function slide(heading: string) {
    const current = deck.addSlide(); current.background = {color: palette.paper};
    const headerLines = wrap(issuerHeader(input), 12.1 * 72, measured(18)), headerHeight = Math.max(0.35, headerLines.length * 0.3), titleY = Math.max(1, 0.3 + headerHeight + 0.3);
    current.addText(headerLines.join('\n'), {x: 0.55, y: 0.3, w: 12.1, h: headerHeight, fontFace: officeFont, fontSize: 18, bold: true, color: palette.navy, margin: 0, valign: 'top', lineSpacingMultiple: 1.1});
    const lines = wrap(heading, 12.1 * 72, measured(25)), titleHeight = Math.max(0.4, lines.length * 0.4);
    current.addText(lines.join('\n'), {x: 0.55, y: titleY, w: 12.1, h: titleHeight, fontSize: 25, bold: true, color: palette.navy, margin: 0, breakLine: false, valign: 'top', lineSpacingMultiple: 1.1});
    const number = ++slideCount; current.addText(`Bankeiz · ${input.draft.kind === 'agreement' ? 'Agreement' : 'Document'} · ${number}`, {x: 0.55, y: 7.06, w: 12.1, h: 0.2, fontSize: 9, color: palette.muted, margin: 0});
    return {current, y: titleY + titleHeight + 0.15};
  }
  function textSlides(heading: string, value: string) {
    const lines = wrap(value, 12.1 * 72, measured(18)); let cursor = 0;
    do {const {current, y} = slide(heading), count = Math.max(1, Math.floor((h - 0.6 - y) / 0.32)), chunk = lines.slice(cursor, cursor + count); current.addText(chunk.join('\n'), {x: 0.55, y, w: 12.1, h: chunk.length * 0.32 + 0.03, fontSize: 18, color: palette.navy, margin: 0, valign: 'top', lineSpacingMultiple: 1.1, objectName: 'Document body'}); cursor += count;} while (cursor < lines.length);
  }
  textSlides(input.draft.title, [...parties(input), '', input.draft.summary].join('\n'));
  input.draft.sections.forEach(section => textSlides(section.heading, section.body));
  for (const table of input.draft.tables) for (let start = 0; start < table.columns.length; start += 3) {
    const labels = table.columns.slice(start, start + 3), columnWidth = 12.1 / labels.length;
    let headers = labels.map(value => wrap(value, (columnWidth - 0.2) * 72, measured(14)));
    if (Math.max(...headers.map(lines => lines.length)) > 4) {textSlides(table.title, labels.map((label, index) => `Column ${start + index + 1}: ${label}`).join('\n')); headers = labels.map((_, index) => [`Column ${start + index + 1}`]);}
    const headerHeight = Math.max(...headers.map(lines => lines.length)) * 0.25 + 0.18;
    let target = slide(table.title), rows: PptxGenJS.TableRow[] = [], heights: number[] = [], used = 0;
    const reset = () => {rows = [headers.map(lines => ({text: lines.join('\n'), options: {bold: true, fill: {color: 'F0F4FF'}, color: palette.blue}}))]; heights = [headerHeight]; used = headerHeight;};
    const flush = () => {target.current.addTable(rows, {x: 0.55, y: target.y, w: 12.1, h: used, colW: labels.map(() => columnWidth), rowH: heights, fontFace: officeFont, fontSize: 14, color: palette.navy, border: {type: 'solid', color: palette.line, pt: 0.6}, margin: 0.08, valign: 'top', autoPage: false});};
    reset();
    for (const row of table.rows) {
      const cells = row.slice(start, start + labels.length).map(cell => wrap(cell, (columnWidth - 0.2) * 72, measured(14))), count = Math.max(...cells.map(lines => lines.length)); let offset = 0;
      while (offset < count) {
        let capacity = Math.floor((h - 0.6 - target.y - used - 0.18) / 0.25);
        if (capacity < 1) {flush(); target = slide(table.title); reset(); capacity = Math.max(1, Math.floor((h - 0.6 - target.y - used - 0.18) / 0.25));}
        const take = Math.min(count - offset, capacity), rowHeight = take * 0.25 + 0.18; rows.push(cells.map(lines => ({text: lines.slice(offset, offset + take).join('\n')}))); heights.push(rowHeight); used += rowHeight; offset += take;
      }
    }
    flush();
  }
  const output = await deck.write({outputType: 'uint8array', compression: true});
  if (!(output instanceof Uint8Array)) throw Error('BUSINESS_DOCUMENT_PPTX_INVALID'); return output;
}

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function finalizeOffice(bytes: Uint8Array, input: RenderInput) {
  const {unzipSync, zipSync, strFromU8, strToU8} = await import('fflate'), entries = unzipSync(bytes);
  if (input.metadata !== undefined) {
    entries[PART] = encoder.encode(input.metadata);
    entries['[Content_Types].xml'] = strToU8(strFromU8(entries['[Content_Types].xml']).replace('</Types>', `<Override PartName="/${PART}" ContentType="application/json"/></Types>`));
    // A normal OPC relationship makes the exact custom part discoverable to
    // standard package readers; it carries data, never a signature authority.
    entries['_rels/.rels'] = strToU8(strFromU8(entries['_rels/.rels']).replace('</Relationships>', `<Relationship Id="bankeizDocument" Type="https://bankeiz.com/relationships/document" Target="${PART}"/></Relationships>`));
  }
  if (entries['docProps/core.xml']) entries['docProps/core.xml'] = strToU8(strFromU8(entries['docProps/core.xml']).replace(/(<dcterms:(?:created|modified)\b[^>]*>)[^<]*(<\/dcterms:(?:created|modified)>)/g, `$1${escapeXml(new Date(input.createdAt).toISOString())}$2`));
  return zipSync(entries, {level: 6});
}

type ZipEntry = {name: string; offset: number; compressed: number; size: number; method: number; crc: number};
function zipIndex(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) {end = i; break;}
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) invalid();
  const count = view.getUint16(end + 10, true), start = view.getUint32(end + 16, true), centralSize = view.getUint32(end + 12, true);
  if (count > 2048 || count !== view.getUint16(end + 8, true) || start + centralSize !== end) invalid();
  let at = start, total = 0; const result: ZipEntry[] = [], seen = new Set<string>();
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) invalid();
    const flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true), compressed = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true), nameSize = view.getUint16(at + 28, true), extra = view.getUint16(at + 30, true), comment = view.getUint16(at + 32, true), local = view.getUint32(at + 42, true);
    if (flags & 1 || ![0, 8].includes(method) || at + 46 + nameSize + extra + comment > end || size > 32 * 1024 * 1024 || (total += size) > 64 * 1024 * 1024 || local + 30 > start) invalid();
    const name = decoder().decode(bytes.subarray(at + 46, at + 46 + nameSize));
    if (!name || name.length > 512 || /[\u0000-\u001f\\%]/.test(name) || name.startsWith('/') || name.split('/').some((part, i, all) => part === '.' || part === '..' || !part && i < all.length - 1) || seen.has(name.toLowerCase())) invalid(); seen.add(name.toLowerCase());
    if (view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 8, true) !== method || view.getUint16(local + 6, true) !== flags) invalid();
    const localNameSize = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true), offset = local + 30 + localNameSize + localExtra;
    if (offset + compressed > start || decoder().decode(bytes.subarray(local + 30, local + 30 + localNameSize)) !== name || !(flags & 8) && (view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== size)) invalid();
    result.push({name, offset, compressed, size, method, crc: view.getUint32(at + 16, true)}); at += 46 + nameSize + extra + comment;
  }
  if (at !== end) invalid(); return result;
}
function crc32(bytes: Uint8Array) {let crc = 0xffffffff; for (const byte of bytes) {crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 0xedb88320 : 0);} return (crc ^ 0xffffffff) >>> 0;}
async function readOfficeMetadata(bytes: Uint8Array, mime: string) {
  const entries = zipIndex(bytes), expected = mime === BUSINESS_DOCUMENT_MIMES.docx ? 'word/document.xml' : mime === BUSINESS_DOCUMENT_MIMES.xlsx ? 'xl/workbook.xml' : 'ppt/presentation.xml';
  if (!entries.some(entry => entry.name === expected) || !entries.some(entry => entry.name === '[Content_Types].xml')) invalid();
  const found = entries.filter(entry => entry.name.toLowerCase() === PART); if (found.length !== 1 || found[0].name !== PART) throw Error('BUSINESS_DOCUMENT_METADATA_MISSING');
  const entry = found[0]; if (entry.size > METADATA_MAX || entry.compressed > METADATA_MAX * 2) throw Error('BUSINESS_DOCUMENT_METADATA_INVALID');
  const compressed = bytes.subarray(entry.offset, entry.offset + entry.compressed); let output: Uint8Array;
  if (entry.method === 0) {if (entry.compressed !== entry.size) invalid(); output = compressed;}
  else {
    const {Inflate} = await import('fflate'), parts: Uint8Array[] = []; let size = 0;
    const stream = new Inflate(part => {size += part.length; if (size > METADATA_MAX) throw Error('BUSINESS_DOCUMENT_METADATA_INVALID'); parts.push(part);});
    // Small compressed pushes bound work and allocations even if a hostile
    // central directory lies about the eventual inflated size.
    for (let at = 0; at < compressed.length; at += 256) stream.push(compressed.subarray(at, at + 256), at + 256 >= compressed.length);
    output = new Uint8Array(size); let at = 0; for (const part of parts) {output.set(part, at); at += part.length;}
  }
  if (output.length !== entry.size || crc32(output) !== entry.crc) invalid(); return metadataText(decoder().decode(output));
}
async function readPdfMetadata(bytes: Uint8Array) {
  const {PDFDocument, PDFName, PDFDict, PDFArray, PDFString, PDFHexString, PDFRawStream} = await import('pdf-lib'), doc = await PDFDocument.load(bytes, {updateMetadata: false});
  const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict), root = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict), found: import('pdf-lib').PDFRawStream[] = [], seen = new Set<object>(); let nodes = 0;
  function visit(node: import('pdf-lib').PDFDict, depth: number) {
    if (seen.has(node) || ++nodes > 64 || depth > 8) invalid(); seen.add(node); const pairs = node.lookupMaybe(PDFName.of('Names'), PDFArray);
    if (pairs) {
      if (pairs.size() > 128 || pairs.size() % 2) invalid();
      for (let at = 0; at < pairs.size(); at += 2) {
        const key = doc.context.lookup(pairs.get(at));
        if (key instanceof PDFString || key instanceof PDFHexString) {
          if (key.decodeText() !== PDF_PART) continue;
          const spec = doc.context.lookup(pairs.get(at + 1), PDFDict), stream = spec.lookup(PDFName.of('EF'), PDFDict).lookup(PDFName.of('F'));
          if (stream instanceof PDFRawStream) {if (stream.getContents().length > METADATA_MAX * 2) invalid(); found.push(stream);} else invalid();
        } else invalid();
      }
    }
    const kids = node.lookupMaybe(PDFName.of('Kids'), PDFArray); if (kids) {if (kids.size() > 64) invalid(); for (let at = 0; at < kids.size(); at++) visit(doc.context.lookup(kids.get(at), PDFDict), depth + 1);}
  }
  if (root) visit(root, 0); if (found.length !== 1) throw Error('BUSINESS_DOCUMENT_METADATA_MISSING_OR_DUPLICATE');
  const stream = found[0], filter = stream.dict.lookupMaybe(PDFName.of('Filter'), PDFName); let output = stream.getContents();
  if (filter) {
    if (filter.asString() !== '/FlateDecode' || stream.dict.has(PDFName.of('DecodeParms'))) invalid();
    const reader = new Blob([new Uint8Array(output)]).stream().pipeThrough(new DecompressionStream('deflate')).getReader(), parts: Uint8Array[] = []; let size = 0;
    try {for (;;) {const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > METADATA_MAX) invalid(); parts.push(part.value);} output = new Uint8Array(size); let offset = 0; for (const part of parts) {output.set(part, offset); offset += part.length;}} finally {await reader.cancel().catch(() => {}); reader.releaseLock();}
  }
  return metadataText(decoder().decode(output));
}
/** Extract exact reviewed JSON only from a payload already admitted by the caller's existing SDK flow. */
export async function readBusinessDocumentMetadata(filePayload: Uint8Array, mime: string): Promise<string> {
  if (!(filePayload instanceof Uint8Array) || !filePayload.length || filePayload.length > PAYLOAD_MAX || !Object.values(BUSINESS_DOCUMENT_MIMES).includes(mime)) invalid();
  return mime === BUSINESS_DOCUMENT_MIMES.pdf ? readPdfMetadata(filePayload) : readOfficeMetadata(filePayload, mime);
}
import type PptxGenJS from 'pptxgenjs';
