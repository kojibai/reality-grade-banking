import {expect, it} from 'vitest';
import {unzipSync, zipSync, strToU8, strFromU8} from 'fflate';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {Window} from 'happy-dom';
import {resolve, dirname} from 'node:path';
import {readBusinessDocumentDraft, renderBusinessDocument, readBusinessDocumentMetadata, type BusinessDocumentDraft} from '../src/receiz/business-document';

const draft: BusinessDocumentDraft = {kind: 'agreement', title: 'Design services · Élodie', summary: 'A complete written scope for Søren and Анна.', sections: [{heading: 'Scope', body: 'Discovery, design and delivery.\nThe client receives editable source files.'}, {heading: 'Terms', body: 'One review round. Unspecified dates and prices remain blank.'}], tables: [{title: 'Deliverables', columns: ['Description', 'Owner'], rows: [['Website', 'Élodie'], ['Written plan', 'Søren']]}]};
it('validates and privately copies the complete plain-JSON draft without inventing missing facts', () => {
  const value = readBusinessDocumentDraft(draft); expect(value).toEqual(draft); expect(value).not.toBe(draft);
  expect(readBusinessDocumentDraft({...draft, summary: '', sections: [{heading: '', body: ''}], tables: []}).sections).toEqual([{heading: '', body: ''}]);
});
const createdAt = '2026-11-15T22:00:00.000Z';
const mimes = {docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
const xmlWindow = new Window();
const xml = (bytes: Uint8Array) => new xmlWindow.DOMParser().parseFromString(strFromU8(bytes), 'application/xml');
const texts = (bytes: Uint8Array, tag: string) => [...xml(bytes).getElementsByTagName(tag)].map(node => node.textContent).join(' ');

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('leads the real %s document with issuer branding and keeps Bankeiz in a subtle footer', async format => {
  const file = await renderBusinessDocument({draft, format, issuerName: 'Élodie Studio\nDesign & Research', createdAt}), bytes = new Uint8Array(await file.arrayBuffer()), brand = 'Élodie Studio Design & Research';
  if (format === 'pdf') {
    const task = getDocument({data: bytes, useSystemFonts: false}), pdf = await task.promise;
    try {for (let number = 1; number <= pdf.numPages; number++) {
      const items = (await (await pdf.getPage(number)).getTextContent()).items.filter(item => 'str' in item).filter(item => item.str.trim());
      expect(items[0].str).toBe(brand); const attribution = items.find(item => item.str === 'Bankeiz'); expect(attribution).toBeDefined(); expect(attribution!.transform[5]).toBeLessThan(45); expect(attribution!.height).toBeLessThan(12);
    }} finally {await task.destroy();}
  } else if (format === 'xlsx') {
    const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer as ArrayBuffer); const sheet = workbook.getWorksheet('Document')!;
    expect(String(sheet.getCell('A1').value).replace(/\s+/g, ' ')).toBe(brand); expect(sheet.getCell('A1').font.bold).toBe(true); expect(sheet.getCell('A1').font.size).toBeGreaterThanOrEqual(18); expect(sheet.headerFooter.oddFooter).toContain('Bankeiz');
  } else {
    const entries = unzipSync(bytes);
    if (format === 'docx') {
      const headers = Object.keys(entries).filter(name => /^word\/header\d+\.xml$/.test(name)), footers = Object.keys(entries).filter(name => /^word\/footer\d+\.xml$/.test(name)); expect(headers.length).toBeGreaterThan(0);
      for (const name of headers) expect(texts(entries[name], 'w:t').replace(/\s+/g, ' ')).toBe(brand);
      expect(footers.map(name => texts(entries[name], 'w:t')).join(' ')).toContain('Bankeiz');
    } else for (const name of Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))) {
      const document = xml(entries[name]), shapes = [...document.getElementsByTagName('p:sp')], shapeText = (shape: typeof shapes[number]) => [...shape.getElementsByTagName('a:t')].map(node => node.textContent).join(' ');
      expect(shapeText(shapes[0])).toBe(brand); const attribution = shapes.find(shape => shapeText(shape).includes('Bankeiz')); expect(attribution).toBeDefined();
      expect(Number(attribution!.getElementsByTagName('a:rPr')[0].getAttribute('sz'))).toBeLessThanOrEqual(900);
    }
  }
}, 20000);

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('wraps a complete 160-character multiline issuer within the real %s header bounds', async format => {
  const issuerName = `${'W'.repeat(75)}\n${'M'.repeat(84)}`, expected = issuerName.replace(/\s/g, ''), file = await renderBusinessDocument({draft, format, issuerName, createdAt}), bytes = new Uint8Array(await file.arrayBuffer()); expect(issuerName).toHaveLength(160);
  if (format === 'pdf') {
    const task = getDocument({data: bytes, useSystemFonts: false}), pdf = await task.promise;
    try {for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), items = (await page.getTextContent()).items.filter(item => 'str' in item);
      expect(items.filter(item => item.height >= 19 && item.height <= 21).map(item => item.str).join('').replace(/\s/g, '')).toBe(expected);
      for (const item of items) {expect(item.transform[4]).toBeGreaterThanOrEqual(30); expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 29); expect(item.transform[5]).toBeGreaterThanOrEqual(25); expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 25);}
    }} finally {await task.destroy();}
  } else if (format === 'xlsx') {
    const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer as ArrayBuffer); const sheet = workbook.getWorksheet('Document')!, value = String(sheet.getCell('A1').value), row = sheet.getRow(1);
    expect(value.replace(/\s/g, '')).toBe(expected); expect(row.height).toBeGreaterThanOrEqual(value.split('\n').length * sheet.getCell('A1').font.size! * 1.3); expect(row.height).toBeLessThanOrEqual(409);
  } else {
    const entries = unzipSync(bytes);
    if (format === 'docx') {
      const header = xml(entries[Object.keys(entries).find(name => /^word\/header\d+\.xml$/.test(name))!]), lines = [...header.getElementsByTagName('w:t')].map(node => node.textContent), margins = [...xml(entries['word/document.xml']).getElementsByTagName('w:pgMar')];
      expect(lines.join('').replace(/\s/g, '')).toBe(expected); for (const line of lines) expect([...line].length).toBeLessThanOrEqual(40);
      for (const margin of margins) expect(Number(margin.getAttribute('w:top')) - Number(margin.getAttribute('w:header'))).toBeGreaterThanOrEqual(lines.length * 360);
    } else for (const name of Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))) {
      const document = xml(entries[name]), shapes = [...document.getElementsByTagName('p:sp')], header = shapes[0], title = shapes[1]; expect([...header.getElementsByTagName('a:t')].map(node => node.textContent).join('').replace(/\s/g, '')).toBe(expected);
      const headerOffset = header.getElementsByTagName('a:off')[0], headerExtent = header.getElementsByTagName('a:ext')[0], titleOffset = title.getElementsByTagName('a:off')[0]; expect(Number(headerOffset.getAttribute('y')) + Number(headerExtent.getAttribute('cy'))).toBeLessThanOrEqual(Number(titleOffset.getAttribute('y')));
      for (const element of document.getElementsByTagName('a:xfrm')) {
        const offset = element.getElementsByTagName('a:off')[0], extent = element.getElementsByTagName('a:ext')[0]; if (!offset || !extent) continue;
        expect(Number(offset.getAttribute('x'))).toBeGreaterThanOrEqual(0); expect(Number(offset.getAttribute('y'))).toBeGreaterThanOrEqual(0); expect(Number(offset.getAttribute('x')) + Number(extent.getAttribute('cx'))).toBeLessThanOrEqual(12192000); expect(Number(offset.getAttribute('y')) + Number(extent.getAttribute('cy'))).toBeLessThanOrEqual(6858000);
      }
    }
  }
}, 20000);

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('retains multiline issuer and client contact details in the real %s parties layout', async format => {
  const issuerDetails = 'hello@maya.example\n+1 (212) 555-0171\n43 Rue Élodie, Montréal\nTax ID: CA 0012 & <003>';
  const clientDetails = 'Søren Jensen\nsoren@example.test\n21 Market Street, København\nAccount reference: 00123';
  const file = await renderBusinessDocument({draft, format, issuerName: 'Maya Studio', issuerDetails, clientName: 'Søren', clientDetails, createdAt});
  const lines: string[] = [], bytes = new Uint8Array(await file.arrayBuffer());
  if (format === 'pdf') {
    const task = getDocument({data: bytes, useSystemFonts: false}), pdf = await task.promise;
    try {for (let number = 1; number <= pdf.numPages; number++) lines.push(...(await (await pdf.getPage(number)).getTextContent()).items.filter(item => 'str' in item).map(item => item.str));} finally {await task.destroy();}
  } else if (format === 'xlsx') {
    const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {expect(cell.type).not.toBe(ExcelJS.ValueType.Formula); lines.push(...String(cell.value ?? '').split('\n'));})));
  } else {
    const entries = unzipSync(bytes), names = format === 'docx' ? ['word/document.xml'] : Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    for (const name of names) lines.push(...[...xml(entries[name]).getElementsByTagName(format === 'docx' ? 'w:t' : 'a:t')].flatMap(node => node.textContent.split('\n')));
  }
  for (const line of [...issuerDetails.split('\n'), ...clientDetails.split('\n')]) expect(lines).toContain(line);
  expect(lines.indexOf('Issued by: Maya Studio')).toBeLessThan(lines.indexOf('hello@maya.example'));
  expect(lines.indexOf('hello@maya.example')).toBeLessThan(lines.indexOf('Prepared for: Søren'));
  expect(lines.indexOf('Prepared for: Søren')).toBeLessThan(lines.indexOf('soren@example.test'));
}, 20000);

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('refuses invalid or more than 1200 characters of contact details before authoring %s', async format => {
  for (const field of ['issuerDetails', 'clientDetails'] as const) for (const value of ['a'.repeat(1201), 'bad\u0000contact', 'bad\ud800contact', 42, null]) {
    await expect(renderBusinessDocument({draft, format, issuerName: 'Maya', createdAt, [field]: value})).rejects.toThrow('BUSINESS_DOCUMENT_INVALID');
  }
});

it.each(['issuerDetails', 'clientDetails'] as const)('refuses an unsupported PDF glyph in %s explicitly', async field => {
  await expect(renderBusinessDocument({draft, issuerName: 'Maya', createdAt, [field]: 'Address: 你好'})).rejects.toThrow(/font.*support.*U\+/i);
});

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('keeps both complete 1200-character contact blocks in bounded %s content', async format => {
  const issuerDetails = `${Array.from({length: 40}, (_, index) => `Issuer ${String(index).padStart(2, '0')}: contact aaaaaaaaa.`).join('\n')}!`;
  const clientDetails = `${Array.from({length: 40}, (_, index) => `Client ${String(index).padStart(2, '0')}: contact bbbbbbbbb.`).join('\n')}!`;
  expect(issuerDetails).toHaveLength(1200); expect(clientDetails).toHaveLength(1200);
  const file = await renderBusinessDocument({draft, format, issuerName: 'Maya', issuerDetails, clientName: 'Søren', clientDetails, createdAt}), bytes = new Uint8Array(await file.arrayBuffer());
  let content = '';
  if (format === 'pdf') {
    const task = getDocument({data: bytes, useSystemFonts: false}), pdf = await task.promise;
    try {
      expect(pdf.numPages).toBeGreaterThan(1);
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number), items = (await page.getTextContent()).items.filter(item => 'str' in item); content += items.map(item => item.str).join('\n');
        for (const item of items) {expect(item.transform[4]).toBeGreaterThanOrEqual(30); expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 29); expect(item.transform[5]).toBeGreaterThanOrEqual(25); expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 25);}
      }
    } finally {await task.destroy();}
  } else if (format === 'xlsx') {
    const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    workbook.getWorksheet('Document')!.eachRow(row => {expect(row.height).toBeLessThanOrEqual(409); row.eachCell({includeEmpty: false}, (cell, column) => {if (column === 1) content += `${String(cell.value ?? '')}\n`;});});
  } else {
    const entries = unzipSync(bytes), names = format === 'docx' ? ['word/document.xml'] : Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    if (format === 'pptx') expect(names.length).toBeGreaterThan(4);
    for (const name of names) {
      const document = xml(entries[name]); content += [...document.getElementsByTagName(format === 'docx' ? 'w:t' : 'a:t')].map(node => node.textContent).join('\n');
      if (format === 'pptx') for (const element of document.getElementsByTagName('a:xfrm')) {
        const offset = element.getElementsByTagName('a:off')[0], extent = element.getElementsByTagName('a:ext')[0]; if (!offset || !extent) continue;
        expect(Number(offset.getAttribute('x'))).toBeGreaterThanOrEqual(0); expect(Number(offset.getAttribute('y'))).toBeGreaterThanOrEqual(0);
        expect(Number(offset.getAttribute('x')) + Number(extent.getAttribute('cx'))).toBeLessThanOrEqual(12192000);
        expect(Number(offset.getAttribute('y')) + Number(extent.getAttribute('cy'))).toBeLessThanOrEqual(6858000);
      }
    }
  }
  for (const line of [...issuerDetails.split('\n'), ...clientDetails.split('\n')]) expect(content).toContain(line);
}, 20000);

it.each(['docx', 'xlsx', 'pptx'] as const)('authors a real %s package with exact Unicode content and an OPC metadata part', async format => {
  const metadata = JSON.stringify({draft, actor: 'Élodie', reviewed: true});
  const file = await renderBusinessDocument({draft, format, issuerName: 'Maya Studio', clientName: 'Søren', metadata, createdAt});
  expect(file.type).toBe(mimes[format]); expect(file.name).toMatch(new RegExp(`\\.${format}$`));
  const bytes = new Uint8Array(await file.arrayBuffer()), entries = unzipSync(bytes);
  expect(entries['[Content_Types].xml']).toBeDefined(); expect(entries['_rels/.rels']).toBeDefined(); expect(strFromU8(entries['[Content_Types].xml'])).toContain('/bankeiz/document.json');
  expect(strFromU8(entries['bankeiz/document.json'])).toBe(metadata); expect(await readBusinessDocumentMetadata(bytes, file.type)).toBe(metadata);
  let content = '';
  if (format === 'docx') {expect(entries['word/document.xml']).toBeDefined(); content = texts(entries['word/document.xml'], 'w:t'); expect(xml(entries['word/document.xml']).getElementsByTagName('w:tbl').length).toBeGreaterThan(0);}
  if (format === 'pptx') {expect(entries['ppt/presentation.xml']).toBeDefined(); const slides = Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)); expect(slides.length).toBeGreaterThan(1); content = slides.map(name => texts(entries[name], 'a:t')).join(' ');}
  if (format === 'xlsx') {
    const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {expect(cell.type).not.toBe(ExcelJS.ValueType.Formula); content += `${String(cell.value ?? '')} `;})));
    expect(Object.keys(entries).some(name => /^xl\/tables\/table\d+\.xml$/.test(name))).toBe(true);
  }
  const compact = content.replace(/\s/g, '');
  for (const value of [draft.title, draft.summary, 'Maya Studio', 'Søren', ...draft.sections.flatMap(section => [section.heading, section.body]), ...draft.tables.flatMap(table => [table.title, ...table.columns, ...table.rows.flat()])]) expect(compact).toContain(value.replace(/\s/g, ''));
}, 20000);

it('writes spreadsheet formula-looking values as literal strings', async () => {
  const table = {title: 'Literal source', columns: ['Entry'], rows: [['=HYPERLINK("https://example.com")'], ['+SUM(1,2)'], ['-1+2'], ['@SUM(A1)'], ['00123']]};
  const file = await renderBusinessDocument({draft: {...draft, tables: [table]}, format: 'xlsx', issuerName: 'Maya', createdAt});
  const {default: ExcelJS} = await import('exceljs'), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
  const values: unknown[] = []; workbook.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => {expect(cell.type).not.toBe(ExcelJS.ValueType.Formula); values.push(cell.value);})));
  for (const [value] of table.rows) expect(values).toContain(value);
});

it('paginates long PDF text and table cells without dropping content or drawing beyond the page', async () => {
  const body = Array.from({length: 60}, (_, index) => `Clause ${index}: retain the exact agreed scope, source files and responsibilities. EndClause${index}.`).join('\n');
  const large: BusinessDocumentDraft = {...draft, sections: [{heading: 'Complete terms', body}], tables: [{title: 'Full inventory', columns: ['Description', 'Notes'], rows: Array.from({length: 35}, (_, index) => [`Item ${index}`, `Detailed work for item ${index}. ${'The full supplied details are retained. '.repeat(8)}EndRow${index}.`])}]};
  const file = await renderBusinessDocument({draft: large, issuerName: 'Maya Studio', createdAt}), task = getDocument({data: new Uint8Array(await file.arrayBuffer()), useSystemFonts: false});
  const pdf = await task.promise; let content = '';
  try {
    expect(pdf.numPages).toBeGreaterThan(3);
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number), items = (await page.getTextContent()).items.filter(item => 'str' in item);
      content += items.map(item => item.str).join(' ');
      for (const item of items) {expect(item.transform[4]).toBeGreaterThanOrEqual(30); expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 29); expect(item.transform[5]).toBeGreaterThanOrEqual(25); expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 25);}
    }
    for (let index = 0; index < 60; index++) expect(content).toContain(`EndClause${index}.`);
    for (let index = 0; index < 35; index++) expect(content).toContain(`EndRow${index}.`);
  } finally {await task.destroy();}
}, 25000);

it('keeps lengthy PowerPoint content on multiple bounded slides', async () => {
  const body = Array.from({length: 48}, (_, index) => `Paragraph ${index}: agreed work and complete responsibilities. EndParagraph${index}.`).join('\n');
  const file = await renderBusinessDocument({draft: {...draft, sections: [{heading: 'The complete agreed terms', body}]}, format: 'pptx', issuerName: 'Maya', createdAt});
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer())), names = Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  expect(names.length).toBeGreaterThan(3); const content = names.map(name => texts(entries[name], 'a:t')).join(' ');
  for (let index = 0; index < 48; index++) expect(content).toContain(`EndParagraph${index}.`);
  for (const name of names) for (const element of xml(entries[name]).getElementsByTagName('a:xfrm')) {
    const offset = element.getElementsByTagName('a:off')[0], extent = element.getElementsByTagName('a:ext')[0]; if (!offset || !extent) continue;
    expect(Number(offset.getAttribute('x'))).toBeGreaterThanOrEqual(0); expect(Number(offset.getAttribute('y'))).toBeGreaterThanOrEqual(0);
    expect(Number(offset.getAttribute('x')) + Number(extent.getAttribute('cx'))).toBeLessThanOrEqual(12192000);
    expect(Number(offset.getAttribute('y')) + Number(extent.getAttribute('cy'))).toBeLessThanOrEqual(6858000);
  }
}, 20000);

it('rejects non-plain objects, getters, unknown fields and oversized or inconsistent drafts', () => {
  let invoked = false;
  const accessor = {...draft}; Object.defineProperty(accessor, 'title', {enumerable: true, get() {invoked = true; return 'Unsafe';}});
  for (const value of [accessor, {...draft, accepted: true}, Object.assign(Object.create({}), draft), {...draft, sections: [{heading: 'Too long', body: 'a'.repeat(6001)}]}, {...draft, tables: [{title: 'Bad width', columns: ['One', 'Two'], rows: [['One']]}]}, {...draft, sections: Array.from({length: 5}, () => ({heading: '', body: 'a'.repeat(5000)}))}, {...draft, sections: Array.from({length: 4}, () => ({heading: '', body: 'あ'.repeat(5000)}))}]) expect(() => readBusinessDocumentDraft(value)).toThrow();
  expect(invoked).toBe(false);
});

it('rejects hidden array properties before serialization can invoke them', () => {
  let invoked = false; const sections = [...draft.sections];
  Object.defineProperty(sections, 'toJSON', {value: () => {invoked = true; return [];}});
  expect(() => readBusinessDocumentDraft({...draft, sections})).toThrow(); expect(invoked).toBe(false);
});

it('refuses absent, duplicate, oversized and bomb-like Office metadata', async () => {
  const metadata = '{"reviewed":true}', file = await renderBusinessDocument({draft, format: 'docx', issuerName: 'Maya', metadata, createdAt});
  const entries = unzipSync(new Uint8Array(await file.arrayBuffer())); delete entries['bankeiz/document.json'];
  await expect(readBusinessDocumentMetadata(zipSync(entries), file.type)).rejects.toThrow();
  entries['bankeiz/document.json'] = strToU8(metadata); entries['bankeiz/documenz.json'] = strToU8('{}'); const duplicate = zipSync(entries);
  const old = strToU8('bankeiz/documenz.json'), replacement = strToU8('bankeiz/document.json');
  for (let i = 0; i <= duplicate.length - old.length; i++) if (old.every((byte, offset) => duplicate[i + offset] === byte)) duplicate.set(replacement, i);
  await expect(readBusinessDocumentMetadata(duplicate, file.type)).rejects.toThrow();
  delete entries['bankeiz/documenz.json']; entries['bankeiz/document.json'] = strToU8(JSON.stringify({text: 'a'.repeat(65537)}));
  await expect(readBusinessDocumentMetadata(zipSync(entries), file.type)).rejects.toThrow();
  await expect(renderBusinessDocument({draft, issuerName: 'Maya', metadata: JSON.stringify({text: 'a'.repeat(65537)}), createdAt})).rejects.toThrow();
});

it.each(['pdf', 'docx', 'xlsx', 'pptx'] as const)('round-trips exactly 64 KiB of reviewed metadata in %s', async format => {
  const metadata = JSON.stringify({text: 'a'.repeat(65525)}); expect(strToU8(metadata).length).toBe(65536);
  const file = await renderBusinessDocument({draft, format, issuerName: 'Maya', metadata, createdAt});
  expect(await readBusinessDocumentMetadata(new Uint8Array(await file.arrayBuffer()), file.type)).toBe(metadata);
});

it('bounds actual ZIP inflation when both directory headers lie about the metadata size', async () => {
  const file = await renderBusinessDocument({draft, format: 'docx', issuerName: 'Maya', metadata: '{}', createdAt}), entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  entries['bankeiz/document.json'] = strToU8(JSON.stringify({text: 'a'.repeat(200000)}));
  const bomb = zipSync(entries, {level: 9}), name = strToU8('bankeiz/document.json'), view = new DataView(bomb.buffer); let patched = 0;
  for (let i = 46; i < bomb.length - name.length; i++) if (name.every((byte, offset) => bomb[i + offset] === byte)) {
    if (view.getUint32(i - 30, true) === 0x04034b50) {view.setUint32(i - 8, 16, true); patched++;}
    if (view.getUint32(i - 46, true) === 0x02014b50) {view.setUint32(i - 22, 16, true); patched++;}
  }
  expect(patched).toBe(2); await expect(readBusinessDocumentMetadata(bomb, file.type)).rejects.toThrow();
});

it('refuses missing, duplicate and unsupported-filter PDF metadata', async () => {
  const {PDFDocument, PDFName, PDFDict, PDFArray, PDFRawStream} = await import('pdf-lib');
  const bare = await renderBusinessDocument({draft, issuerName: 'Maya', createdAt}); await expect(readBusinessDocumentMetadata(new Uint8Array(await bare.arrayBuffer()), bare.type)).rejects.toThrow();
  const file = await renderBusinessDocument({draft, issuerName: 'Maya', metadata: '{}', createdAt}), bytes = new Uint8Array(await file.arrayBuffer()), duplicate = await PDFDocument.load(bytes);
  await duplicate.attach(strToU8('{}'), 'bankeiz-document.json', {mimeType: 'application/json'}); await expect(readBusinessDocumentMetadata(await duplicate.save(), file.type)).rejects.toThrow();
  const changed = await PDFDocument.load(bytes), names = changed.catalog.lookup(PDFName.of('Names'), PDFDict).lookup(PDFName.of('EmbeddedFiles'), PDFDict).lookup(PDFName.of('Names'), PDFArray);
  const stream = changed.context.lookup(names.get(1), PDFDict).lookup(PDFName.of('EF'), PDFDict).lookup(PDFName.of('F'));
  expect(stream).toBeInstanceOf(PDFRawStream); (stream as import('pdf-lib').PDFRawStream).dict.set(PDFName.of('Filter'), PDFName.of('ASCII85Decode'));
  await expect(readBusinessDocumentMetadata(await changed.save(), file.type)).rejects.toThrow();
});

it('preserves wider Unicode scripts in Office payloads and refuses unavailable PDF glyphs explicitly', async () => {
  const source = {...draft, summary: '你好 · العربية · हिन्दी'};
  for (const format of ['docx', 'xlsx', 'pptx'] as const) {
    const file = await renderBusinessDocument({draft: source, format, issuerName: 'Maya', createdAt}), entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const content = Object.entries(entries).filter(([name]) => /(?:word\/document|xl\/sharedStrings|ppt\/slides\/slide\d+)\.xml$/.test(name)).map(([, bytes]) => strFromU8(bytes)).join(' ');
    expect(content).toContain(source.summary);
  }
  await expect(renderBusinessDocument({draft: source, issuerName: 'Maya', createdAt})).rejects.toThrow(/font.*support.*U\+/i);
});

it('keeps format libraries and font bytes out of the browser entry loading graph', async () => {
  const {build} = await import('esbuild');
  const result = await build({entryPoints: ['src/receiz/business-document.ts'], outdir: '/tmp/bankeiz-business-document-bundle-test', bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', loader: {'.ttf': 'dataurl'}, write: false, metafile: true, logLevel: 'silent'});
  const outputs = new Map(Object.entries(result.metafile!.outputs).map(([name, output]) => [resolve(name), output]));
  const initial = [...outputs].find(([, output]) => output.entryPoint === 'src/receiz/business-document.ts')!; expect(initial).toBeDefined();
  const seen = new Set<string>(), sources: string[] = [];
  const visit = (name: string) => {if (seen.has(name)) return; seen.add(name); const output = outputs.get(name)!; sources.push(...Object.keys(output.inputs)); for (const imported of output.imports) if (imported.kind !== 'dynamic-import' && !imported.external) visit(outputs.has(resolve(imported.path)) ? resolve(imported.path) : resolve(dirname(name), imported.path));};
  visit(initial[0]); expect(sources.some(name => /node_modules\/(?:docx|exceljs|pptxgenjs|pdf-lib|@pdf-lib\/fontkit)\//.test(name) || /\.ttf/.test(name))).toBe(false);
  expect(initial[1].imports.some(imported => imported.kind === 'dynamic-import')).toBe(true);
}, 20000);
it('creates a real default PDF carrying exact reviewed JSON', async () => {
  const metadata = '{ "reviewed": true, "terms": "Élodie" }';
  const file = await renderBusinessDocument({draft, issuerName: 'Maya Studio', clientName: 'Søren', metadata, createdAt: '2026-11-15T22:00:00.000Z'});
  expect(file.type).toBe('application/pdf'); expect(file.name).toMatch(/\.pdf$/);
  const bytes = new Uint8Array(await file.arrayBuffer()); expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  expect(await readBusinessDocumentMetadata(bytes, file.type)).toBe(metadata);
});
