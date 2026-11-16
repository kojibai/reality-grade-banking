export type ProposalPdfInput = {
  title: string;
  kind: 'proposal' | 'invoice';
  reference: string;
  issuer: {name: string; email?: string; website?: string; details?: string};
  client: {name: string; email?: string; details?: string};
  summary: string;
  items: readonly {description: string; quantity: string; unitPriceUsdCents: string}[];
  deliverables: readonly string[];
  timeline: string;
  terms: string;
  totalUsdCents: string;
  createdAt: string;
};

// These are the existing presentation colors in src/styles/tokens.css.
const colors = {
  paper: rgb(252 / 255, 251 / 255, 248 / 255),
  navy: rgb(23 / 255, 43 / 255, 69 / 255),
  blue: rgb(36 / 255, 77 / 255, 203 / 255),
  green: rgb(24 / 255, 133 / 255, 106 / 255),
  muted: rgb(93 / 255, 107 / 255, 124 / 255),
  line: rgb(233 / 255, 234 / 255, 240 / 255),
};
const PAGE_WIDTH = 612, PAGE_HEIGHT = 792, MARGIN = 48, BOTTOM = 70;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
let fontBytes: Promise<readonly [Uint8Array, Uint8Array]> | undefined;

function loadFonts() {
  // Inline static assets keep generation available offline once this lazy module is held.
  return fontBytes ??= Promise.all([regularFontUrl, semiboldFontUrl].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('The Bankeiz PDF font could not be loaded. Please try again.');
    return new Uint8Array(await response.arrayBuffer());
  })).then(bytes => [bytes[0], bytes[1]] as const).catch(error => {
    fontBytes = undefined;
    throw error;
  });
}

function cents(value: string, label: string) {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a nonnegative number of whole cents.`);
  return BigInt(value);
}

function lineAmount(item: ProposalPdfInput['items'][number]) {
  if (!/^\d+(?:\.\d+)?$/.test(item.quantity)) throw new Error('Each quantity must be a positive decimal number.');
  const [whole, fraction = ''] = item.quantity.split('.');
  const quantity = BigInt(whole + fraction), denominator = 10n ** BigInt(fraction.length);
  if (quantity <= 0n) throw new Error('Each quantity must be positive.');
  const numerator = quantity * cents(item.unitPriceUsdCents, 'Unit price');
  if (numerator % denominator !== 0n) throw new Error('A line item has a fractional cent. Adjust its quantity or unit price to produce whole cents.');
  return numerator / denominator;
}

function usd(value: bigint) {
  const digits = (value / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${digits}.${(value % 100n).toString().padStart(2, '0')}`;
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  const graphemes = new Intl.Segmenter('en', {granularity: 'grapheme'});
  for (const paragraph of text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/(\s+)/u)) {
      if (font.widthOfTextAtSize(line + word, size) <= width) {
        line += word;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = '';
      if (!word.trim()) continue;
      // A long reference or URL must wrap as completely as ordinary prose.
      for (const {segment} of graphemes.segment(word)) {
        if (font.widthOfTextAtSize(line + segment, size) > width && line) {
          lines.push(line);
          line = '';
        }
        line += segment;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Human-readable payload only. The caller seals the resulting bytes through the existing SDK. */
export async function buildProposalPdf(input: ProposalPdfInput): Promise<Uint8Array> {
  for (const details of [input.issuer.details, input.client.details]) {
    if (details !== undefined && (typeof details !== 'string' || details.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(details) || /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(details))) throw new Error('Party details must be valid text of at most 1200 characters.');
  }
  const date = new Date(input.createdAt);
  if (!Number.isFinite(date.getTime())) throw new Error('The creation date must be a valid date.');
  if (input.kind !== 'proposal' && input.kind !== 'invoice') throw new Error('Choose a proposal or invoice.');
  for (const [label, text] of Object.entries({Title: input.title, Reference: input.reference, 'Business name': input.issuer.name, 'Client name': input.client.name})) {
    if (!text.trim()) throw new Error(`${label} is required for this PDF.`);
  }
  if (!input.items.length) throw new Error('Add at least one line item.');
  const amounts = input.items.map(lineAmount), total = cents(input.totalUsdCents, 'Total');
  if (amounts.reduce((sum, amount) => sum + amount, 0n) !== total) throw new Error('The total must equal the sum of the line items.');

  const [regularBytes, semiboldBytes] = await loadFonts();
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // Disable optional ligatures so extraction retains the user's literal words.
  const regular = await document.embedFont(regularBytes, {subset: true, features: {liga: false}});
  const semibold = await document.embedFont(semiboldBytes, {subset: true, features: {liga: false}});
  const supported = new Set(regular.getCharacterSet().filter(code => semibold.getCharacterSet().includes(code)));
  const content = [input.title, input.reference, input.issuer.name, input.issuer.email ?? '', input.issuer.website ?? '', input.issuer.details ?? '', input.client.name, input.client.email ?? '', input.client.details ?? '', input.summary, ...input.items.flatMap(item => [item.description, item.quantity]), ...input.deliverables, input.timeline, input.terms];
  for (const text of content) for (const character of text) {
    const code = character.codePointAt(0)!;
    if (!'\n\r\t'.includes(character) && !supported.has(code)) {
      throw new Error(`The Bankeiz PDF font does not support U+${code.toString(16).toUpperCase().padStart(4, '0')} (${character}). Use supported characters or attach a document with a font that supports the original text.`);
    }
  }
  document.setTitle(input.title);
  document.setAuthor(input.issuer.name);
  document.setSubject(`${input.kind === 'invoice' ? 'Invoice' : 'Proposal'} ${input.reference}`);
  document.setCreator('Bankeiz');
  document.setProducer('Bankeiz');
  document.setCreationDate(date);
  document.setModificationDate(date);

  const kind = input.kind === 'invoice' ? 'Invoice' : 'Proposal';
  let page: PDFPage, y = 0;
  const draw = (text: string, x: number, baseline: number, font = regular, size = 10, color: RGB = colors.navy) => {
    if (text) page.drawText(text, {x, y: baseline, font, size, color});
  };
  const newPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: colors.paper});
    page.drawRectangle({x: MARGIN, y: PAGE_HEIGHT - 40, width: 30, height: 3, color: colors.blue});
    const labelWidth = semibold.widthOfTextAtSize(kind, 12), headerLines = wrap(input.issuer.name.replace(/\s+/gu, ' ').trim(), semibold, 22, CONTENT_WIDTH - labelWidth - 24), extra = (headerLines.length - 1) * 27;
    headerLines.forEach((line, index) => draw(line, MARGIN, PAGE_HEIGHT - 69 - index * 27, semibold, 22));
    draw(kind, PAGE_WIDTH - MARGIN - labelWidth, PAGE_HEIGHT - 63, semibold, 12, colors.blue);
    page.drawLine({start: {x: MARGIN, y: PAGE_HEIGHT - 88 - extra}, end: {x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 88 - extra}, thickness: 0.7, color: colors.line});
    y = PAGE_HEIGHT - 113 - extra;
  };
  const ensure = (height: number) => {
    if (y - height < BOTTOM) {
      newPage();
      return true;
    }
    return false;
  };
  const paragraph = (text: string, options: {font?: PDFFont; size?: number; leading?: number; color?: RGB; indent?: number} = {}) => {
    const {font = regular, size = 10, leading = 14.5, color = colors.navy, indent = 0} = options;
    for (const line of wrap(text, font, size, CONTENT_WIDTH - indent)) {
      ensure(leading);
      draw(line, MARGIN + indent, y, font, size, color);
      y -= leading;
    }
  };
  const section = (title: string) => {
    ensure(43);
    y -= 10;
    draw(title, MARGIN, y, semibold, 11, colors.blue);
    y -= 22;
  };

  newPage();
  paragraph(input.title, {font: semibold, size: 25, leading: 32});
  y -= 7;
  paragraph('Reference', {size: 8.5, leading: 14, color: colors.muted});
  paragraph(input.reference, {font: semibold, size: 10, leading: 15});
  const createdDate = new Intl.DateTimeFormat('en-US', {year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'}).format(date);
  const createdTime = new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: 'UTC'}).format(date);
  paragraph(`Created ${createdDate} · ${createdTime} UTC`, {size: 9, color: colors.muted});
  y -= 16;

  const partyWidth = (CONTENT_WIDTH - 24) / 2;
  type PartyLine = {text: string; font: PDFFont; size: number; color: RGB};
  const party = (label: string, name: string, details: readonly (string | undefined)[]): PartyLine[] => [
    {text: label, font: regular, size: 8.5, color: colors.muted},
    ...wrap(name, semibold, 11, partyWidth).map(text => ({text, font: semibold, size: 11, color: colors.navy})),
    ...details.filter((value): value is string => Boolean(value)).flatMap(value => wrap(value, regular, 9, partyWidth).map(text => ({text, font: regular, size: 9, color: colors.muted}))),
  ];
  const parties = [party('Issued by', input.issuer.name, [input.issuer.email, input.issuer.website, input.issuer.details]), party(input.kind === 'invoice' ? 'Bill to' : 'Prepared for', input.client.name, [input.client.email, input.client.details])];
  for (let index = 0; index < Math.max(...parties.map(lines => lines.length)); index++) {
    ensure(16);
    for (let column = 0; column < parties.length; column++) {
      const line = parties[column][index];
      if (line) draw(line.text, MARGIN + column * (partyWidth + 24), y, line.font, line.size, line.color);
    }
    y -= 16;
  }

  section('Summary');
  paragraph(input.summary);
  section('Line items');
  const columns = [
    {label: 'Description', x: MARGIN, width: 216, right: false},
    {label: 'Quantity', x: MARGIN + 224, width: 42, right: true},
    {label: 'Unit price', x: MARGIN + 274, width: 110, right: true},
    {label: 'Amount', x: MARGIN + 392, width: 124, right: true},
  ];
  const tableHeader = () => {
    columns.forEach(column => draw(column.label, column.right ? column.x + column.width - semibold.widthOfTextAtSize(column.label, 8) : column.x, y, semibold, 8, colors.muted));
    page.drawLine({start: {x: MARGIN, y: y - 9}, end: {x: PAGE_WIDTH - MARGIN, y: y - 9}, thickness: 0.7, color: colors.line});
    y -= 26;
  };
  tableHeader();
  input.items.forEach((item, index) => {
    const cells = [item.description, item.quantity, usd(cents(item.unitPriceUsdCents, 'Unit price')), usd(amounts[index])].map((text, column) => wrap(text, regular, column ? 8.5 : 9.5, columns[column].width));
    const rows = Math.max(...cells.map(lines => lines.length));
    // Keep a normal row together, but let an unusually long description continue.
    if (ensure(Math.min(rows * 15 + 10, PAGE_HEIGHT - 113 - BOTTOM - 26))) tableHeader();
    for (let row = 0; row < rows; row++) {
      if (ensure(15)) tableHeader();
      columns.forEach((column, columnIndex) => {
        const text = cells[columnIndex][row] ?? '', size = columnIndex ? 8.5 : 9.5;
        draw(text, column.right ? column.x + column.width - regular.widthOfTextAtSize(text, size) : column.x, y, regular, size);
      });
      y -= 15;
    }
    page.drawLine({start: {x: MARGIN, y: y + 2}, end: {x: PAGE_WIDTH - MARGIN, y: y + 2}, thickness: 0.5, color: colors.line});
    y -= 10;
  });
  ensure(52);
  y -= 7;
  draw('Total · USD', MARGIN, y, semibold, 12, colors.green);
  const totalLines = wrap(usd(total), semibold, 17, CONTENT_WIDTH - 130);
  totalLines.forEach(line => {
    ensure(23);
    draw(line, PAGE_WIDTH - MARGIN - semibold.widthOfTextAtSize(line, 17), y, semibold, 17, colors.green);
    y -= 23;
  });

  if (input.deliverables.length) {
    section('Deliverables');
    for (const [index, deliverable] of input.deliverables.entries()) {
      paragraph(`${index + 1}. ${deliverable}`);
      y -= 5;
    }
  }
  section('Timeline');
  paragraph(input.timeline);
  section('Terms');
  paragraph(input.terms);

  const pages = document.getPages();
  pages.forEach((current, index) => {
    page = current;
    page.drawLine({start: {x: MARGIN, y: 54}, end: {x: PAGE_WIDTH - MARGIN, y: 54}, thickness: 0.7, color: colors.line});
    draw(`Bankeiz · ${kind}`, MARGIN, 35, regular, 8, colors.muted);
    const label = `Page ${index + 1} of ${pages.length}`;
    draw(label, PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 8), 35, regular, 8, colors.muted);
  });
  // Traditional xref tables remain compatible with the existing SDK PDF carrier.
  return document.save({useObjectStreams: false});
}
import {PDFDocument, rgb, type PDFFont, type PDFPage, type RGB} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import regularFontUrl from '../../scripts/social/fonts/Inter-Regular.ttf?url&inline';
import semiboldFontUrl from '../../scripts/social/fonts/Inter-SemiBold.ttf?url&inline';
