import {describe, expect, it} from 'vitest';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {buildProposalPdf, type ProposalPdfInput} from '../src/receiz/proposal-pdf';

const example: ProposalPdfInput = {
  kind: 'proposal',
  title: 'Website and launch campaign',
  reference: 'PROP-2026-0042',
  issuer: {name: 'Élodie García Studio · Δημήτρης', email: 'studio@example.com', website: 'https://studio.example.com'},
  client: {name: 'Søren Müller · Анна', email: 'client@example.com'},
  summary: 'A considered website and a complete launch campaign for the new collection.',
  items: [
    {description: 'Design and development', quantity: '1', unitPriceUsdCents: '125000'},
    {description: 'Campaign consultation', quantity: '1.5', unitPriceUsdCents: '25000'},
  ],
  deliverables: ['Responsive website with five pages', 'Launch artwork and source files'],
  timeline: 'First review November 20, 2026. Final delivery December 4, 2026.',
  terms: 'Two rounds of revisions included. The project starts after written acceptance.\nFinal source files delivered after payment.',
  totalUsdCents: '162500',
  createdAt: '2026-11-15T15:45:00.000Z',
};

async function inspect(bytes: Uint8Array) {
  const task = getDocument({data: bytes.slice(), useSystemFonts: false});
  const pdf = await task.promise;
  try {
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push({
        text: content.items.filter(item => 'str' in item).map(item => item.str).join(' '),
        items: content.items.filter(item => 'str' in item),
        view: page.view,
      });
    }
    const bodyItems = pages.flatMap(page => page.items.filter(item => item.transform[5] >= 70 && item.transform[5] < 700));
    return {
      pages,
      text: pages.map(page => page.text).join(' '),
      bodyText: bodyItems.map(item => item.str).join(' '),
      // Read one column at a time when verifying wrapped table and party cells.
      descriptionText: bodyItems.filter(item => item.transform[4] < 264).map(item => item.str).join(' '),
      issuerText: bodyItems.filter(item => item.transform[4] < 300).map(item => item.str).join(' '),
    };
  } finally {
    await task.destroy();
  }
}

describe('proposal PDF payload', () => {
  it.each(['proposal', 'invoice'] as const)('leads a %s with the issuer brand and complete multiline contact details', async kind => {
    const issuer = {name: 'Élodie Studio\nDesign & Research', details: 'hello@maya.example\n43 Rue Élodie, Montréal\nTax ID: CA 0012 & <003>'};
    const client = {name: 'Søren Jensen', details: 'soren@example.test\n21 Market Street, København\nAccount reference: 00123'};
    const {pages, text} = await inspect(await buildProposalPdf({...example, kind, issuer, client}));
    for (const page of pages) {
      const header = page.items.filter(item => item.height >= 21 && item.height <= 23).map(item => item.str).join(' ').replace(/\s+/g, ' ');
      expect(header).toBe('Élodie Studio Design & Research');
      const attribution = page.items.find(item => item.str === `Bankeiz · ${kind === 'invoice' ? 'Invoice' : 'Proposal'}`); expect(attribution).toBeDefined(); expect(attribution!.height).toBeLessThan(10); expect(attribution!.transform[5]).toBeLessThan(45);
    }
    for (const line of [...issuer.details.split('\n'), ...client.details.split('\n')]) expect(text).toContain(line);
    expect(text).toContain(kind === 'invoice' ? 'Bill to' : 'Prepared for');
  });

  it('wraps the complete long multiline issuer header and keeps every page item inside the canvas', async () => {
    const name = `${'W'.repeat(75)}\n${'M'.repeat(84)}`, {pages} = await inspect(await buildProposalPdf({...example, issuer: {name}}));
    for (const page of pages) {
      expect(page.items.filter(item => item.height >= 21 && item.height <= 23).map(item => item.str).join('').replace(/\s/g, '')).toBe(name.replace(/\s/g, ''));
      for (const item of page.items) {
        expect(item.transform[4]).toBeGreaterThanOrEqual(35); expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 34);
        expect(item.transform[5]).toBeGreaterThanOrEqual(28); expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 28);
      }
      const headerBottom = Math.min(...page.items.filter(item => item.height >= 21 && item.height <= 23).map(item => item.transform[5]));
      const body = page.items.filter(item => item.height < 21 && item.str.trim() && item.transform[5] < 700 && item.transform[5] >= 70);
      for (const item of body) expect(item.transform[5] + item.height).toBeLessThan(headerBottom);
    }
  });

  it.each(['proposal', 'invoice'] as const)('paginates both complete 1200-character %s contact blocks before the commercial terms', async kind => {
    const issuerDetails = `${Array.from({length: 40}, (_, index) => `Issuer ${String(index).padStart(2, '0')}: contact aaaaaaaaa.`).join('\n')}!`;
    const clientDetails = `${Array.from({length: 40}, (_, index) => `Client ${String(index).padStart(2, '0')}: contact bbbbbbbbb.`).join('\n')}!`; expect(issuerDetails).toHaveLength(1200); expect(clientDetails).toHaveLength(1200);
    const {pages, text} = await inspect(await buildProposalPdf({...example, kind, issuer: {...example.issuer, details: issuerDetails}, client: {...example.client, details: clientDetails}}));
    expect(pages.length).toBeGreaterThan(1);
    for (const line of [...issuerDetails.split('\n'), ...clientDetails.split('\n')]) expect(text).toContain(line);
    for (const value of [example.summary, example.timeline, ...example.terms.split('\n'), ...example.deliverables, '$1,625.00']) expect(text).toContain(value);
    for (const page of pages) for (const item of page.items) {
      expect(item.transform[4]).toBeGreaterThanOrEqual(35); expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 34); expect(item.transform[5]).toBeGreaterThanOrEqual(28); expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 28);
    }
  });

  it.each(['issuer', 'client'] as const)('refuses unavailable PDF glyphs in %s contact details explicitly', async party => {
    await expect(buildProposalPdf({...example, [party]: {...example[party], details: 'Contact: 🦄'}}).then(() => undefined)).rejects.toThrow(/U\+1F984.*supported|supported.*U\+1F984/i);
  });

  it.each(['issuer', 'client'] as const)('refuses malformed or oversized %s contact details before creating the PDF', async party => {
    for (const details of ['a'.repeat(1201), 'bad\u0000contact', 'bad\uffffcontact', 'bad\ud800contact', 42, null]) await expect(buildProposalPdf({...example, [party]: {...example[party], details}}).then(() => undefined)).rejects.toThrow(/details.*1200|1200.*details/i);
  });

  // Dropping a field or replacing Unicode names with an ASCII fallback loses this contract.
  it('makes a standalone, readable proposal with the merchant, client and complete commercial content', async () => {
    const bytes = await buildProposalPdf(example);
    expect(new TextDecoder().decode(bytes.subarray(0, 5))).toBe('%PDF-');
    const {text} = await inspect(bytes);
    for (const expected of [
      'Bankeiz', 'Proposal', example.title, example.reference,
      example.issuer.name, example.issuer.email!, example.issuer.website!, example.client.name, example.client.email!,
      example.summary, 'Design and development', 'Campaign consultation',
      'Quantity', 'Unit price', 'Amount', '$1,250.00', '$250.00', '$375.00', '1.5', 'Total', '$1,625.00', 'USD',
      ...example.deliverables, example.timeline, ...example.terms.split('\n'), 'November 15, 2026',
    ]) expect(text).toContain(expected);
  });

  // Switching to Number or silently rounding fractional cents would corrupt these amounts.
  it('labels an invoice and preserves amounts beyond JavaScript integer precision', async () => {
    const {text} = await inspect(await buildProposalPdf({
      ...example,
      kind: 'invoice',
      reference: 'INV-2026-0043',
      items: [{description: 'Exact decimal quantity', quantity: '0.5', unitPriceUsdCents: '18014398509481986'}],
      totalUsdCents: '9007199254740993',
    }));
    expect(text).toContain('Invoice');
    expect(text).toContain('INV-2026-0043');
    expect(text).toContain('$180,143,985,094,819.86');
    expect(text).toContain('$90,071,992,547,409.93');
    expect(text).not.toContain('Amount paid');
    expect(text).not.toContain('Accepted');
  });

  // A one-page canvas, clipped rows, or an early section limit drops the ending sentinels.
  it('paginates every item, deliverable and long paragraph without drawing outside the page', async () => {
    const items = Array.from({length: 48}, (_, index) => ({
      description: `Line ${index + 1}: detailed design work including discovery, review, refinement, and source delivery. EndItem${index + 1}.`,
      quantity: '1', unitPriceUsdCents: '100',
    }));
    const deliverables = Array.from({length: 30}, (_, index) => `Deliverable ${index + 1}: a complete editable package with all approved work. EndDeliverable${index + 1}.`);
    const terms = `${'The client retains every agreed delivery and the merchant retains responsibility for the work described here. '.repeat(100)}FinalTermsSentinel.`;
    const {pages, bodyText, descriptionText} = await inspect(await buildProposalPdf({...example, items, deliverables, terms, totalUsdCents: '4800'}));
    expect(pages.length).toBeGreaterThan(3);
    const continuous = bodyText.replace(/\s/g, '');
    for (const item of items) expect(descriptionText.replace(/\s/g, '')).toContain(item.description.replace(/\s/g, ''));
    for (const item of deliverables) expect(continuous).toContain(item.replace(/\s/g, ''));
    expect(continuous).toContain(terms.replace(/\s/g, ''));
    for (const [index, page] of pages.entries()) {
      expect(page.text).toContain(`Page ${index + 1} of ${pages.length}`);
      for (const item of page.items) {
        expect(item.transform[4]).toBeGreaterThanOrEqual(35);
        expect(item.transform[4] + item.width).toBeLessThanOrEqual(page.view[2] - 35 + 1);
        expect(item.transform[5]).toBeGreaterThanOrEqual(28);
        expect(item.transform[5] + item.height).toBeLessThanOrEqual(page.view[3] - 28);
      }
    }
  }, 20000);

  // Long unbroken references and merchant names must wrap, not shrink or truncate.
  it('retains long unbroken content and decomposed Unicode in narrow fields', async () => {
    const longReference = `INV-${'abcdefghijklmno'.repeat(20)}`;
    const longName = `Cafe\u0301-${'Merchant'.repeat(30)}`;
    const {text, issuerText} = await inspect(await buildProposalPdf({...example, reference: longReference, issuer: {name: longName}}));
    const continuous = text.normalize('NFC').replace(/\s/g, '');
    expect(continuous).toContain(longReference);
    expect(issuerText.normalize('NFC').replace(/\s/g, '')).toContain(longName.normalize('NFC'));
  });

  // A missing-glyph box would present different terms without warning.
  it('refuses unsupported glyphs with an actionable error instead of changing the content', async () => {
    await expect(buildProposalPdf({...example, client: {name: 'Client 🦄'}})).rejects.toThrow(/U\+1F984.*supported|supported.*U\+1F984/i);
  });

  // An inconsistent declared total or fractional-cent row must never appear as a valid invoice.
  it.each([
    {change: {totalUsdCents: '1'}, error: /total.*line items|line items.*total/i},
    {change: {items: [{description: 'Subcent', quantity: '0.5', unitPriceUsdCents: '1'}], totalUsdCents: '1'}, error: /fractional cent|whole cents/i},
    {change: {createdAt: 'not-a-date'}, error: /date/i},
    {change: {items: [{description: 'Invalid quantity', quantity: 'NaN', unitPriceUsdCents: '1'}]}, error: /quantity/i},
  ])('rejects invalid commercial data before generating a payload: $error', async ({change, error}) => {
    await expect(buildProposalPdf({...example, ...change})).rejects.toThrow(error);
  });
});
